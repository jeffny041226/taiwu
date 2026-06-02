import type { Request, Response, NextFunction } from "express";
import { passportService } from "../services/passport";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; nickName: string; avatar?: string };
    }
  }
}

interface CachedToken {
  uid: string;
  nickName: string;
  avatar?: string;
}

/** 内存 Token 缓存 — 避免每次请求都调用 Passport verifyToken */
class TokenCache {
  private cache = new Map<string, CachedToken & { setAt: number }>();
  private ttlMs = 15 * 60 * 1000; // 15 分钟

  get(token: string): CachedToken | null {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (Date.now() - entry.setAt > this.ttlMs) {
      this.cache.delete(token);
      return null;
    }
    return { uid: entry.uid, nickName: entry.nickName, avatar: entry.avatar };
  }

  set(token: string, info: CachedToken): void {
    this.cache.set(token, { ...info, setAt: Date.now() });
  }
}

export const tokenCache = new TokenCache();

/** 用户封禁状态缓存 (Taiwu-admin 写入 status='banned', 此处读取) */
class BanCache {
  private cache = new Map<string, { banned: boolean; setAt: number }>();
  private ttlMs = 15 * 60 * 1000;

  get(uid: string): boolean | null {
    const entry = this.cache.get(uid);
    if (!entry) return null;
    if (Date.now() - entry.setAt > this.ttlMs) {
      this.cache.delete(uid);
      return null;
    }
    return entry.banned;
  }

  set(uid: string, banned: boolean): void {
    this.cache.set(uid, { banned, setAt: Date.now() });
  }

  invalidate(uid: string): void {
    this.cache.delete(uid);
  }
}

export const banCache = new BanCache();

/** 检查用户是否被封禁 — 查 DB 并缓存 15 分钟 */
async function isUserBanned(uid: string): Promise<boolean> {
  const cached = banCache.get(uid);
  if (cached !== null) return cached;
  try {
    const rows = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    const status = rows[0]?.status ?? "normal";
    const banned = status === "banned";
    banCache.set(uid, banned);
    return banned;
  } catch (err) {
    console.error("[auth] 查询封禁状态失败:", err);
    return false; // 查不到默认放行
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // 检查 Token 缓存 (15 min)
  const cached = tokenCache.get(token);
  if (cached) {
    // 快速 banned 检查 (仅查内存 banCache) — hot path 同步,避免变 async
    const banned = banCache.get(cached.uid);
    if (banned === true) {
      res.status(403).json({ error: "USER_BANNED" });
      return;
    }
    // banCache 未命中 → 异步填充 (不阻塞请求,15min 内会自动 catch)
    if (banned === null) {
      void isUserBanned(cached.uid).catch(() => {});
    }
    req.user = { uid: cached.uid, nickName: cached.nickName, avatar: cached.avatar };
    tokenCache.set(token, cached);
    next();
    return;
  }

  // 异步验证 Passport Token
  passportService.verifyToken(token).then(async verified => {
    if (!verified) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // 检查封禁状态 (cold path 完整检查)
    if (await isUserBanned(verified.uid)) {
      res.status(403).json({ error: "USER_BANNED" });
      return;
    }

    // 获取用户信息用于缓存
    passportService.getTokenInfo(token).then(info => {
      const nickName = info?.nickName || "";
      tokenCache.set(token, { uid: verified.uid, nickName, avatar: info?.avatar });
      req.user = { uid: verified.uid, nickName, avatar: info?.avatar };
      next();
    }).catch(() => {
      tokenCache.set(token, { uid: verified.uid, nickName: "" });
      req.user = { uid: verified.uid, nickName: "" };
      next();
    });
  }).catch(() => {
    res.status(401).json({ error: "Invalid or expired token" });
  });
}