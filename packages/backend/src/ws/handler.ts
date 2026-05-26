import { WebSocket } from "ws";
import type { Action } from "./types";
import {
  getRoom, getAllRooms, createRoom, joinRoom, setCrickets, startBattle,
  roundEnd, nextRound, setAction, bothActionsReady,
  addScore, finishRoom, scheduleCleanup, cancelScheduledCleanup,
  validateRoomCode, generateRoomCode,
  clearSelectionTimer, enqueueMatch, dequeueMatch, dequeueMatchByWs, getMatchQueueLength,
  resetBattleForRematch,
} from "./room-manager";
import { resolveRound, validateCricketCount } from "./battle-resolver";
import { aiChooseAction, createAIPlayer, createAICrickets } from "./ai-opponent";
import { resolveCrickets, resolveCricketsWithStats, DEFAULT_CRICKET_IDS } from "./cricket-resolver";
import type { BattleCalcInput } from "@taiwu/shared/lib/battle-calc";
import { ACTION_TIMEOUT, CRICKET_SELECTION_TIMEOUT } from "@taiwu/shared/config/game";
import { getSupabase } from "../db/supabase";
import {
  memoryGetCombatPower, memoryAdjustCombatPower,
  memoryGetDefenseCrickets, memoryAddWin, memoryAddLoss,
} from "../lib/memory-store";

interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

function send(ws: WebSocket, type: string, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcast(roomId: string, type: string, payload: unknown): void {
  const room = getRoom(roomId);
  if (!room) return;
  const leftWs = room.leftPlayer?.ws;
  const rightWs = room.rightPlayer?.ws;
  if (leftWs && leftWs.readyState === WebSocket.OPEN) send(leftWs, type, payload);
  if (rightWs && !room.isPractice && rightWs.readyState === WebSocket.OPEN) send(rightWs, type, payload);
}

// ── 战力持久化 ──

async function adjustCombatPower(uid: string, delta: number): Promise<number> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from("users").select("combat_power").eq("uid", uid).single();
    const current = data?.combat_power ?? 1000;
    const updated = Math.max(0, current + delta);
    await sb.from("users").update({ combat_power: updated }).eq("uid", uid);
    return updated;
  }
  return memoryAdjustCombatPower(uid, delta);
}

async function persistBattleOutcome(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;
  // 纯训练模式不影响战力
  if (room.isPractice && !room.targetUid) return;

  const leftUid = room.leftPlayer?.uid;
  const rightUid = room.targetUid || room.rightPlayer?.uid;
  if (!leftUid || !rightUid) return;

  const leftWon = room.leftScore > room.rightScore;
  const rightWon = room.rightScore > room.leftScore;
  const isDraw = room.leftScore === room.rightScore;

  if (isDraw) return;

  const winnerUid = leftWon ? leftUid : rightUid;
  const loserUid = leftWon ? rightUid : leftUid;

  // 更新战力
  const winnerPower = await adjustCombatPower(winnerUid, 25);
  const loserPower = await adjustCombatPower(loserUid, -25);

  // 更新胜负场
  const sb = getSupabase();
  if (sb) {
    const { data: w } = await sb.from("users").select("wins,losses").eq("uid", winnerUid).single();
    await sb.from("users").update({ wins: (w?.wins ?? 0) + 1 }).eq("uid", winnerUid);
    const { data: l } = await sb.from("users").select("wins,losses").eq("uid", loserUid).single();
    await sb.from("users").update({ losses: (l?.losses ?? 0) + 1 }).eq("uid", loserUid);
  } else {
    memoryAddWin(winnerUid);
    memoryAddLoss(loserUid);
  }

  // 通知在线玩家战力变化
  const leftWs = room.leftPlayer?.ws;
  if (leftWs?.readyState === WebSocket.OPEN && leftUid) {
    const won = leftUid === winnerUid;
    send(leftWs, "battle:powerUpdate", { power: won ? winnerPower : loserPower, delta: won ? 25 : -25, won });
  }
}

// ── 挑战模式：加载目标防守阵容 ──

