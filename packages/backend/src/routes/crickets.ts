import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db/client";
import { userCrickets, cricketTemplates } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { Tier } from "@taiwu/shared/types/cricket";
import { getAllTierRanges } from "../lib/tier-ranges";

const TIER_ORDER: Record<Tier, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const cricketsRouter = Router();

/**
 * GET /api/crickets — 当前用户的所有蛐蛐
 * 按级别降序 + 获得时间降序
 */
cricketsRouter.get("/", authMiddleware, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const uid = req.user!.uid;

  const rows = await db
    .select({
      id: userCrickets.id,
      uid: userCrickets.uid,
      templateId: userCrickets.templateId,
      imageKey: userCrickets.imageKey,
      attack: userCrickets.attack,
      defense: userCrickets.defense,
      speed: userCrickets.speed,
      maxHp: userCrickets.maxHp,
      maxStamina: userCrickets.maxStamina,
      spiritBase: userCrickets.spiritBase,
      obtainedAt: userCrickets.obtainedAt,
      templateIdRef: cricketTemplates.id,
      templateName: cricketTemplates.name,
      templateTitle: cricketTemplates.title,
      templateTier: cricketTemplates.tier,
      templateTrait: cricketTemplates.trait,
      templateGachaWeight: cricketTemplates.gachaWeight,
      templateIsActive: cricketTemplates.isActive,
      templateImageKey: cricketTemplates.imageKey,
    })
    .from(userCrickets)
    .leftJoin(cricketTemplates, eq(userCrickets.templateId, cricketTemplates.id))
    .where(eq(userCrickets.uid, uid));

  const crickets = rows
    .sort((a, b) => {
      const tierA = TIER_ORDER[(a.templateTier as Tier) || "common"] ?? 0;
      const tierB = TIER_ORDER[(b.templateTier as Tier) || "common"] ?? 0;
      if (tierB !== tierA) return tierB - tierA;
      return new Date(b.obtainedAt || 0).getTime() - new Date(a.obtainedAt || 0).getTime();
    })
    .map(uc => ({
      id: uc.id,
      uid: uc.uid,
      template_id: uc.templateId,
      image_key: uc.imageKey,
      attack: uc.attack,
      defense: uc.defense,
      speed: uc.speed,
      maxHp: uc.maxHp,
      maxStamina: uc.maxStamina,
      spiritBase: uc.spiritBase,
      obtained_at: uc.obtainedAt,
      template: uc.templateIdRef != null ? {
        id: uc.templateIdRef,
        name: uc.templateName,
        title: uc.templateTitle,
        tier: uc.templateTier,
        trait: uc.templateTrait,
        gachaWeight: uc.templateGachaWeight,
        isActive: uc.templateIsActive,
        imageKey: uc.templateImageKey || `/assets/crickets/cricket-${String(((uc.templateIdRef - 1) % 6) + 1).padStart(3, "0")}.png`,
      } : null,
    }));

  res.json({ crickets });
});

/**
 * GET /api/crickets/templates — 所有激活的蛐蛐模板 (元数据,不含个体属性)
 */
cricketsRouter.get("/templates", async (_req, res) => {
  const rows = await db
    .select()
    .from(cricketTemplates)
    .where(eq(cricketTemplates.isActive, true));

  const templates = rows.map(t => ({
    id: t.id,
    name: t.name,
    title: t.title,
    tier: t.tier,
    trait: t.trait,
    color: t.color,
    emoji: t.emoji,
    gachaWeight: t.gachaWeight,
    isActive: t.isActive,
    imageKey: t.imageKey,
  }));
  res.json({ templates });
});

/**
 * GET /api/crickets/tier-ranges — 4 个级别的 6 个属性区间
 * 给前端 handbook / 展示用。返回结构: { common: { attack: [8,13], ... }, ... }
 */
cricketsRouter.get("/tier-ranges", async (_req, res) => {
  res.json({ ranges: getAllTierRanges() });
});

/** POST /api/crickets/release — 放生一只蛐蛐 */
cricketsRouter.post("/release", authMiddleware, async (req, res) => {
  const { cricketId } = req.body as { cricketId: number };
  const uid = req.user!.uid;

  const result = await db
    .delete(userCrickets)
    .where(and(eq(userCrickets.id, cricketId), eq(userCrickets.uid, uid)));

  res.json({ success: true, affectedRows: result[0]?.affectedRows ?? 0 });
});
