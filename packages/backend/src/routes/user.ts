import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";

export const userRouter = Router();

userRouter.get("/profile", authMiddleware, async (req, res) => {
  const sb = getSupabase();
  if (!sb) {
    res.json({ uid: req.user!.uid, nickName: req.user!.nickName });
    return;
  }
  const { data, error } = await sb.from("users").select("*").eq("uid", req.user!.uid).single();
  if (error || !data) {
    res.json({ uid: req.user!.uid, nickName: req.user!.nickName });
    return;
  }
  res.json({ uid: data.uid, nickName: data.nick_name, avatar: data.avatar });
});

userRouter.get("/stats", authMiddleware, async (req, res) => {
  const sb = getSupabase();
  if (!sb) {
    res.json({ wins: 0, losses: 0, draws: 0 });
    return;
  }
  const { data, error } = await sb.from("users").select("wins, losses, draws").eq("uid", req.user!.uid).single();
  if (error || !data) {
    res.json({ wins: 0, losses: 0, draws: 0 });
    return;
  }
  res.json({ wins: data.wins ?? 0, losses: data.losses ?? 0, draws: data.draws ?? 0 });
});