async function loadDefenseLineup(targetUid: string): Promise<{ nickName: string; avatar?: string; crickets: any[] } | null> {
  const sb = getSupabase();
  if (sb) {
    const { data: user } = await sb.from("users")
      .select("nick_name, avatar, defense_crickets")
      .eq("uid", targetUid).single();

    if (!user) return null;
    const nickName = user.nick_name || "玩家";
    const avatar = user.avatar || undefined;
    const defenseIds: number[] = user.defense_crickets || [];

    let cricketIds = defenseIds;
    // 未布阵则随机选3只
    if (cricketIds.length < 3) {
      const { data: owned } = await sb.from("user_crickets")
        .select("id").eq("uid", targetUid).limit(3);
      cricketIds = (owned || []).map((c: any) => c.id);
    }

    if (cricketIds.length === 0) return null;

    const { data: cricketData } = await sb.from("user_crickets")
      .select("id, template_id, attack, defense, speed, max_hp, max_stamina, spirit_base")
      .in("id", cricketIds.slice(0, 3)).eq("uid", targetUid);

    if (!cricketData || cricketData.length === 0) return null;

    const templateIds = cricketData.map((c: any) => c.template_id);
    const { data: templates } = await sb.from("cricket_templates").select("*").in("id", templateIds);

    const crickets = cricketData.map((c: any) => {
      const tmpl = (templates || []).find((t: any) => t.id === c.template_id);
      return {
        id: c.id, templateId: c.template_id,
        name: tmpl?.name || "蛐蛐", title: tmpl?.title || "", tier: tmpl?.tier || "common",
        attack: c.attack, defense: c.defense, speed: c.speed,
        maxHp: c.max_hp, hp: c.max_hp, maxStamina: c.max_stamina, stamina: c.max_stamina,
        spirit: c.spirit_base, trait: tmpl?.trait || "fierce",
      };
    });

    return { nickName, avatar, crickets };
  }

  // Memory fallback
  const ids = memoryGetDefenseCrickets(targetUid);
  return ids.length > 0
    ? { nickName: "玩家", crickets: ids.map((id: number) => ({
        id, templateId: 1, name: "蛐蛐", title: "", tier: "common",
        attack: 15, defense: 15, speed: 12, maxHp: 100, hp: 100,
        maxStamina: 100, stamina: 100, spirit: 100, trait: "fierce",
      })) }
    : null;
}

function clearActionTimer(roomId: string): void {
  const room = getRoom(roomId);
  if (room?.actionTimer) {
    clearTimeout(room.actionTimer);
    room.actionTimer = null;
  }
}

