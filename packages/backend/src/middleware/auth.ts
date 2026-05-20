import type { Request, Response, NextFunction } from "express";
import { passportService } from "../services/passport";

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; nickName: string };
    }
  }
}

interface CachedToken {
  uid: string;
  nickName: string;
}

/** 内存 Token 缓存 — 避免每次请求都调用 Passport verifyToken */
class TokenCache {
  private cache = new Map<string, CachedToken & { setAt: number }>();
  private ttlMs = 5 * 60 * 1000; // 5 分钟

  get(token: string): CachedToken | null {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (Date.now() - entry.setAt > this.ttlMs) {
      this.cache.delete(token);
      return null;
    }
    return { uid: entry.uid, nickName: entry.nickName };
  }

  set(token: string, info: CachedToken): void {
    this.cache.set(token, { ...info, setAt: Date.now() });
  }
}

export const tokenCache = new TokenCache();

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  // 万能验证码产生的本地 token
  if (token.startsWith("local-")) {
    const cached = tokenCache.get(token);
    if (cached) {
      req.user = { uid: cached.uid, nickName: cached.nickName };
      next();
      return;
    }
  }

  // 检查缓存
  const cached = tokenCache.get(token);
  if (cached) {
    req.user = { uid: cached.uid, nickName: cached.nickName };
    // 刷新 TTL
    tokenCache.set(token, cached);
    next();
    return;
  }

  // 异步验证 Passport Token
  passportService.verifyToken(token).then(verified => {
    if (!verified) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // 获取用户信息用于缓存
    passportService.getTokenInfo(token).then(info => {
      const nickName = info?.nickName || "";
      tokenCache.set(token, { uid: verified.uid, nickName });
      req.user = { uid: verified.uid, nickName };
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