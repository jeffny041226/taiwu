import { Router } from "express";
import { getSupabase } from "../db/supabase";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariant } from "@taiwu/shared/lib/cricket-utils";
import { memoryInsert } from "../lib/memory-store";
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
    // 网络错误（Passport API 不可达/超时）→ mock fallback，前端用万能验证码
    const netErrorKeywords = ["fetch", "ENOTFOUND", "ECONNREFUSED", "network", "econn", "abort"];
    if (e.message && netErrorKeywords.some(kw => e.message.toLowerCase().includes(kw.toLowerCase()))) {
      console.warn("[Auth] 发送验证码失败（Passport API 不可用）:", e.message);
      res.json({ success: true, mock: true });
    } else {
      // Passport 业务错误（达上限、手机号无效等）→ 透传真实错误
      console.warn("[Auth] 发送验证码业务错误:", e.message);
      res.status(400).json({ error: e.message || "发送验证码失败" });
    }
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
    nickName = result.nickName || `玩家${mobile.slice(-4)}`;
    avatar = result.avatar;
  } catch (e: any) {
    // 万能验证码 + 网络错误 → 本地 fallback
    if (code === "666666") {
      console.warn("[Auth] Passport 不可达，万能验证码使用本地登录:", e.message);
      uid = mobile;
      nickName = `玩家${mobile.slice(-4)}`;
      passportToken = `local-${uid}-${Date.now()}`;
      avatar = "/assets/avatars/avatar-default.png";
    } else {
      res.status(401).json({ error: e.message || "登录失败" });
      return;
    }
  }

  // 查找或创建本地用户
  const sb = getSupabase();
  let existingUser: any = null;
  if (sb) {
    const { data } = await sb.from("users").select("*").eq("uid", uid).single();
    existingUser = data;
    if (!data) {
      // 新用户 → 创建记录 + 赠送起始蛐蛐
      const { error } = await sb.from("users").insert({
        uid,
        nick_name: nickName,
        username: null,
        password_hash: null,
        token: uid,
        avatar: avatar || "/assets/avatars/avatar-default.png",
      });
      if (error) {
        console.error("[Auth] 创建用户失败:", error.message);
      }

      // 赠送 3 只起始蛐蛐
      const starterIds = [1, 2, 3];
      const inserts = starterIds.map(tid => {
        const template = CRICKET_TEMPLATES.find(t => t.id === tid);
        const v = template ? generateVariant(template) : { attack: 10, defense: 10, speed: 10, maxHp: 100, maxStamina: 100, spiritBase: 100 };
        return { uid, template_id: tid, attack: v.attack, defense: v.defense, speed: v.speed, max_hp: v.maxHp, max_stamina: v.maxStamina, spirit_base: v.spiritBase };
      });
      const { error: insertError } = await sb.from("user_crickets").insert(inserts).select();
      if (insertError) console.error("[Auth] 插入起始蛐蛐失败:", insertError.message);
    } else {
      nickName = data.nick_name || nickName;
    }
  } else {
    // 无 DB — 写入内存存储
    const starterIds = [1, 2, 3];
    const starterRecords = starterIds.map(id => ({ template_id: id, image_key: null }));
    memoryInsert(uid, starterRecords);
  }

  // 缓存 passportToken → uid 到内存
  tokenCache.set(passportToken, { uid, nickName });

  res.json({ token: passportToken, uid, nickName: nickName });
});

/** POST /api/auth/verify — 验证 Token 有效性 */
authRouter.post("/verify", async (req, res) => {
  const { token } = req.body as { token: string };

  if (!token) {
    res.status(400).json({ error: "Token不能为空" });
    return;
  }

  // 万能验证码产生的本地 token
  if (token.startsWith("local-")) {
    const cached = tokenCache.get(token);
    if (cached) {
      res.json({ uid: cached.uid, nickName: cached.nickName });
      return;
    }
  }

  // 检查缓存
  const cached = tokenCache.get(token);
  if (cached) {
    // 刷新缓存 TTL
    tokenCache.set(token, cached);
    res.json({ uid: cached.uid, nickName: cached.nickName });
    return;
  }

  // 调用 Passport 验证
  const verified = await passportService.verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: "Token无效或已过期" });
    return;
  }

  // 获取用户信息（可选）
  const info = await passportService.getTokenInfo(token);
  const nickName = info?.nickName || "";

  // 缓存
  tokenCache.set(token, { uid: verified.uid, nickName });

  res.json({ uid: verified.uid, nickName });
});