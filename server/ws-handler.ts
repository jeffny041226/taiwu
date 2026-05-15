import { WebSocket } from "ws";
import type { Action } from "./types";
import {
  getRoom, getAllRooms, createRoom, joinRoom, setCrickets, startBattle,
  roundEnd, nextRound, setAction, bothActionsReady,
  addScore, finishRoom, scheduleCleanup, validateRoomCode, generateRoomCode,
} from "./room-manager";
import {
  resolveRound, validateCricketCount,
} from "./battle-resolver";
import { aiChooseAction, createAIPlayer, createAICrickets } from "./ai-opponent";
import type { CricketBattleState } from "../src/lib/battle-calc";
import { ACTION_TIMEOUT } from "../src/config/game";

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
  if (room.leftPlayer) send(room.leftPlayer.ws, type, payload);
  if (room.rightPlayer && !room.isPractice) {
    send(room.rightPlayer.ws, type, payload);
  }
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

  const { roundResult, roundWin, gameOver } = resolveRound(room);

  broadcast(roomId, "battle:roundResult", roundResult);

  if (gameOver) {
    finishRoom(room);
    broadcast(roomId, "battle:gameOver", gameOver);
    scheduleCleanup(roomId);
    return;
  }

  if (roundWin) {
    roundEnd(room);
    broadcast(roomId, "battle:roundWin", roundWin);
    setTimeout(() => {
      const r = getRoom(roomId);
      if (!r || r.phase !== "roundEnd") return;
      if (r.isPractice && r.rightPlayer) {
        r.rightPlayer.readyRound = true;
      }
      if (r.leftPlayer?.readyRound && r.rightPlayer?.readyRound) {
        if (nextRound(r)) {
          broadcast(roomId, "room:state", buildRoomState(r));
          startActionTimer(roomId);
        }
      }
    }, 2500);
  } else {
    room.leftAction = null;
    room.rightAction = null;
    startActionTimer(roomId);
  }
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
      if (r.isPractice) {
        const aiCricket = r.rightCrickets[r.currentRightIndex];
        const playerCricket = r.leftCrickets[r.currentLeftIndex];
        r.rightAction = aiChooseAction(aiCricket, r.leftAction, playerCricket);
      } else {
        r.rightAction = allActions[Math.floor(Math.random() * 4)];
      }
    }
    handleRoundSettlement(roomId);
  }, ACTION_TIMEOUT);
}