function handleRoundSettlement(roomId: string): void {
  const room = getRoom(roomId);
  if (!room || room.phase !== "battling") return;
  if (!bothActionsReady(room)) return;

  clearActionTimer(roomId);

  const { roundResult, roundWin, gameOver, defeatedSide } = resolveRound(room);
  room.lastDefeatedSide = defeatedSide;

  const leftCricket = room.leftCrickets[room.currentLeftIndex];
  const rightCricket = room.rightCrickets[room.currentRightIndex];

  const perspectivePayload = (isLeft: boolean) => ({
    myAction: isLeft ? roundResult.leftAction : roundResult.rightAction,
    enemyAction: isLeft ? roundResult.rightAction : roundResult.leftAction,
    myDamage: isLeft ? Math.abs(roundResult.leftHpDelta) : Math.abs(roundResult.rightHpDelta),
    enemyDamage: isLeft ? Math.abs(roundResult.rightHpDelta) : Math.abs(roundResult.leftHpDelta),
    myHp: isLeft ? roundResult.leftHp : roundResult.rightHp,
    myStamina: isLeft ? leftCricket.stamina : rightCricket.stamina,
    mySpirit: isLeft ? leftCricket.spirit : rightCricket.spirit,
    enemyHp: isLeft ? roundResult.rightHp : roundResult.leftHp,
    enemyStamina: isLeft ? rightCricket.stamina : leftCricket.stamina,
    enemySpirit: isLeft ? rightCricket.spirit : leftCricket.spirit,
    myBlocked: isLeft ? roundResult.rightAction === "block" : roundResult.leftAction === "block",
    enemyBlocked: isLeft ? roundResult.leftAction === "block" : roundResult.rightAction === "block",
    myCounter: getClientCounterMultiplier(isLeft ? roundResult.leftAction : roundResult.rightAction as Action, isLeft ? roundResult.rightAction : roundResult.leftAction as Action),
    enemyCounter: getClientCounterMultiplier(isLeft ? roundResult.rightAction : roundResult.leftAction as Action, isLeft ? roundResult.leftAction : roundResult.rightAction as Action),
    myStaminaDelta: isLeft ? roundResult.leftStaminaDelta : roundResult.rightStaminaDelta,
    mySpiritDelta: isLeft ? roundResult.leftSpiritDelta : roundResult.rightSpiritDelta,
    enemyStaminaDelta: isLeft ? roundResult.rightStaminaDelta : roundResult.leftStaminaDelta,
    enemySpiritDelta: isLeft ? roundResult.rightSpiritDelta : roundResult.leftSpiritDelta,
    myDefeated: isLeft ? roundResult.leftDefeated : roundResult.rightDefeated,
    enemyDefeated: isLeft ? roundResult.rightDefeated : roundResult.leftDefeated,
  });

  if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
    send(room.leftPlayer.ws, "battle:roundResult", perspectivePayload(true));
  }
  if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) {
    send(room.rightPlayer.ws, "battle:roundResult", perspectivePayload(false));
  }

  if (gameOver) {
    finishRoom(room);
    const gameOverPerspective = (isLeft: boolean) => ({
      winner: gameOver.winner === "left" ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me"),
      myScore: isLeft ? gameOver.leftScore : gameOver.rightScore,
      enemyScore: isLeft ? gameOver.rightScore : gameOver.leftScore,
    });
    if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
      send(room.leftPlayer.ws, "battle:gameOver", gameOverPerspective(true));
    }
    if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) {
      send(room.rightPlayer.ws, "battle:gameOver", gameOverPerspective(false));
    }
    scheduleCleanup(roomId);
    persistBattleOutcome(roomId).catch(err => console.error(`[Power] 持久化失败 ${roomId}:`, err));
    return;
  }

  if (roundWin) {
    if (room.isPractice) {
      roundEnd(room);
      const roundWinPerspective = (isLeft: boolean) => ({
        winner: roundWin.winner === "draw" ? "draw" : (roundWin.winner === "left" ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me")),
        myScore: isLeft ? roundWin.leftScore : roundWin.rightScore,
        enemyScore: isLeft ? roundWin.rightScore : roundWin.leftScore,
        defeatedCricket: roundWin.defeatedCricket ? {
          side: roundWin.defeatedCricket.side === "left" ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me"),
          name: roundWin.defeatedCricket.name,
          title: roundWin.defeatedCricket.title,
        } : null,
      });
      if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
        send(room.leftPlayer.ws, "battle:roundWin", roundWinPerspective(true));
      }
      practiceStep(roomId, defeatedSide);
    } else {
      roundEnd(room);
      const roundWinPerspective = (isLeft: boolean) => ({
        winner: roundWin.winner === "draw" ? "draw" : (roundWin.winner === "left" ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me")),
        myScore: isLeft ? roundWin.leftScore : roundWin.rightScore,
        enemyScore: isLeft ? roundWin.rightScore : roundWin.leftScore,
        defeatedCricket: roundWin.defeatedCricket ? {
          side: roundWin.defeatedCricket.side === "left" ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me"),
          name: roundWin.defeatedCricket.name,
          title: roundWin.defeatedCricket.title,
        } : null,
      });
      if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
        send(room.leftPlayer.ws, "battle:roundWin", roundWinPerspective(true));
      }
      if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) {
        send(room.rightPlayer.ws, "battle:roundWin", roundWinPerspective(false));
      }
      setTimeout(() => {
        const r = getRoom(roomId);
        if (!r || r.phase !== "roundEnd") return;
        if (r.isPractice && r.rightPlayer) {
          r.rightPlayer.readyRound = true;
        }
        if (r.leftPlayer?.readyRound && r.rightPlayer?.readyRound) {
          if (nextRound(r, r.lastDefeatedSide)) {
            broadcast(roomId, "room:state", buildRoomState(r));
            broadcastCricketChange(r);
            startActionTimer(roomId);
          }
        }
      }, 2500);
    }
  } else {
    room.leftAction = null;
    room.rightAction = null;
    if (room.isPractice) {
      room.actionTimer = setTimeout(() => startPracticeLoop(roomId), 1500);
    } else {
      startActionTimer(roomId);
    }
  }
}

function getClientCounterMultiplier(myAction: Action, enemyAction: Action): number {
  const COUNTER: Record<string, Record<string, number>> = {
    heavy_strike: { chirp: 1.2, feint: 1.1, block: 1 },
    feint: { block: 1.5, chirp: 1.15, heavy_strike: 1 },
    block: { heavy_strike: 1, feint: 1, chirp: 1 },
    chirp: { heavy_strike: 1, feint: 1, block: 1 },
  };
  return COUNTER[myAction]?.[enemyAction] ?? 1;
}

function startActionTimer(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;
  clearActionTimer(roomId);
  room.actionTimer = setTimeout(() => {
    const r = getRoom(roomId);
    if (!r || r.phase !== "battling") return;
    const allActions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
    if (!r.leftAction) r.leftAction = allActions[Math.floor(Math.random() * 4)];
    if (!r.rightAction) {
      r.rightAction = allActions[Math.floor(Math.random() * 4)];
    }
    handleRoundSettlement(roomId);
  }, ACTION_TIMEOUT);
}

