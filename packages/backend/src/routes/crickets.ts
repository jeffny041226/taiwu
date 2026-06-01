import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db/client";
import { userCrickets, cricketTemplates } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import type { Tier } from "@taiwu/shared/types/cricket";

const TIER_ORDER: Record<Tier, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const cricketsRouter = Router();

cricketsRouter.get("/", authMiddleware, async (req, res) => {
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
      templateAttack: cricketTemplates.attack,
      templateDefense: cricketTemplates.defense,
      templateSpeed: cricketTemplates.speed,
      templateHpBase: cricketTemplates.hpBase,
      templateStaminaBase: cricketTemplates.staminaBase,
      templateSpiritBase: cricketTemplates.spiritBase,
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
        attack: uc.templateAttack,
        defense: uc.templateDefense,
        speed: uc.templateSpeed,
        hpBase: uc.templateHpBase,
        staminaBase: uc.templateStaminaBase,
        spiritBase: uc.templateSpiritBase,
        trait: uc.templateTrait,
        gachaWeight: uc.templateGachaWeight,
        isActive: uc.templateIsActive,
        imageKey: uc.templateImageKey || `/assets/crickets/cricket-${String(((uc.templateIdRef - 1) % 6) + 1).padStart(3, "0")}.png`,
      } : null,
    }));

  res.json({ crickets });
});

cricketsRouter.get("/templates", async (_req, res) => {
  const rows = await db
    .select()
    .from(cricketTemplates)
    .where(eq(cricketTemplates.isActive, true));

  // Map camelCase → camelCase(已是 camelCase,只需保留 imageKey)
  const templates = rows.map(t => ({
    id: t.id,
    name: t.name,
    title: t.title,
    tier: t.tier,
    attack: t.attack,
    defense: t.defense,
    speed: t.speed,
    hpBase: t.hpBase,
    staminaBase: t.staminaBase,
    spiritBase: t.spiritBase,
    trait: t.trait,
    color: t.color,
    emoji: t.emoji,
    gachaWeight: t.gachaWeight,
    isActive: t.isActive,
    imageKey: t.imageKey,
  }));
  res.json({ templates });
});

cricketsRouter.post("/release", authMiddleware, async (req, res) => {
  const { cricketId } = req.body as { cricketId: number };
  const uid = req.user!.uid;

  const result = await db
    .delete(userCrickets)
    .where(and(eq(userCrickets.id, cricketId), eq(userCrickets.uid, uid)));

  res.json({ success: true, affectedRows: result[0]?.affectedRows ?? 0 });
});