function buildRoomState(room: NonNullable<ReturnType<typeof getRoom>>) {
  return {
    roomId: room.roomId,
    phase: room.phase,
    leftPlayer: room.leftPlayer ? { uid: room.leftPlayer.uid, nickName: room.leftPlayer.nickName, avatar: room.leftPlayer.avatar } : null,
    rightPlayer: room.rightPlayer ? { uid: room.rightPlayer.uid, nickName: room.rightPlayer.nickName, avatar: room.rightPlayer.avatar } : null,
    currentLeftCricket: room.currentLeftIndex,
    currentRightCricket: room.currentRightIndex,
    leftScore: room.leftScore,
    rightScore: room.rightScore,
  };
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

  switch (type) {
    case "ping":
      send(ws, "pong", {});
      break;

    case "room:create": {
      const uid = payload.uid as string;
      const nickName = (payload.nickName as string) || "玩家";
      if (!uid) { send(ws, "room:error", { message: "缺少用户ID" }); return; }

      const roomId = generateRoomCode(uid);
      const existing = getRoom(roomId);
      if (existing) {
        finishRoom(existing);
        scheduleCleanup(roomId);
      }

      const player = { uid, nickName, ws, readyRound: false };
      createRoom(roomId, player);
      send(ws, "room:created", { roomId });
      broadcast(roomId, "room:state", buildRoomState(getRoom(roomId)!));
      break;
    }

    case "room:join": {
      const roomId = (payload.roomId as string)?.toUpperCase();
      const uid = payload.uid as string;
      const nickName = (payload.nickName as string) || "玩家";

      if (!roomId || !validateRoomCode(roomId)) {
        send(ws, "room:error", { message: "房间号格式不正确" });
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        send(ws, "room:error", { message: "房间不存在" });
        return;
      }

      // 房主返回房间页: 只更新 WS 引用，不重复加入
      if (room.leftPlayer?.uid === uid) {
        room.leftPlayer.ws = ws;
        send(ws, "room:state", buildRoomState(room));
        return;
      }

      // 新玩家加入
      if (room.phase !== "waiting" || room.rightPlayer) {
        send(ws, "room:error", { message: "房间已满或战斗已开始" });
        return;
      }

      const player = { uid, nickName, ws, readyRound: false };
      room.rightPlayer = player;
      room.phase = "ready";
      broadcast(roomId, "room:joined", buildRoomState(room));
      broadcast(roomId, "room:state", buildRoomState(room));
      break;
    }

    case "room:practice": {
      const uid = (payload.uid as string) || "player";
      const nickName = (payload.nickName as string) || "玩家";
      const roomId = generateRoomCode(uid + "-practice-" + Date.now());

      const player = { uid, nickName, ws, readyRound: false };
      const room = createRoom(roomId, player, true);
      room.rightPlayer = createAIPlayer();
      room.rightCrickets = createAICrickets();
      room.phase = "ready";

      send(ws, "room:created", { roomId });
      send(ws, "room:state", buildRoomState(room));
      break;
    }

    case "battle:ready": {
      const cricketIds = payload.cricketIds as number[];
      const roomId = payload.roomId as string;

      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }

      if (!validateCricketCount(cricketIds)) {
        send(ws, "room:error", { message: "需要至少3只蛐蛐才能参战" });
        return;
      }

      const isLeft = room.leftPlayer?.ws === ws;
      const isRight = room.rightPlayer?.ws === ws;

      if (!isLeft && !isRight) {
        send(ws, "room:error", { message: "你不在这个房间中" });
        return;
      }

      if (isLeft) room.leftPlayer!.readyRound = true;
      else room.rightPlayer!.readyRound = true;

      const leftReady = room.leftPlayer?.readyRound ?? false;
      const rightReady = room.rightPlayer?.readyRound ?? false;

      if (leftReady && rightReady) {
        if (startBattle(room)) {
          broadcast(roomId, "room:state", buildRoomState(room));
          startActionTimer(roomId);
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
      if (room.phase !== "battling") { send(ws, "room:error", { message: "当前不在战斗阶段" }); return; }

      const validActions: Action[] = ["heavy_strike", "feint", "block", "chirp"];
      if (!validActions.includes(action as Action)) {
        send(ws, "room:error", { message: "无效动作" });
        return;
      }

      const isLeft = room.leftPlayer?.ws === ws;
      const isRight = room.rightPlayer?.ws === ws;
      if (!isLeft && !isRight) { send(ws, "room:error", { message: "你不在这个房间中" }); return; }

      if (isLeft) setAction(room, "left", action);
      else setAction(room, "right", action);

      if (room.isPractice && room.leftAction) {
        const aiCricket = room.rightCrickets[room.currentRightIndex];
        const playerCricket = room.leftCrickets[room.currentLeftIndex];
        const aiAction = aiChooseAction(aiCricket, room.leftAction, playerCricket);
        setAction(room, "right", aiAction);
      }

      if (bothActionsReady(room)) handleRoundSettlement(roomId);
      break;
    }

    case "battle:nextRound": {
      const roomId = payload.roomId as string;
      const room = getRoom(roomId);
      if (!room) { send(ws, "room:error", { message: "房间不存在" }); return; }
      if (room.phase !== "roundEnd") { send(ws, "room:error", { message: "当前不在局间阶段" }); return; }

      const isLeft = room.leftPlayer?.ws === ws;
      const isRight = room.rightPlayer?.ws === ws;

      if (isLeft) room.leftPlayer!.readyRound = true;
      if (isRight) room.rightPlayer!.readyRound = true;
      if (room.isPractice) room.rightPlayer!.readyRound = true;

      if (room.leftPlayer?.readyRound && room.rightPlayer?.readyRound) {
        if (nextRound(room)) {
          broadcast(roomId, "room:state", buildRoomState(room));
          startActionTimer(roomId);
        } else {
          finishRoom(room);
          broadcast(roomId, "battle:gameOver", {
            winner: room.leftScore >= 2 ? "left" : "right",
            leftScore: room.leftScore,
            rightScore: room.rightScore,
          });
          scheduleCleanup(roomId);
        }
      }
      break;
    }

    case "room:leave": {
      const roomId = payload.roomId as string;
      const room = getRoom(roomId);
      if (!room) return;
      finishRoom(room);
      broadcast(roomId, "battle:gameOver", {
        winner: room.leftPlayer?.ws === ws ? "right" : "left",
        leftScore: room.leftScore,
        rightScore: room.rightScore,
        reason: "opponent_left",
      });
      scheduleCleanup(roomId);
      break;
    }

    default:
      send(ws, "room:error", { message: `未知消息类型: ${type}` });
  }
}

export function handleClose(ws: WebSocket): void {
  for (const [roomId, room] of getAllRooms()) {
    if (room.leftPlayer?.ws === ws || room.rightPlayer?.ws === ws) {
      if (room.phase !== "finished") {
        finishRoom(room);
        broadcast(roomId, "battle:gameOver", {
          winner: room.leftPlayer?.ws === ws ? "right" : "left",
          leftScore: room.leftScore,
          rightScore: room.rightScore,
          reason: "disconnected",
        });
      }
      scheduleCleanup(roomId);
      break;
    }
  }
}
