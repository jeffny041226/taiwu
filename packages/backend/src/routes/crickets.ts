import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { memoryGetAll, memoryDelete } from "../lib/memory-store";
import type { Tier } from "@taiwu/shared/types/cricket";

const TIER_ORDER: Record<Tier, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const cricketsRouter = Router();

cricketsRouter.get("/", authMiddleware, async (req, res) => {
  const uid = req.user!.uid;

  function fromMemory(): void {
    const mem = memoryGetAll(uid);
    const crickets = mem
      .sort((a, b) => {
        const tA = CRICKET_TEMPLATES.find(t => t.id === a.template_id);
        const tB = CRICKET_TEMPLATES.find(t => t.id === b.template_id);
        const tierA = TIER_ORDER[(tA?.tier as Tier) || "common"] ?? 0;
        const tierB = TIER_ORDER[(tB?.tier as Tier) || "common"] ?? 0;
        if (tierB !== tierA) return tierB - tierA;
        return new Date(b.obtained_at || 0).getTime() - new Date(a.obtained_at || 0).getTime();
      })
      .map(uc => {
      const template = CRICKET_TEMPLATES.find(t => t.id === uc.template_id);
      return { ...uc, template };
    });
    res.json({ crickets });
  }

  const sb = getSupabase();
  if (!sb) { fromMemory(); return; }

  try {
    const { data, error } = await sb
      .from("user_crickets")
      .select("id, uid, template_id, image_key, attack, defense, speed, max_hp, max_stamina, spirit_base, obtained_at, cricket_templates(*)")
      .eq("uid", req.user!.uid);

    if (error) { console.error("[Crickets] Supabase query error:", error.message); fromMemory(); return; }

    const crickets = (data || [])
      .sort((a: any, b: any) => {
        const tierA = TIER_ORDER[(a.cricket_templates?.tier as Tier) || "common"] ?? 0;
        const tierB = TIER_ORDER[(b.cricket_templates?.tier as Tier) || "common"] ?? 0;
        if (tierB !== tierA) return tierB - tierA;
        return new Date(b.obtained_at).getTime() - new Date(a.obtained_at).getTime();
      })
      .map((uc: any) => ({
      id: uc.id,
      uid: uc.uid,
      template_id: uc.template_id,
      image_key: uc.image_key,
      attack: uc.attack,
      defense: uc.defense,
      speed: uc.speed,
      maxHp: uc.max_hp,
      maxStamina: uc.max_stamina,
      spiritBase: uc.spirit_base,
      obtained_at: uc.obtained_at,
      template: uc.cricket_templates ? {
        id: uc.cricket_templates.id,
        name: uc.cricket_templates.name,
        title: uc.cricket_templates.title,
        tier: uc.cricket_templates.tier,
        attack: uc.cricket_templates.attack,
        defense: uc.cricket_templates.defense,
        speed: uc.cricket_templates.speed,
        hpBase: uc.cricket_templates.hp_base,
        staminaBase: uc.cricket_templates.stamina_base,
        spiritBase: uc.cricket_templates.spirit_base,
        trait: uc.cricket_templates.trait,
        gachaWeight: uc.cricket_templates.gacha_weight,
        isActive: uc.cricket_templates.is_active,
        imageKey: uc.cricket_templates.image_key || `/assets/crickets/cricket-${String(((uc.cricket_templates.id - 1) % 6) + 1).padStart(3, "0")}.png`,
      } : null,
    }));
    res.json({ crickets });
  } catch { fromMemory(); }
});

cricketsRouter.get("/templates", async (_req, res) => {
  const sb = getSupabase();
  if (!sb) {
    // No DB — return from shared hardcoded data + local image paths
    const templates = CRICKET_TEMPLATES.map(t => ({
      ...t,
      imageKey: `/assets/crickets/cricket-${String(((t.id - 1) % 6) + 1).padStart(3, "0")}.png`,
    }));
    res.json({ templates });
    return;
  }
  const { data, error } = await sb.from("cricket_templates").select("*").eq("is_active", true);
  if (error) {
    res.json({ templates: [] });
    return;
  }
  // Map snake_case to camelCase
  const templates = (data || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    title: t.title,
    tier: t.tier,
    attack: t.attack,
    defense: t.defense,
    speed: t.speed,
    hpBase: t.hp_base,
    staminaBase: t.stamina_base,
    spiritBase: t.spirit_base,
    trait: t.trait,
    color: t.color,
    emoji: t.emoji,
    gachaWeight: t.gacha_weight,
    isActive: t.is_active,
    imageKey: t.image_key,
  }));
  res.json({ templates });
});

cricketsRouter.post("/release", authMiddleware, async (req, res) => {
  const { cricketId } = req.body as { cricketId: number };
  const uid = req.user!.uid;
  const sb = getSupabase();
  if (!sb) {
    memoryDelete(uid, cricketId);
    res.json({ success: true });
    return;
  }
  const { error } = await sb.from("user_crickets").delete().eq("id", cricketId).eq("uid", req.user!.uid);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
});