/** 练习模式自动对战循环 */
function startPracticeLoop(roomId: string): void {
  const room = getRoom(roomId);
  if (!room || !room.isPractice) return;
  clearActionTimer(roomId);
  const actions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
  room.leftAction = actions[Math.floor(Math.random() * 4)];
  room.rightAction = actions[Math.floor(Math.random() * 4)];
  handleRoundSettlement(roomId);
}

/** 练习模式：处理完一局后自动进入下一轮 */
function practiceStep(roomId: string, defeatedSide: "left" | "right" | "both" | null): void {
  const room = getRoom(roomId);
  if (!room || !room.isPractice || room.phase !== "roundEnd") return;
  if (nextRound(room, defeatedSide)) {
    broadcast(roomId, "room:state", buildRoomState(room));
    broadcastCricketChange(room);
    // 蛐蛐战败后延迟加倍，给玩家观看换蛐蛐动画的时间
    room.actionTimer = setTimeout(() => startPracticeLoop(roomId), 3000);
  } else {
    finishRoom(room);
    const gameOverPerspective = (isLeft: boolean) => ({
      winner: room.leftScore >= 2 ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me"),
      myScore: isLeft ? room.leftScore : room.rightScore,
      enemyScore: isLeft ? room.rightScore : room.leftScore,
    });
    if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) send(room.leftPlayer.ws, "battle:gameOver", gameOverPerspective(true));
    if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) send(room.rightPlayer.ws, "battle:gameOver", gameOverPerspective(false));
    scheduleCleanup(roomId);
    persistBattleOutcome(roomId).catch(err => console.error(`[Power] 持久化失败 ${roomId}:`, err));
  }
}

function startSelectionTimer(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;
  clearSelectionTimer(roomId);
  room.selectionStartTime = Date.now();
  room.selectionTimer = setTimeout(() => {
    const r = getRoom(roomId);
    if (!r || r.phase !== "ready") return;

    if (r.leftPlayer && !r.leftPlayer.readyRound) {
      const crickets = resolveCrickets(DEFAULT_CRICKET_IDS);
      if (crickets) {
        setCrickets(r, "left", crickets);
        r.leftPlayer.cricketIds = DEFAULT_CRICKET_IDS;
        r.leftPlayer.readyRound = true;
      }
    }
    if (r.rightPlayer && !r.rightPlayer.readyRound) {
      const crickets = resolveCrickets(DEFAULT_CRICKET_IDS);
      if (crickets) {
        setCrickets(r, "right", crickets);
        r.rightPlayer.cricketIds = DEFAULT_CRICKET_IDS;
        r.rightPlayer.readyRound = true;
      }
    }

    if (r.leftPlayer?.readyRound && r.rightPlayer?.readyRound) {
      if (startBattle(r)) {
        broadcastBattleData(r);
        broadcast(roomId, "room:state", buildRoomState(r));
        startActionTimer(roomId);
      }
    }
  }, CRICKET_SELECTION_TIMEOUT * 1000);
}

function sendBattleData(room: NonNullable<ReturnType<typeof getRoom>>, ws: WebSocket, uid: string): void {
  const isLeft = room.leftPlayer?.uid === uid;
  const myCrickets = isLeft ? room.leftCrickets : room.rightCrickets;
  const enemyCrickets = isLeft ? room.rightCrickets : room.leftCrickets;

  const toClientCricket = (bc: import("./types").BattleCricket) => ({
    id: bc.id, templateId: bc.templateId, name: bc.name, title: bc.title, tier: bc.tier,
    maxHp: bc.maxHp, hp: bc.hp, maxStamina: bc.maxStamina, stamina: bc.stamina,
    spirit: bc.spirit, attack: bc.attack, defense: bc.defense, speed: bc.speed, trait: bc.trait,
  });

  send(ws, "battle:data", {
    myCrickets: myCrickets.map(toClientCricket),
    enemyCrickets: enemyCrickets.map(toClientCricket),
    myIdx: isLeft ? room.currentLeftIndex : room.currentRightIndex,
    enemyIdx: isLeft ? room.currentRightIndex : room.currentLeftIndex,
    myScore: isLeft ? room.leftScore : room.rightScore,
    enemyScore: isLeft ? room.rightScore : room.leftScore,
    battleMode: room.battleMode,
  });
}

function broadcastBattleData(room: NonNullable<ReturnType<typeof getRoom>>): void {
  if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
    sendBattleData(room, room.leftPlayer.ws, room.leftPlayer.uid);
  }
  if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) {
    sendBattleData(room, room.rightPlayer.ws, room.rightPlayer.uid);
  }
}

