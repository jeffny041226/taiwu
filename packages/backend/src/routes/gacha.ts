import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { pullMultiple } from "@taiwu/shared/lib/gacha-engine";
import { generateVariant } from "@taiwu/shared/lib/cricket-utils";
import { memoryInsert } from "../lib/memory-store";

export const gachaRouter = Router();

gachaRouter.post("/pull", authMiddleware, async (req, res) => {
  const { count } = req.body as { count: 1 | 5 | 10 };
  const uid = req.user!.uid;

  const activeTemplates = CRICKET_TEMPLATES.filter(t => t.isActive);
  const pulled = pullMultiple(activeTemplates, count);

  // Helper: save to memory store with variant stats
  function saveToMemory(): void {
    const records = pulled.map(t => ({ template_id: t.id, image_key: null }));
    const inserted = memoryInsert(uid, records);
    const results = inserted.map(uc => {
      const template = activeTemplates.find(t => t.id === uc.template_id);
      return {
        ...uc,
        template: template ? { ...template, imageKey: `/assets/crickets/cricket-${String(((template.id - 1) % 6) + 1).padStart(3, "0")}.png` } : null,
      };
    });
    res.json({ results, count });
  }

  const sb = getSupabase();
  if (sb) {
    // Ensure user exists in DB (may be missing if registered before Supabase was configured)
    const { data: existingUser } = await sb.from("users").select("uid").eq("uid", uid).limit(1);
    if (!existingUser || existingUser.length === 0) {
      await sb.from("users").upsert({ uid, nick_name: req.user!.nickName, token: uid }, { onConflict: "uid" });
    }

    const inserts = pulled.map(t => {
      const v = generateVariant(t);
      return {
        uid,
        template_id: t.id,
        attack: v.attack,
        defense: v.defense,
        speed: v.speed,
        max_hp: v.maxHp,
        max_stamina: v.maxStamina,
        spirit_base: v.spiritBase,
      };
    });

    const { data, error } = await sb.from("user_crickets").insert(inserts).select("id, template_id, attack, defense, speed, max_hp, max_stamina, spirit_base, obtained_at");
    if (error) {
      // 可能是缺少字段 — 回退到内存存储
      saveToMemory();
      return;
    }

    // Fetch templates from DB to get cloud imageKey URLs
    const templateIds = pulled.map(t => t.id);
    const { data: dbTemplates } = await sb.from("cricket_templates").select("*").in("id", templateIds);

    const results = (data || []).map((uc: any) => {
      const dbTmpl = dbTemplates?.find((t: any) => t.id === uc.template_id);
      return {
        id: uc.id,
        template_id: uc.template_id,
        attack: uc.attack,
        defense: uc.defense,
        speed: uc.speed,
        maxHp: uc.max_hp,
        maxStamina: uc.max_stamina,
        spiritBase: uc.spirit_base,
        obtained_at: uc.obtained_at,
        template: dbTmpl ? {
          id: dbTmpl.id,
          name: dbTmpl.name,
          title: dbTmpl.title,
          tier: dbTmpl.tier,
          attack: dbTmpl.attack,
          defense: dbTmpl.defense,
          speed: dbTmpl.speed,
          hpBase: dbTmpl.hp_base,
          staminaBase: dbTmpl.stamina_base,
          spiritBase: dbTmpl.spirit_base,
          trait: dbTmpl.trait,
          gachaWeight: dbTmpl.gacha_weight,
          isActive: dbTmpl.is_active,
          imageKey: dbTmpl.image_key,
        } : null,
      };
    });

    res.json({ results, count });
  } else {
    saveToMemory();
  }
});