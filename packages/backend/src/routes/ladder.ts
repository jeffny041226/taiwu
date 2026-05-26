import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getSupabase } from "../db/supabase";
import {
  memoryGetCombatPower,
  memoryGetDefenseCrickets,
  memorySetDefenseCrickets,
  memoryGetWinLoss,
} from "../lib/memory-store";

export const ladderRouter = Router();

/** GET /api/ladder/top100 — 战力前100名 */
ladderRouter.get("/top100", authMiddleware, async (_req, res) => {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("users")
      .select("uid, nick_name, avatar, combat_power")
      .order("combat_power", { ascending: false })
      .limit(100);

    if (error) {
      res.status(500).json({ error: "获取排行榜失败" });
      return;
    }

    const list = (data || []).map((u: any, i: number) => ({
      rank: i + 1,
      uid: u.uid,
      nickName: u.nick_name || "",
      avatar: u.avatar || null,
      combatPower: u.combat_power ?? 1000,
    }));

    res.json({ list });
    return;
  }

  // Memory fallback: 无法获取全局排行，返回空列表
  res.json({ list: [] });
});

/** GET /api/ladder/position — 当前用户排名 + 上下各10人 */
ladderRouter.get("/position", authMiddleware, async (req, res) => {
  const uid = req.user!.uid;
  const sb = getSupabase();

  if (sb) {
    // 获取自己的战力
    const { data: me } = await sb
      .from("users")
      .select("combat_power, nick_name, avatar")
      .eq("uid", uid)
      .single();

    const myPower = me?.combat_power ?? 1000;
    const myNickName = me?.nick_name || req.user!.nickName || "";
    const myAvatar = me?.avatar || null;

    // 计算排名: 比当前用户战力高的人数
    const { count: higher } = await sb
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("combat_power", myPower);

    const myRank = (higher ?? 0) + 1;

    // 获取周围排名
    const offset = Math.max(0, myRank - 11);
    const { data: surrounding } = await sb
      .from("users")
      .select("uid, nick_name, avatar, combat_power")
      .order("combat_power", { ascending: false })
      .range(offset, offset + 20);

    const list = (surrounding || []).map((u: any, i: number) => ({
      rank: offset + i + 1,
      uid: u.uid,
      nickName: u.nick_name || "",
      avatar: u.avatar || null,
      combatPower: u.combat_power ?? 1000,
      isMe: u.uid === uid,
    }));

    res.json({
      myRank,
      myCombatPower: myPower,
      myNickName,
      myAvatar,
      list,
    });
    return;
  }

  // Memory fallback: 只返回当前用户
  const myPower = memoryGetCombatPower(uid);
  const wl = memoryGetWinLoss(uid);
  res.json({
    myRank: 1,
    myCombatPower: myPower,
    myNickName: req.user!.nickName || "",
    myAvatar: null,
    myWins: wl.wins,
    myLosses: wl.losses,
    list: [{ rank: 1, uid, nickName: req.user!.nickName || "", avatar: null, combatPower: myPower, isMe: true }],
  });
});

/** GET /api/ladder/defense — 获取防守阵容 */
ladderRouter.get("/defense", authMiddleware, async (req, res) => {
  const uid = req.user!.uid;
  const sb = getSupabase();

  if (sb) {
    const { data } = await sb
      .from("users")
      .select("defense_crickets")
      .eq("uid", uid)
      .single();

    const cricketIds: number[] = data?.defense_crickets || [];

    // 解析蛐蛐详情
    let crickets: any[] = [];
    if (cricketIds.length > 0) {
      const { data: cricketData } = await sb
        .from("user_crickets")
        .select("id, template_id, attack, defense, speed, max_hp, max_stamina, spirit_base, obtained_at")
        .in("id", cricketIds)
        .eq("uid", uid);

      if (cricketData) {
        const templateIds = cricketData.map((c: any) => c.template_id);
        const { data: templates } = await sb
          .from("cricket_templates")
          .select("*")
          .in("id", templateIds);

        crickets = cricketData.map((c: any) => {
          const tmpl = (templates || []).find((t: any) => t.id === c.template_id);
          return {
            id: c.id,
            template_id: c.template_id,
            attack: c.attack,
            defense: c.defense,
            speed: c.speed,
            maxHp: c.max_hp,
            maxStamina: c.max_stamina,
            spiritBase: c.spirit_base,
            obtained_at: c.obtained_at,
            template: tmpl ? {
              id: tmpl.id, name: tmpl.name, title: tmpl.title,
              tier: tmpl.tier, attack: tmpl.attack, defense: tmpl.defense,
              speed: tmpl.speed, hpBase: tmpl.hp_base, staminaBase: tmpl.stamina_base,
              spiritBase: tmpl.spirit_base, trait: tmpl.trait,
              gachaWeight: tmpl.gacha_weight, isActive: tmpl.is_active,
              imageKey: tmpl.image_key,
            } : null,
          };
        });
      }
    }

    res.json({ cricketIds, crickets });
    return;
  }

  // Memory fallback
  const cricketIds = memoryGetDefenseCrickets(uid);
  res.json({ cricketIds, crickets: [] });
});

/** PUT /api/ladder/defense — 保存防守阵容 */
ladderRouter.put("/defense", authMiddleware, async (req, res) => {
  const uid = req.user!.uid;
  const { cricketIds } = req.body as { cricketIds: number[] };

  if (!Array.isArray(cricketIds) || cricketIds.length !== 3) {
    res.status(400).json({ error: "请选择3只蛐蛐作为防守阵容" });
    return;
  }

  const sb = getSupabase();
  if (sb) {
    // 验证所有权
    const { data: owned } = await sb
      .from("user_crickets")
      .select("id")
      .in("id", cricketIds)
      .eq("uid", uid);

    if (!owned || owned.length !== 3) {
      res.status(400).json({ error: "只能选择自己的蛐蛐" });
      return;
    }

    await sb.from("users")
      .update({ defense_crickets: cricketIds })
      .eq("uid", uid);

    res.json({ success: true, cricketIds });
    return;
  }

  // Memory fallback
  memorySetDefenseCrickets(uid, cricketIds);
  res.json({ success: true, cricketIds });
});