function broadcastCricketChange(room: NonNullable<ReturnType<typeof getRoom>>): void {
  const leftCricket = room.leftCrickets[room.currentLeftIndex];
  const rightCricket = room.rightCrickets[room.currentRightIndex];

  const toClientCricket = (bc: import("./types").BattleCricket) => ({
    id: bc.id, templateId: bc.templateId, name: bc.name, title: bc.title, tier: bc.tier,
    maxHp: bc.maxHp, hp: bc.hp, maxStamina: bc.maxStamina, stamina: bc.stamina,
    spirit: bc.spirit, attack: bc.attack, defense: bc.defense, speed: bc.speed, trait: bc.trait,
  });

  if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
    send(room.leftPlayer.ws, "battle:cricketChange", {
      myCricket: toClientCricket(leftCricket),
      enemyCricket: toClientCricket(rightCricket),
      myIdx: room.currentLeftIndex,
      enemyIdx: room.currentRightIndex,
    });
  }
  if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) {
    send(room.rightPlayer.ws, "battle:cricketChange", {
      myCricket: toClientCricket(rightCricket),
      enemyCricket: toClientCricket(leftCricket),
      myIdx: room.currentRightIndex,
      enemyIdx: room.currentLeftIndex,
    });
  }
}

function buildRoomState(room: NonNullable<ReturnType<typeof getRoom>>) {
  const base = {
    roomId: room.roomId,
    phase: room.phase,
    leftPlayer: room.leftPlayer ? { uid: room.leftPlayer.uid, nickName: room.leftPlayer.nickName, avatar: room.leftPlayer.avatar, ready: room.leftPlayer.readyRound } : null,
    rightPlayer: room.rightPlayer ? { uid: room.rightPlayer.uid, nickName: room.rightPlayer.nickName, avatar: room.rightPlayer.avatar, ready: room.rightPlayer.readyRound } : null,
    currentLeftCricket: room.currentLeftIndex,
    currentRightCricket: room.currentRightIndex,
    leftScore: room.leftScore,
    rightScore: room.rightScore,
  };

  if (room.phase === "ready" && room.selectionStartTime > 0) {
    const elapsed = Math.floor((Date.now() - room.selectionStartTime) / 1000);
    (base as Record<string, unknown>).selectionRemaining = Math.max(0, CRICKET_SELECTION_TIMEOUT - elapsed);
  }

  return base;
}

/** 处理挑战请求（异步加载防守阵容） */
async function handleChallenge(ws: WebSocket, payload: Record<string, unknown>): Promise<void> {
  const uid = (ws as any).uid || (payload.uid as string) || "player";
  const nickName = (ws as any).nickName || (payload.nickName as string) || "玩家";
  const targetUid = payload.targetUid as string;
  const cricketIds = payload.cricketIds as number[];
  const cricketStats = payload.cricketStats as any[];

  if (!targetUid || !cricketIds || !cricketStats || cricketIds.length !== 3) {
    send(ws, "room:error", { message: "参数不完整" });
    return;
  }

  const defense = await loadDefenseLineup(targetUid);
  if (!defense) {
    send(ws, "room:error", { message: "对手暂无可挑战阵容" });
    return;
  }

  const roomId = generateRoomCode(uid + "-challenge-" + Date.now());
  const player = { uid, nickName, ws, readyRound: false };
  const room = createRoom(roomId, player, true);
  room.targetUid = targetUid;
  room.targetNickName = defense.nickName;

  room.rightPlayer = createAIPlayer();
  room.rightPlayer!.uid = targetUid;
  room.rightPlayer!.nickName = defense.nickName;
  room.rightPlayer!.avatar = defense.avatar;
  room.rightCrickets = defense.crickets;
  room.rightPlayer!.readyRound = true;

  const crickets = resolveCricketsWithStats(cricketStats);
  if (!crickets) {
    send(ws, "room:error", { message: "蛐蛐数据无效" });
    return;
  }
  setCrickets(room, "left", crickets);
  room.leftPlayer!.cricketIds = cricketIds;
  room.leftPlayer!.readyRound = true;
  room.phase = "ready";
  room.selectionStartTime = Date.now();

  if (startBattle(room)) {
    send(ws, "room:created", { roomId });
    broadcastBattleData(room);
    broadcast(roomId, "room:state", buildRoomState(room));
    room.actionTimer = setTimeout(() => startPracticeLoop(roomId), 2000);
  }
}

