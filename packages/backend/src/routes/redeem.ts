import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { db } from "../db/client";
import { redeemCodes, users, userCrickets } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariantByTier } from "../lib/tier-ranges";
import { ROOM_CODE_CHARSET } from "@taiwu/shared/config/game";
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
redeemRouter.post("/generate", authMiddleware, asyncHandler(async (req, res) => {
  const { templateId } = req.body as { templateId: number };

  const template = CRICKET_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    res.status(400).json({ error: "无效的蛐蛐模板ID" });
    return;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      await db.insert(redeemCodes).values({ code, templateId });
      res.json({ code, template });
      return;
    } catch (e: any) {
      // MySQL 唯一约束冲突 → 重试
      if (e?.cause?.code === "ER_DUP_ENTRY") continue;
      console.error("[redeem] generate 失败:", e?.message);
      res.status(500).json({ error: "生成失败,请稍后重试" });
      return;
    }
  }

  res.status(500).json({ error: "生成失败(冲突次数过多),请稍后重试" });
}));

/**
 * POST /api/redeem/preview
 * Body: { code: string }
 * 预览兑换码对应的蛐蛐，不消耗
 */
redeemRouter.post("/preview", authMiddleware, asyncHandler(async (req, res) => {
  const { code } = req.body as { code: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "请输入兑换码" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const rows = await db
      .select({
        id: redeemCodes.id,
        code: redeemCodes.code,
        templateId: redeemCodes.templateId,
        isUsed: redeemCodes.isUsed,
      })
      .from(redeemCodes)
      .where(eq(redeemCodes.code, normalizedCode))
      .limit(1);

    const data = rows[0];
    if (!data) {
      res.status(404).json({ error: "兑换码不存在" });
      return;
    }

    const template = CRICKET_TEMPLATES.find(t => t.id === data.templateId);
    if (!template) {
      res.status(404).json({ error: "蛐蛐模板已失效" });
      return;
    }
    res.json({ template, is_used: data.isUsed });
  } catch (e: any) {
    console.error("[redeem] preview 失败:", e?.message);
    res.status(500).json({ error: "查询失败,请稍后重试" });
  }
}));

/**
 * POST /api/redeem/use
 * Body: { code: string }
 * 使用兑换码，兑换蛐蛐
 */
redeemRouter.use("/use", authMiddleware);
redeemRouter.post("/use", asyncHandler(async (req, res) => {
  const { code } = req.body as { code: string };
  const uid = req.user!.uid;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "请输入兑换码" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  // 原子更新: 仅当 is_used=false AND status='active' AND (expiry_at IS NULL OR expiry_at > NOW()) 时才标记
  // Drizzle MySQL 不支持 RETURNING,所以用 affectedRows 判断是否命中
  const updateResult = await db
    .update(redeemCodes)
    .set({
      isUsed: true,
      usedBy: uid,
      usedAt: new Date(),
    })
    .where(and(
      eq(redeemCodes.code, normalizedCode),
      eq(redeemCodes.isUsed, false),
      eq(redeemCodes.status, "active"),
    ));

  const affected = updateResult[0]?.affectedRows ?? 0;
  if (affected === 0) {
    // 没命中 — 区分"不存在" / "已用过" / "已禁用" / "已过期"
    const checkRows = await db
      .select({
        isUsed: redeemCodes.isUsed,
        status: redeemCodes.status,
        expiryAt: redeemCodes.expiryAt,
      })
      .from(redeemCodes)
      .where(eq(redeemCodes.code, normalizedCode))
      .limit(1);
    if (!checkRows[0]) {
      res.status(404).json({ error: "兑换码不存在" });
    } else if (checkRows[0].status === "disabled") {
      res.status(400).json({ error: "该兑换码已被禁用" });
    } else if (checkRows[0].expiryAt && checkRows[0].expiryAt < new Date()) {
      res.status(400).json({ error: "该兑换码已过期" });
    } else {
      res.status(400).json({ error: "该兑换码已被使用" });
    }
    return;
  }

  // 命中 — 拿 template_id
  const updatedRows = await db
    .select({ templateId: redeemCodes.templateId })
    .from(redeemCodes)
    .where(eq(redeemCodes.code, normalizedCode))
    .limit(1);
  const templateId = updatedRows[0]?.templateId;
  if (!templateId) {
    res.status(500).json({ error: "兑换失败,请稍后重试" });
    return;
  }

  const template = CRICKET_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    res.status(404).json({ error: "蛐蛐模板已失效" });
    return;
  }

  // 确保用户存在
  await db.insert(users)
    .values({ uid, nickName: req.user!.nickName, token: uid })
    .onDuplicateKeyUpdate({ set: { nickName: req.user!.nickName } });

  // 创建 user_cricket
  const variant = generateVariantByTier(template.tier);
  const [inserted] = await db.insert(userCrickets).values({
    uid,
    templateId: template.id,
    attack: variant.attack,
    defense: variant.defense,
    speed: variant.speed,
    maxHp: variant.maxHp,
    maxStamina: variant.maxStamina,
    spiritBase: variant.spiritBase,
  }).$returningId();

  res.json({
    result: {
      id: inserted.id,
      template_id: template.id,
      attack: variant.attack,
      defense: variant.defense,
      speed: variant.speed,
      maxHp: variant.maxHp,
      maxStamina: variant.maxStamina,
      spiritBase: variant.spiritBase,
      obtained_at: new Date(),
      template: {
        id: template.id,
        name: template.name,
        title: template.title,
        tier: template.tier,
        trait: template.trait,
        gachaWeight: template.gachaWeight,
        isActive: template.isActive,
        imageKey: template.imageKey || null,
      },
    },
  });
}));
