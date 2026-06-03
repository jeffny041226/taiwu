import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { db } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const userRouter = Router();

userRouter.get("/profile", authMiddleware, asyncHandler(async (req, res) => {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.uid, req.user!.uid))
    .limit(1);

  const data = rows[0];
  if (!data) {
    res.json({ uid: req.user!.uid, nickName: req.user!.nickName });
    return;
  }
  res.json({ uid: data.uid, nickName: data.nickName, avatar: data.avatar });
}));

userRouter.get("/stats", authMiddleware, asyncHandler(async (req, res) => {
  const rows = await db
    .select({ wins: users.wins, losses: users.losses })
    .from(users)
    .where(eq(users.uid, req.user!.uid))
    .limit(1);

  const data = rows[0];
  if (!data) {
    res.json({ wins: 0, losses: 0 });
    return;
  }
  // 注: 之前 select 了不存在的 `draws` 列(PostgREST 静默丢字段),这里已修复
  res.json({ wins: data.wins ?? 0, losses: data.losses ?? 0 });
}));