export function handleMessage(ws: WebSocket, rawData: Buffer): void {
  let msg: WSMessage;
  try {
    msg = JSON.parse(rawData.toString());
  } catch {
    send(ws, "room:error", { message: "无效消息格式" });
    return;
  }

  const { type, payload } = msg;
  const uid = (ws as any).uid;
  if (type !== "ping") {
    console.log(`[WS] 收到消息: type=${type}, uid=${uid || payload.uid || "?"}, payload=${JSON.stringify(payload).slice(0, 120)}`);
  }

  switch (type) {
    case "ping":
      send(ws, "pong", {});
      break;

    case "room:create": {
      const uid = (ws as any).uid || payload.uid as string;
      const nickName = (ws as any).nickName || (payload.nickName as string) || "玩家";

      const roomId = generateRoomCode(uid);
      const existing = getRoom(roomId);
      if (existing) { finishRoom(existing); scheduleCleanup(roomId); }

      const player = { uid, nickName, ws, readyRound: false };
      createRoom(roomId, player);
      send(ws, "room:created", { roomId });
      broadcast(roomId, "room:state", buildRoomState(getRoom(roomId)!));
      break;
    }

    case "room:join": {
      const roomId = (payload.roomId as string)?.toUpperCase();
      const uid = (ws as any).uid || payload.uid as string;
      const nickName = (ws as any).nickName || (payload.nickName as string) || "玩家";

      if (!roomId || !validateRoomCode(roomId)) { send(ws, "room:error", { message: "房间号格式不正确" }); return; }

      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }

      if (room.leftPlayer?.uid === uid) {
        room.leftPlayer!.ws = ws;
        send(ws, "room:state", buildRoomState(room));
        if (room.phase === "ready") send(ws, "room:selectionStart", { timeout: CRICKET_SELECTION_TIMEOUT });
        if (room.phase === "battling" || room.phase === "roundEnd") sendBattleData(room, ws, uid);
        return;
      }

      if (room.rightPlayer?.uid === uid) {
        room.rightPlayer!.ws = ws;
        send(ws, "room:state", buildRoomState(room));
        if (room.phase === "ready") send(ws, "room:selectionStart", { timeout: CRICKET_SELECTION_TIMEOUT });
        if (room.phase === "battling" || room.phase === "roundEnd") sendBattleData(room, ws, uid);
        return;
      }

      if (room.phase !== "waiting" || room.rightPlayer) { send(ws, "room:error", { message: "房间已满或战斗已开始" }); return; }

      const player = { uid, nickName, ws, readyRound: false };
      room.rightPlayer = player;
      room.phase = "ready";
      broadcast(roomId, "room:joined", buildRoomState(room));
      broadcast(roomId, "room:state", buildRoomState(room));
      startSelectionTimer(roomId);
      broadcast(roomId, "room:selectionStart", { timeout: CRICKET_SELECTION_TIMEOUT });
      break;
    }

    case "room:practice": {
      const uid = (ws as any).uid || (payload.uid as string) || "player";
      const nickName = (ws as any).nickName || (payload.nickName as string) || "玩家";
      const roomId = generateRoomCode(uid + "-practice-" + Date.now());

      const player = { uid, nickName, ws, readyRound: false };
      const room = createRoom(roomId, player, true);
      room.rightPlayer = createAIPlayer();
      room.rightCrickets = createAICrickets();
      room.phase = "ready";
      room.selectionStartTime = Date.now();

      send(ws, "room:created", { roomId });
      send(ws, "room:state", buildRoomState(room));
      send(ws, "room:selectionStart", { timeout: CRICKET_SELECTION_TIMEOUT });
      startSelectionTimer(roomId);
      break;
    }

    case "room:challenge": {
      handleChallenge(ws, payload).catch(err => {
        console.error("[Challenge] 处理失败:", err);
        send(ws, "room:error", { message: "挑战发起失败" });
      });
      break;
    }

    case "room:matchmake": {
      const uid = (ws as any).uid || payload.uid as string;
      const nickName = (ws as any).nickName || (payload.nickName as string) || "玩家";
      if (!uid) { send(ws, "room:error", { message: "缺少用户ID" }); return; }

      console.log(`[匹配] 玩家 ${uid}(${nickName}) 请求匹配, 队列现有 ${getMatchQueueLength()} 人`);
      const room = enqueueMatch({ ws, uid, nickName, joinTime: Date.now() });
      if (room) {
        console.log(`[匹配] 配对成功! 房间 ${room.roomId}: ${room.leftPlayer?.uid} vs ${room.rightPlayer?.uid}`);
        if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) {
          send(room.leftPlayer.ws, "room:matched", { roomId: room.roomId });
          send(room.leftPlayer.ws, "room:state", buildRoomState(room));
          send(room.leftPlayer.ws, "room:selectionStart", { timeout: CRICKET_SELECTION_TIMEOUT });
        }
        if (room.rightPlayer?.ws?.readyState === WebSocket.OPEN) {
          send(room.rightPlayer.ws, "room:matched", { roomId: room.roomId });
          send(room.rightPlayer.ws, "room:state", buildRoomState(room));
          send(room.rightPlayer.ws, "room:selectionStart", { timeout: CRICKET_SELECTION_TIMEOUT });
        }
        startSelectionTimer(room.roomId);
      } else {
        console.log(`[匹配] 玩家 ${uid} 进入等待队列, 当前队列 ${getMatchQueueLength()} 人`);
        send(ws, "room:matchmake.waiting", { position: getMatchQueueLength() });
      }
      break;
    }

    case "room:matchmake.cancel": {
      const cancelUid = (ws as any).uid || payload.uid as string;
      if (cancelUid) dequeueMatch(cancelUid);
      send(ws, "room:matchmake.cancelled", {});
      break;
    }

    case "battle:ready": {
      const cricketIds = payload.cricketIds as number[];
      const cricketStats = payload.cricketStats as Array<{
        templateId: number; name: string; title: string; tier: string; trait: string;
        attack: number; defense: number; speed: number; maxHp: number; maxStamina: number; spiritBase: number;
      }> | undefined;
      const roomId = payload.roomId as string;
      const uid = (ws as any).uid || payload.uid as string;

      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }

      if (!validateCricketCount(cricketIds)) { send(ws, "room:error", { message: "需要至少3只蛐蛐才能参战" }); return; }

      const isLeft = room.leftPlayer?.uid === uid;
      const isRight = room.rightPlayer?.uid === uid;

      if (!isLeft && !isRight) { send(ws, "room:error", { message: "你不在这个房间中" }); return; }

      const crickets = cricketStats && cricketStats.length === cricketIds.length
        ? resolveCricketsWithStats(cricketStats)
        : resolveCrickets(cricketIds);
      if (!crickets) { send(ws, "room:error", { message: "蛐蛐ID无效" }); return; }

      if (isLeft && room.leftPlayer) {
        room.leftPlayer.ws = ws;
        room.leftPlayer.readyRound = true;
        room.leftPlayer.cricketIds = cricketIds;
        setCrickets(room, "left", crickets);
      }
      if (isRight && room.rightPlayer) {
        room.rightPlayer.ws = ws;
        room.rightPlayer.readyRound = true;
        room.rightPlayer.cricketIds = cricketIds;
        setCrickets(room, "right", crickets);
      }

      if (room.leftPlayer?.readyRound && room.rightPlayer?.readyRound) {
        clearSelectionTimer(roomId);
        if (startBattle(room)) {
          broadcastBattleData(room);
          broadcast(roomId, "room:state", buildRoomState(room));
          if (room.isPractice) {
            // 延迟开始第一回合，让客户端先收到 battle:data 渲染满血状态
            room.actionTimer = setTimeout(() => startPracticeLoop(roomId), 1500);
          } else {
            startActionTimer(roomId);
          }
          return;
        }
      }

      broadcast(roomId, "room:state", buildRoomState(room));
      break;
    }

    case "battle:action": {
      const action = payload.action as string;
      const roomId = payload.roomId as string;

      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }

      // 练习模式由服务端自动出招，忽略客户端动作
      if (room.isPractice) return;

      if (room.phase !== "battling") return;

      const validActions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
      if (!validActions.includes(action as Action)) { send(ws, "room:error", { message: "无效动作" }); return; }

      const uid = (ws as any).uid || payload.uid as string;
      const isLeft = room.leftPlayer?.uid === uid;
      const isRight = room.rightPlayer?.uid === uid;
      if (!isLeft && !isRight) { send(ws, "room:error", { message: "你不在这个房间中" }); return; }

      if (isLeft) setAction(room, "left", action);
      else setAction(room, "right", action);

      if (room.isPractice && room.leftAction) {
        const actions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
        setAction(room, "right", actions[Math.floor(Math.random() * 4)]);
      }

      if (bothActionsReady(room)) handleRoundSettlement(roomId);
      break;
    }

    case "battle:nextRound": {
      const roomId = payload.roomId as string;
      const uid = (ws as any).uid || payload.uid as string;
      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }

      // 练习模式由服务端自动推进，忽略客户端请求
      if (room.isPractice) return;

      if (room.phase !== "roundEnd") { send(ws, "room:error", { message: "当前不在局间阶段" }); return; }

      const isLeft = room.leftPlayer?.uid === uid;
      const isRight = room.rightPlayer?.uid === uid;

      if (isLeft) { room.leftPlayer!.ws = ws; room.leftPlayer!.readyRound = true; }
      if (isRight) { room.rightPlayer!.ws = ws; room.rightPlayer!.readyRound = true; }
      if (room.isPractice) room.rightPlayer!.readyRound = true;

      if (room.leftPlayer?.readyRound && room.rightPlayer?.readyRound) {
        if (nextRound(room, room.lastDefeatedSide)) {
          broadcast(roomId, "room:state", buildRoomState(room));
          broadcastCricketChange(room);
          startActionTimer(roomId);
        } else {
          finishRoom(room);
          const gameOverPerspective = (isLeft: boolean) => ({
            winner: room.leftScore >= 2 ? (isLeft ? "me" : "enemy") : (isLeft ? "enemy" : "me"),
            myScore: isLeft ? room.leftScore : room.rightScore,
            enemyScore: isLeft ? room.rightScore : room.leftScore,
          });
          if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) send(room.leftPlayer.ws, "battle:gameOver", gameOverPerspective(true));
          if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) send(room.rightPlayer.ws, "battle:gameOver", gameOverPerspective(false));
          scheduleCleanup(roomId);
        }
      }
      break;
    }

    case "battle:rematch": {
      const roomId = payload.roomId as string;
      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }
      if (!room.isPractice) { send(ws, "room:error", { message: "仅训练模式支持" }); return; }
      if (room.phase !== "finished") { send(ws, "room:error", { message: "当前不在结算阶段" }); return; }

      // 取消待清理定时器，防止中途删房间
      cancelScheduledCleanup(roomId);

      // 重置战斗并直接开始
      clearActionTimer(roomId);
      resetBattleForRematch(room);

      // 通知玩家新战斗开始
      const uid = (ws as any).uid || payload.uid as string;
      broadcast(roomId, "room:state", buildRoomState(room));
      broadcastBattleData(room);
      startPracticeLoop(roomId);
      break;
    }

    case "room:leave": {
      const roomId = payload.roomId as string;
      const room = getRoom(roomId);
      if (!room) return;
      const leaverUid = (ws as any).uid || payload.uid as string;
      finishRoom(room);
      const gameOverPerspective = (isLeft: boolean) => ({
        winner: leaverUid === (isLeft ? room.leftPlayer?.uid : room.rightPlayer?.uid) ? "enemy" : "me",
        myScore: isLeft ? room.leftScore : room.rightScore,
        enemyScore: isLeft ? room.rightScore : room.leftScore,
        reason: "opponent_left",
      });
      if (room.leftPlayer?.ws?.readyState === WebSocket.OPEN) send(room.leftPlayer.ws, "battle:gameOver", gameOverPerspective(true));
      if (room.rightPlayer?.ws && !room.isPractice && room.rightPlayer.ws.readyState === WebSocket.OPEN) send(room.rightPlayer.ws, "battle:gameOver", gameOverPerspective(false));
      scheduleCleanup(roomId);
      break;
    }

    default:
      send(ws, "room:error", { message: `未知消息类型: ${type}` });
  }
}

