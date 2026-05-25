import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariant } from "@taiwu/shared/lib/cricket-utils";
import { ROOM_CODE_CHARSET } from "@taiwu/shared/config/game";
import {
  memoryCreateRedeemCode,
  memoryGetRedeemCode,
  memoryUseRedeemCode,
  memoryInsert,
} from "../lib/memory-store";
import crypto from "crypto";

export const redeemRouter = Router();

/** 生成一个兑换码，格式 TW-XXXX-XXXX-XXXX */
function generateCode(): string {
  const chars = ROOM_CODE_CHARSET;
  const segments = 3;
  const segmentLen = 4;
  const bytesNeeded = segments * segmentLen;
  const randomBytes = crypto.randomBytes(bytesNeeded);

  const parts: string[] = [];
  for (let s = 0; s < segments; s++) {
    let part = "";
    for (let i = 0; i < segmentLen; i++) {
      const idx = randomBytes[s * segmentLen + i] % chars.length;
      part += chars[idx];
    }
    parts.push(part);
  }

  return `TW-${parts.join("-")}`;
}

/**
 * POST /api/redeem/generate
 * Body: { templateId: number }
 * 生成一个可用的兑换码并入库
 */
redeemRouter.post("/generate", authMiddleware, async (req, res) => {
  const { templateId } = req.body as { templateId: number };

  const template = CRICKET_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    res.status(400).json({ error: "无效的蛐蛐模板ID" });
    return;
  }

  const sb = getSupabase();

  if (sb) {
    // Supabase 路径 — 重试处理唯一约束冲突
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await sb
        .from("redeem_codes")
        .insert({ code, template_id: templateId })
        .select("id, code, template_id, is_used, created_at")
        .single();

      if (!error && data) {
        res.json({ code: data.code, template });
        return;
      }

      // 唯一约束冲突则重试
      if (error && error.message?.includes("duplicate")) {
        continue;
      }

      // 其他 Supabase 错误 — 回退到内存
      console.warn("[redeem] Supabase generate 失败，回退到内存:", error.message);
      break;
    }

    // Supabase 路径失败 → 回退到内存
    if (!res.headersSent) {
      const code = generateCode();
      const record = memoryCreateRedeemCode(code, templateId);
      res.json({ code: record.code, template });
    }
    return;
  }

  // Memory 路径
  const code = generateCode();
  const record = memoryCreateRedeemCode(code, templateId);
  res.json({ code: record.code, template });
});

/**
 * POST /api/redeem/preview
 * Body: { code: string }
 * 预览兑换码对应的蛐蛐，不消耗
 */
redeemRouter.post("/preview", authMiddleware, async (req, res) => {
  const { code } = req.body as { code: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "请输入兑换码" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("redeem_codes")
      .select("id, code, template_id, is_used")
      .eq("code", normalizedCode)
      .single();

    if (error) {
      // PGRST116 = .single() 未匹配 → 兑换码不存在
      if (error.code === "PGRST116") {
        res.status(404).json({ error: "兑换码不存在" });
        return;
      }
      // 其他错误（如表不存在） — 回退到内存
      console.warn("[redeem] Supabase preview 失败，回退到内存:", error.message);
    } else if (data) {
      const template = CRICKET_TEMPLATES.find(t => t.id === data.template_id);
      if (!template) {
        res.status(404).json({ error: "蛐蛐模板已失效" });
        return;
      }
      res.json({ template, is_used: data.is_used });
      return;
    } else {
      res.status(404).json({ error: "兑换码不存在" });
      return;
    }
  }

  // Memory 路径
  const record = memoryGetRedeemCode(normalizedCode);
  if (!record) {
    res.status(404).json({ error: "兑换码不存在" });
    return;
  }

  const template = CRICKET_TEMPLATES.find(t => t.id === record.template_id);
  if (!template) {
    res.status(404).json({ error: "蛐蛐模板已失效" });
    return;
  }

  res.json({ template, is_used: record.is_used });
});

/**
 * POST /api/redeem/use
 * Body: { code: string }
 * 使用兑换码，兑换蛐蛐
 */
