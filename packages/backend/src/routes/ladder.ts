import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { db } from "../db/client";
import { users, userCrickets, cricketTemplates } from "../db/schema";
import { eq, gt, desc, inArray, and, count } from "drizzle-orm";

export const ladderRouter = Router();

/** GET /api/ladder/top100 — 战力前100名 */
ladderRouter.get("/top100", authMiddleware, asyncHandler(async (_req, res) => {
  const rows = await db
    .select({
      uid: users.uid,
      nickName: users.nickName,
      avatar: users.avatar,
      combatPower: users.combatPower,
    })
    .from(users)
    .orderBy(desc(users.combatPower))
    .limit(100);

  const list = rows.map((u, i) => ({
    rank: i + 1,
    uid: u.uid,
    nickName: u.nickName || "",
    avatar: u.avatar || null,
    combatPower: u.combatPower ?? 1000,
  }));

  res.json({ list });
}));

/** GET /api/ladder/position — 当前用户排名 + 上下各5人 */
ladderRouter.get("/position", authMiddleware, asyncHandler(async (req, res) => {
  const uid = req.user!.uid;

  const meRows = await db
    .select({
      combatPower: users.combatPower,
      nickName: users.nickName,
      avatar: users.avatar,
      wins: users.wins,
      losses: users.losses,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  const me = meRows[0];
  const myPower = me?.combatPower ?? 1000;
  const myNickName = me?.nickName || req.user!.nickName || "";
  const myAvatar = me?.avatar || null;
  const myWins = me?.wins ?? 0;
  const myLosses = me?.losses ?? 0;

  // 排名: 战力高于我的人数 + 1
  const higherRows = await db
    .select({ n: count() })
    .from(users)
    .where(gt(users.combatPower, myPower));
  const myRank = Number(higherRows[0]?.n ?? 0) + 1;

  // 周围排名
  const offset = Math.max(0, myRank - 6);
  const surrounding = await db
    .select({
      uid: users.uid,
      nickName: users.nickName,
      avatar: users.avatar,
      combatPower: users.combatPower,
    })
    .from(users)
    .orderBy(desc(users.combatPower))
    .offset(offset)
    .limit(11);

  const list = surrounding.map((u, i) => ({
    rank: offset + i + 1,
    uid: u.uid,
    nickName: u.nickName || "",
    avatar: u.avatar || null,
    combatPower: u.combatPower ?? 1000,
    isMe: u.uid === uid,
  }));

  res.json({
    myRank,
    myCombatPower: myPower,
    myNickName,
    myAvatar,
    myWins,
    myLosses,
    list,
  });
}));

/** GET /api/ladder/defense — 获取防守阵容 */
ladderRouter.get("/defense", authMiddleware, asyncHandler(async (req, res) => {
  const uid = req.user!.uid;

  const userRows = await db
    .select({ defense: users.defenseCrickets })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  const cricketIds: number[] = (userRows[0]?.defense ?? []) as number[];

  let crickets: any[] = [];
  if (cricketIds.length > 0) {
    const cricketData = await db
      .select({
        id: userCrickets.id,
        templateId: userCrickets.templateId,
        attack: userCrickets.attack,
        defense: userCrickets.defense,
        speed: userCrickets.speed,
        maxHp: userCrickets.maxHp,
        maxStamina: userCrickets.maxStamina,
        spiritBase: userCrickets.spiritBase,
        obtainedAt: userCrickets.obtainedAt,
      })
      .from(userCrickets)
      .where(and(inArray(userCrickets.id, cricketIds), eq(userCrickets.uid, uid)));

    if (cricketData.length > 0) {
      const templateIds = cricketData.map(c => c.templateId);
      const templates = await db
        .select()
        .from(cricketTemplates)
        .where(inArray(cricketTemplates.id, templateIds));

      crickets = cricketData.map(c => {
        const tmpl = templates.find(t => t.id === c.templateId);
        return {
          id: c.id,
          template_id: c.templateId,
          attack: c.attack,
          defense: c.defense,
          speed: c.speed,
          maxHp: c.maxHp,
          maxStamina: c.maxStamina,
          spiritBase: c.spiritBase,
          obtained_at: c.obtainedAt,
          template: tmpl ? {
            id: tmpl.id, name: tmpl.name, title: tmpl.title,
            tier: tmpl.tier, trait: tmpl.trait,
            gachaWeight: tmpl.gachaWeight, isActive: tmpl.isActive,
            imageKey: tmpl.imageKey,
          } : null,
        };
      });
    }
  }

  res.json({ cricketIds, crickets });
}));

/** PUT /api/ladder/defense — 保存防守阵容 */
ladderRouter.put("/defense", authMiddleware, asyncHandler(async (req, res) => {
  const uid = req.user!.uid;
  const { cricketIds } = req.body as { cricketIds: number[] };

  if (!Array.isArray(cricketIds) || cricketIds.length !== 3) {
    res.status(400).json({ error: "请选择3只蛐蛐作为防守阵容" });
    return;
  }

  // 验证所有权
  const owned = await db
    .select({ id: userCrickets.id })
    .from(userCrickets)
    .where(and(inArray(userCrickets.id, cricketIds), eq(userCrickets.uid, uid)));

  if (owned.length !== 3) {
    res.status(400).json({ error: "只能选择自己的蛐蛐" });
    return;
  }

  await db.update(users)
    .set({ defenseCrickets: cricketIds })
    .where(eq(users.uid, uid));

  res.json({ success: true, cricketIds });
}));