export function handleClose(ws: WebSocket): void {
  // 从匹配队列中移除该连接
  dequeueMatchByWs(ws);
  const uid = (ws as any).uid;
  if (uid) {
    console.log(`[WS] 玩家 ${uid} 断开连接, 已从匹配队列移除`);
  }

  for (const [roomId, room] of getAllRooms()) {
    if (room.leftPlayer?.ws === ws || room.rightPlayer?.ws === ws) {
      if (room.phase === "finished") {
        scheduleCleanup(roomId);
        break;
      }

      if (room.phase === "battling" || room.phase === "roundEnd" || room.phase === "ready") {
        if (room.leftPlayer?.ws === ws) room.leftPlayer.ws = null as unknown as WebSocket;
        if (room.rightPlayer?.ws === ws) room.rightPlayer.ws = null as unknown as WebSocket;
        setTimeout(() => {
          const r = getRoom(roomId);
          if (!r) return;
          // PVE模式AI无真实ws，只检查真人玩家
          if (!r.leftPlayer?.ws || (!r.isPractice && r.rightPlayer && !r.rightPlayer?.ws)) {
            finishRoom(r);
            scheduleCleanup(roomId);
          }
        }, 10000);
        break;
      }

      if (room.leftPlayer?.ws === ws) room.leftPlayer.ws = null as unknown as WebSocket;
      if (room.rightPlayer?.ws === ws) room.rightPlayer.ws = null as unknown as WebSocket;
      setTimeout(() => {
        const r = getRoom(roomId);
        if (!r) return;
        // PVE模式AI无真实ws，只检查真人玩家
        if (!r.leftPlayer?.ws || (!r.isPractice && r.rightPlayer && !r.rightPlayer?.ws)) {
          finishRoom(r);
          scheduleCleanup(roomId);
        }
      }, 30000);
      break;
    }
  }
}