redeemRouter.post("/use", authMiddleware, async (req, res) => {
  const { code } = req.body as { code: string };
  const uid = req.user!.uid;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "请输入兑换码" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const sb = getSupabase();
  if (sb) {
    // 原子更新 — 仅当未被使用时
    const { data: updated, error: updateError } = await sb
      .from("redeem_codes")
      .update({ is_used: true, used_by: uid, used_at: new Date().toISOString() })
      .eq("code", normalizedCode)
      .eq("is_used", false)
      .select("id, template_id, is_used")
      .single();

    if (updateError) {
      // PGRST116 = .single() 未匹配到行（代码不存在或已使用）
      if (updateError.code === "PGRST116") {
        const { data: existing } = await sb
          .from("redeem_codes")
          .select("is_used")
          .eq("code", normalizedCode)
          .maybeSingle();

        if (!existing) {
          res.status(404).json({ error: "兑换码不存在" });
        } else {
          res.status(400).json({ error: "该兑换码已被使用" });
        }
        return;
      }
      // 其他错误（如表不存在） — 回退到内存
      console.warn("[redeem] Supabase use 失败，回退到内存:", updateError.message);
    } else if (updated) {
      const template = CRICKET_TEMPLATES.find(t => t.id === updated.template_id);
      if (!template) {
        res.status(404).json({ error: "蛐蛐模板已失效" });
        return;
      }

      // 创建 UserCricket（与 gacha pull 一致）
      const variant = generateVariant(template);

      // 确保用户存在
      const { data: existingUser } = await sb.from("users").select("uid").eq("uid", uid).limit(1);
      if (!existingUser || existingUser.length === 0) {
        await sb.from("users").upsert({ uid, nick_name: req.user!.nickName, token: uid }, { onConflict: "uid" });
      }

      const { data: inserted, error: insertError } = await sb
        .from("user_crickets")
        .insert({
          uid,
          template_id: template.id,
          attack: variant.attack,
          defense: variant.defense,
          speed: variant.speed,
          max_hp: variant.maxHp,
          max_stamina: variant.maxStamina,
          spirit_base: variant.spiritBase,
        })
        .select("id, template_id, attack, defense, speed, max_hp, max_stamina, spirit_base, obtained_at")
        .single();

      if (insertError || !inserted) {
        res.status(500).json({ error: "兑换失败，请稍后重试" });
        return;
      }

      res.json({
        result: {
          id: inserted.id,
          template_id: inserted.template_id,
          attack: inserted.attack,
          defense: inserted.defense,
          speed: inserted.speed,
          maxHp: inserted.max_hp,
          maxStamina: inserted.max_stamina,
          spiritBase: inserted.spirit_base,
          obtained_at: inserted.obtained_at,
          template: {
            id: template.id,
            name: template.name,
            title: template.title,
            tier: template.tier,
            attack: template.attack,
            defense: template.defense,
            speed: template.speed,
            hpBase: template.hpBase,
            staminaBase: template.staminaBase,
            spiritBase: template.spiritBase,
            trait: template.trait,
            gachaWeight: template.gachaWeight,
            isActive: template.isActive,
            imageKey: template.imageKey || null,
          },
        },
      });
      return;
    } else {
      // updated 为 null 且无 error → 代码不存在或已被使用
      const { data: existing } = await sb
        .from("redeem_codes")
        .select("is_used")
        .eq("code", normalizedCode)
        .single();

      if (!existing) {
        res.status(404).json({ error: "兑换码不存在" });
      } else {
        res.status(400).json({ error: "该兑换码已被使用" });
      }
      return;
    }
  }

  // Memory 路径
  const record = memoryUseRedeemCode(normalizedCode, uid);
  if (!record) {
    // 检查是否存在但已使用
    const existing = memoryGetRedeemCode(normalizedCode);
    if (!existing) {
      res.status(404).json({ error: "兑换码不存在" });
    } else {
      res.status(400).json({ error: "该兑换码已被使用" });
    }
    return;
  }

  const template = CRICKET_TEMPLATES.find(t => t.id === record.template_id);
  if (!template) {
    res.status(404).json({ error: "蛐蛐模板已失效" });
    return;
  }

  const inserted = memoryInsert(uid, [{ template_id: template.id, image_key: null }]);
  const result = inserted[0];

  res.json({
    result: {
      ...result,
      template: {
        ...template,
        imageKey: `/assets/crickets/cricket-${String(((template.id - 1) % 6) + 1).padStart(3, "0")}.png`,
      },
    },
  });
});
