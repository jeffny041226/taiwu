import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getSupabase } from "../db/supabase";
import { JWT_SECRET } from "../config/env";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariant } from "@taiwu/shared/lib/cricket-utils";
import { memoryInsert } from "../lib/memory-store";

export const authRouter = Router();

/** POST /api/auth/register — 用户名+密码注册 */
authRouter.post("/register", async (req, res) => {
  const { username, password, nickName } = req.body as {
    username: string;
    password: string;
    nickName?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "用户名和密码不能为空" });
    return;
  }

  if (username.length > 50) {
    res.status(400).json({ error: "用户名过长（最多50字符）" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "密码至少6位" });
    return;
  }

  const sb = getSupabase();
  if (sb) {
    // Check username uniqueness
    const { data: existing } = await sb.from("users").select("uid").eq("username", username).limit(1);
    if (existing && existing.length > 0) {
      res.status(409).json({ error: "用户名已被占用" });
      return;
    }
  }

  const uid = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = nickName || `玩家${Math.floor(Math.random() * 9000 + 1000)}`;
  const passwordHash = await bcrypt.hash(password, 10);

  if (sb) {
    const { error } = await sb.from("users").insert({
      uid,
      nick_name: name,
      username,
      password_hash: passwordHash,
      token: uid,
      avatar: "/assets/avatars/avatar-default.png",
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  // 新用户赠送 3 只起始蛐蛐（优先写入 Supabase）
  const starterIds = [1, 2, 3];
  if (sb) {
    const inserts = starterIds.map(tid => {
      const template = CRICKET_TEMPLATES.find(t => t.id === tid);
      const v = template ? generateVariant(template) : { attack: 10, defense: 10, speed: 10, maxHp: 100, maxStamina: 100, spiritBase: 100 };
      return { uid, template_id: tid, attack: v.attack, defense: v.defense, speed: v.speed, max_hp: v.maxHp, max_stamina: v.maxStamina, spirit_base: v.spiritBase };
    });
    const { error } = await sb.from("user_crickets").insert(inserts).select();
    if (error) console.error("[Auth] 插入起始蛐蛐失败:", error.message);
  }
  const starterRecords = starterIds.map(id => ({ template_id: id, image_key: null }));
  memoryInsert(uid, starterRecords);

  const token = jwt.sign({ uid, nickName: name, username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, uid, nickName: name });
});

/** POST /api/auth/guest — 游客快速注册 */
authRouter.post("/guest", async (req, res) => {
  const { nickName } = req.body as { nickName?: string };
  const uid = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = nickName || `玩家${Math.floor(Math.random() * 9000 + 1000)}`;

  console.log("[Auth] 游客注册: uid=" + uid + ", sb=" + (!!getSupabase()));
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("users").insert({
      uid,
      nick_name: name,
      username: null,
      password_hash: null,
      token: uid,
      avatar: "/assets/avatars/avatar-default.png",
    });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  // 新用户赠送 3 只起始蛐蛐（优先写入 Supabase）
  const starterIds = [1, 2, 3];
  if (sb) {
    const inserts = starterIds.map(tid => {
      const template = CRICKET_TEMPLATES.find(t => t.id === tid);
      const v = template ? generateVariant(template) : { attack: 10, defense: 10, speed: 10, maxHp: 100, maxStamina: 100, spiritBase: 100 };
      return { uid, template_id: tid, attack: v.attack, defense: v.defense, speed: v.speed, max_hp: v.maxHp, max_stamina: v.maxStamina, spirit_base: v.spiritBase };
    });
    const { error } = await sb.from("user_crickets").insert(inserts).select();
    if (error) console.error("[Auth] 插入起始蛐蛐失败:", error.message);
  }
  // 同步写入内存存储
  const starterRecords = starterIds.map(id => ({ template_id: id, image_key: null }));
  memoryInsert(uid, starterRecords);

  const token = jwt.sign({ uid, nickName: name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, uid, nickName: name });
});

/** POST /api/auth/login — 用户名+密码登录 */
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "用户名和密码不能为空" });
    return;
  }

  const sb = getSupabase();
  if (!sb) {
    // No DB — cannot verify credentials
    res.status(503).json({ error: "服务暂不可用（数据库未配置）" });
    return;
  }

  const { data: user } = await sb.from("users").select("*").eq("username", username).single();
  if (!user || !user.password_hash) {
    res.status(401).json({ error: "用户名或密码错误" });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    res.status(401).json({ error: "用户名或密码错误" });
    return;
  }

  const token = jwt.sign({ uid: user.uid, nickName: user.nick_name, username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, uid: user.uid, nickName: user.nick_name });
});

/** POST /api/auth/login-token — JWT token 登录 */
authRouter.post("/login-token", async (req, res) => {
  const { token } = req.body as { token: string };

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; nickName: string; username?: string };
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.from("users").select("*").eq("uid", decoded.uid).single();
      if (!data) {
        res.json({ uid: decoded.uid, nickName: decoded.nickName, username: decoded.username });
        return;
      }
      res.json({ uid: data.uid, nickName: data.nick_name, username: data.username || undefined });
    } else {
      res.json({ uid: decoded.uid, nickName: decoded.nickName, username: decoded.username });
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});