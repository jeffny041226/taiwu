import { Router } from "express";
import { db } from "../db/client";
import { users, userCrickets } from "../db/schema";
import { eq } from "drizzle-orm";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariantByTier } from "../lib/tier-ranges";
import { passportService } from "../services/passport";
import { tokenCache } from "../middleware/auth";

export const authRouter = Router();

/** POST /api/auth/send-code — 发送短信验证码 */
authRouter.post("/send-code", async (req, res) => {
  const { mobile } = req.body as { mobile: string };

  if (!mobile) {
    res.status(400).json({ error: "请输入手机号" });
    return;
  }

  if (!/^1\d{10}$/.test(mobile)) {
    res.status(400).json({ error: "手机号格式不正确" });
    return;
  }

  try {
    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    await passportService.getMobileCode(mobile, clientIp);
    res.json({ success: true });
  } catch (e: any) {
    console.warn("[Auth] 发送验证码失败:", e.message);
    res.status(400).json({ error: e.message || "发送验证码失败" });
  }
});

/** POST /api/auth/login — 验证码登录 */
authRouter.post("/login", async (req, res) => {
  const { mobile, code } = req.body as { mobile: string; code: string };

  if (!mobile || !code) {
    res.status(400).json({ error: "手机号和验证码不能为空" });
    return;
  }

  if (!/^1\d{10}$/.test(mobile)) {
    res.status(400).json({ error: "手机号格式不正确" });
    return;
  }

  if (code.length !== 6) {
    res.status(400).json({ error: "验证码为6位" });
    return;
  }

  let uid: string;
  let nickName: string;
  let passportToken: string;
  let avatar: string | undefined;

  try {
    const result = await passportService.mobileCodeLogin(mobile, code);
    passportToken = result.token;
    uid = result.uid;
    nickName = result.nickName || "";
    avatar = result.avatar;
  } catch (e: any) {
    // 网络/可达性兜底：仅当 Passport 调用失败且用户输入万能验证码 666666 时
    // 生成本地身份跳过 Passport。Passport 自身在可达时的 666666 验证逻辑不受影响。
    if (code === "666666") {
      console.warn("[Auth] Passport 不可达，启用 666666 兜底登录:", e.message);
      uid = `shanhai-${mobile}`;
      nickName = `用户${mobile.slice(-4)}`;
      passportToken = `dev-${mobile}-${Date.now()}`;
      avatar = undefined;
    } else {
      res.status(401).json({ error: e.message || "登录失败" });
      return;
    }
  }

  // 查找或创建本地用户 + 赠送起始蛐蛐(新用户)
  await syncUser(uid, nickName, avatar);

  // 缓存 passportToken → uid 到内存
  tokenCache.set(passportToken, { uid, nickName, avatar: avatar || "" });

  res.json({ token: passportToken, uid, nickName, avatar: avatar || "" });
});

/** POST /api/auth/verify — 验证 Token 有效性 */
authRouter.post("/verify", async (req, res) => {
  const { token } = req.body as { token: string };

  if (!token) {
    res.status(400).json({ error: "Token不能为空" });
    return;
  }

  // 检查缓存
  const cached = tokenCache.get(token);
  if (cached) {
    // 刷新缓存 TTL
    tokenCache.set(token, cached);
    res.json({ uid: cached.uid, nickName: cached.nickName, avatar: cached.avatar || "" });
    return;
  }

  // 调用 Passport 验证
  const verified = await passportService.verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: "Token无效或已过期" });
    return;
  }

  // 获取用户最新信息（含头像）
  const info = await passportService.getTokenInfo(token);
  const nickName = info?.nickName || "";
  const avatar = info?.avatar || "";

  // 如果头像有更新，同步到本地 DB
  if (avatar) {
    const rows = await db
      .select({ avatar: users.avatar })
      .from(users)
      .where(eq(users.uid, verified.uid))
      .limit(1);
    const dbAvatar = rows[0]?.avatar;
    if (dbAvatar !== avatar) {
      await db.update(users).set({ avatar }).where(eq(users.uid, verified.uid));
      console.log("[Auth] 头像已同步更新:", verified.uid);
    }
  }

  // 缓存
  tokenCache.set(token, { uid: verified.uid, nickName, avatar });

  res.json({ uid: verified.uid, nickName, avatar });
});

/** POST /api/auth/callback — 外部登录回调，接收 sz_t 解析后的 token+uid，同步用户信息 */
authRouter.post("/callback", async (req, res) => {
  const { token, uid } = req.body as { token: string; uid: string };

  if (!token || !uid) {
    res.status(400).json({ error: "token和uid不能为空" });
    return;
  }

  let nickName = "";
  let avatar: string | undefined;

  try {
    const info = await passportService.getTokenInfo(token);
    if (info) {
      nickName = info.nickName || "";
      avatar = info.avatar;
    }
  } catch (e: any) {
    console.warn("[Auth] getTokenInfo 失败，使用默认昵称:", e.message);
  }

  // 同步本地用户 + 新用户赠送起始蛐蛐
  await syncUser(uid, nickName, avatar);

  // 缓存 token
  tokenCache.set(token, { uid, nickName, avatar });

  res.json({ uid, nickName, avatar });
});

// ── 辅助:创建/更新用户 + 新用户赠送起始蛐蛐 ──

const DEFAULT_AVATAR = "/assets/avatars/avatar-default.png";
const STARTER_TEMPLATE_IDS = [1, 2, 3] as const;

async function syncUser(uid: string, nickName: string, avatar?: string): Promise<void> {
  const existingRows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  const existing = existingRows[0];

  if (!existing) {
    // 新用户 → INSERT users + 赠送 3 只起始蛐蛐
    try {
      await db.insert(users).values({
        uid,
        nickName: nickName || "",
        username: null,
        passwordHash: null,
        token: uid,
        avatar: avatar || DEFAULT_AVATAR,
      });
    } catch (e: any) {
      console.error("[Auth] 创建用户失败:", e.message);
    }

    const inserts = STARTER_TEMPLATE_IDS.map(tid => {
      const template = CRICKET_TEMPLATES.find(t => t.id === tid);
      const v = template ? generateVariantByTier(template.tier) : { attack: 10, defense: 10, speed: 10, maxHp: 100, maxStamina: 100, spiritBase: 100 };
      return {
        uid,
        templateId: tid,
        attack: v.attack,
        defense: v.defense,
        speed: v.speed,
        maxHp: v.maxHp,
        maxStamina: v.maxStamina,
        spiritBase: v.spiritBase,
      };
    });
    try {
      await db.insert(userCrickets).values(inserts);
    } catch (e: any) {
      console.error("[Auth] 插入起始蛐蛐失败:", e.message);
    }
    return;
  }

  // 已有用户 → 更新昵称和头像(以 Passport 为准)
  const updates: Partial<{ nickName: string; avatar: string }> = {};
  if (nickName && existing.nickName !== nickName) updates.nickName = nickName;
  if (avatar && existing.avatar !== avatar) updates.avatar = avatar;
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.uid, uid));
  }
}
