import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { db } from "../db/client";
import { users, userCrickets, cricketTemplates } from "../db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { pullMultiple } from "@taiwu/shared/lib/gacha-engine";
import { generateVariantByTier } from "../lib/tier-ranges";

export const gachaRouter = Router();

gachaRouter.post("/pull", authMiddleware, asyncHandler(async (req, res) => {
  const { count } = req.body as { count: 1 | 5 | 10 };
  const uid = req.user!.uid;

  // 检查并消耗抽奖次数
  const chances = await getGachaChances(uid);
  if (chances < count) {
    res.status(402).json({ error: "抽奖次数不足", chances, needed: count });
    return;
  }

  const activeTemplates = CRICKET_TEMPLATES.filter(t => t.isActive);
  const pulled = pullMultiple(activeTemplates, count);

  // 确保用户存在
  await db.insert(users)
    .values({ uid, nickName: req.user!.nickName, token: uid })
    .onDuplicateKeyUpdate({ set: { nickName: req.user!.nickName } });

  // 插入抽到的 user_crickets
  const inserts = pulled.map(t => {
    const v = generateVariantByTier(t.tier);
    return {
      uid,
      templateId: t.id,
      attack: v.attack,
      defense: v.defense,
      speed: v.speed,
      maxHp: v.maxHp,
      maxStamina: v.maxStamina,
      spiritBase: v.spiritBase,
    };
  });
  const insertedRows = await db.insert(userCrickets).values(inserts).$returningId();

  // 从 DB 拿云端 imageKey
  const templateIds = pulled.map(t => t.id);
  const tmplRows = await db
    .select()
    .from(cricketTemplates)
    .where(inArray(cricketTemplates.id, templateIds));

  const results = insertedRows.map((row, i) => {
    const uc = inserts[i];
    const dbTmpl = tmplRows.find(t => t.id === uc.templateId);
    return {
      id: row.id,
      template_id: uc.templateId,
      attack: uc.attack,
      defense: uc.defense,
      speed: uc.speed,
      maxHp: uc.maxHp,
      maxStamina: uc.maxStamina,
      spiritBase: uc.spiritBase,
      obtained_at: new Date(),
      template: dbTmpl ? {
        id: dbTmpl.id,
        name: dbTmpl.name,
        title: dbTmpl.title,
        tier: dbTmpl.tier,
        trait: dbTmpl.trait,
        gachaWeight: dbTmpl.gachaWeight,
        isActive: dbTmpl.isActive,
        imageKey: dbTmpl.imageKey,
      } : null,
    };
  });

  // 扣除抽奖次数
  await deductGachaChances(uid, count);

  res.json({ results, count });
}));

/** GET /api/gacha/chances — 获取抽奖次数 */
gachaRouter.get("/chances", authMiddleware, asyncHandler(async (req, res) => {
  const uid = req.user!.uid;
  const chances = await getGachaChances(uid);
  res.json({ chances });
}));

// ── 辅助:抽奖次数 CRUD ──

async function getGachaChances(uid: string): Promise<number> {
  const rows = await db
    .select({ chances: users.gachaChances })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  return rows[0]?.chances ?? 0;
}

async function deductGachaChances(uid: string, count: number): Promise<void> {
  // GREATEST 防止减成负数(虽然 getGachaChances 已经 check 了 chances >= count)
  await db
    .update(users)
    .set({ gachaChances: sql`GREATEST(0, ${users.gachaChances} - ${count})` })
    .where(eq(users.uid, uid));
}
