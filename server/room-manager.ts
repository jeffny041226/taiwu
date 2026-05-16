import type { Room, Player, RoomPhase, BattleCricket } from "./types";
import { WebSocket } from "ws";
import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH } from "../src/config/game";
import { ROOM_CLEANUP_DELAY } from "../src/config/game";

/** 生成房间号 */
export function generateRoomCode(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) & 0xffffffff;
  }
  hash = Math.abs(hash);

  const base = ROOM_CODE_CHARSET.length;
  let code = "";
  let remaining = hash;
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code = ROOM_CODE_CHARSET[remaining % base] + code;
    remaining = Math.floor(remaining / base);
  }
  return code;
}

/** 校验房间号 */
export function validateRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  for (const char of code) {
    if (!ROOM_CODE_CHARSET.includes(char)) return false;
  }
  return true;
}

/** 房间存储 */
const rooms = new Map<string, Room>();

/** 清理计时器映射 */
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getAllRooms(): Map<string, Room> {
  return rooms;
}

/** 创建房间 */
export function createRoom(roomId: string, player: Player, isPractice = false): Room {
  const room: Room = {
    roomId,
    phase: "waiting",
    leftPlayer: player,
    rightPlayer: null,
    isPractice,
    leftCrickets: [],
    rightCrickets: [],
    currentLeftIndex: 0,
    currentRightIndex: 0,
    leftScore: 0,
    rightScore: 0,
    leftAction: null,
    rightAction: null,
    actionTimer: null,
    selectionTimer: null,
    selectionStartTime: 0,
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

/** 加入房间 */
export function joinRoom(roomId: string, player: Player): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (room.phase !== "waiting") return null;
  if (room.rightPlayer) return null; // 已满

  room.rightPlayer = player;
  room.phase = "ready";
  return room;
}

/** 设置出战蛐蛐 */
export function setCrickets(
  room: Room,
  side: "left" | "right",
  crickets: BattleCricket[]
): void {
  if (side === "left") {
    room.leftCrickets = crickets;
  } else {
    room.rightCrickets = crickets;
  }
}

/** 双方准备好后开始战斗 */
export function startBattle(room: Room): boolean {
  if (room.phase !== "ready") return false;
  if (room.leftCrickets.length < 3 || room.rightCrickets.length < 3) return false;

  room.phase = "battling";
  room.currentLeftIndex = 0;
  room.currentRightIndex = 0;
  room.leftScore = 0;
  room.rightScore = 0;
  room.leftAction = null;
  room.rightAction = null;
  return true;
}

/** 进入局间 */
export function roundEnd(room: Room): void {
  room.phase = "roundEnd";
  room.leftAction = null;
  room.rightAction = null;
}

/** 下一局 */
export function nextRound(room: Room): boolean {
  if (room.phase !== "roundEnd") return false;

  room.currentLeftIndex++;
  room.currentRightIndex++;
  room.phase = "battling";
  room.leftAction = null;
  room.rightAction = null;

  // 检查是否有败阵蛐蛐需要替换
  if (room.currentLeftIndex >= 3 || room.currentRightIndex >= 3) {
    room.phase = "finished";
    return false;
  }
  return true;
}

/** 设置玩家动作 */
export function setAction(room: Room, side: "left" | "right", action: string): void {
  if (room.phase !== "battling") return;
  if (side === "left") {
    room.leftAction = action as Room["leftAction"];
  } else {
    room.rightAction = action as Room["rightAction"];
  }
}

/** 双方是否都已出招 */
export function bothActionsReady(room: Room): boolean {
  return room.leftAction !== null && room.rightAction !== null;
}

/** 添加局得分 */
export function addScore(room: Room, side: "left" | "right"): void {
  if (side === "left") room.leftScore++;
  else room.rightScore++;
}

/** 检查整场是否结束 */
export function isGameOver(room: Room): boolean {
  return room.leftScore >= 2 || room.rightScore >= 2;
}

/** 结束房间 */
export function finishRoom(room: Room): void {
  room.phase = "finished";
  if (room.actionTimer) {
    clearTimeout(room.actionTimer);
    room.actionTimer = null;
  }
  if (room.selectionTimer) {
    clearTimeout(room.selectionTimer);
    room.selectionTimer = null;
  }
}

/** 清除选蛐蛐倒计时 */
export function clearSelectionTimer(roomId: string): void {
  const room = getRoom(roomId);
  if (room?.selectionTimer) {
    clearTimeout(room.selectionTimer);
    room.selectionTimer = null;
  }
}

// ── 匹配队列 ──

export interface MatchEntry {
  ws: WebSocket;
  uid: string;
  nickName: string;
  joinTime: number;
}

const matchmakingQueue: MatchEntry[] = [];

/** 入队匹配。返回房间表示配对成功，否则已入队等待 */
export function enqueueMatch(entry: MatchEntry): Room | null {
  // 检查队列中是否有等待者
  const idx = matchmakingQueue.findIndex(e => e.uid !== entry.uid);
  if (idx !== -1) {
    const other = matchmakingQueue.splice(idx, 1)[0];
    const roomId = generateRoomCode(entry.uid + "-" + other.uid + "-" + Date.now());

    const leftPlayer: Player = { uid: other.uid, nickName: other.nickName, ws: other.ws, readyRound: false };
    const rightPlayer: Player = { uid: entry.uid, nickName: entry.nickName, ws: entry.ws, readyRound: false };

    const room: Room = {
      roomId,
      phase: "ready",
      leftPlayer,
      rightPlayer,
      isPractice: false,
      leftCrickets: [],
      rightCrickets: [],
      currentLeftIndex: 0,
      currentRightIndex: 0,
      leftScore: 0,
      rightScore: 0,
      leftAction: null,
      rightAction: null,
      actionTimer: null,
      selectionTimer: null,
      selectionStartTime: Date.now(),
      createdAt: Date.now(),
    };
    rooms.set(roomId, room);
    return room;
  }

  // 无匹配 — 入队
  matchmakingQueue.push(entry);
  return null;
}

/** 从匹配队列中移除 */
export function dequeueMatch(uid: string): void {
  const idx = matchmakingQueue.findIndex(e => e.uid === uid);
  if (idx !== -1) matchmakingQueue.splice(idx, 1);
}

/** 获取匹配队列长度 */
export function getMatchQueueLength(): number {
  return matchmakingQueue.length;
}

/** 调度清理房间 */
export function scheduleCleanup(roomId: string): void {
  const existing = cleanupTimers.get(roomId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    rooms.delete(roomId);
    cleanupTimers.delete(roomId);
  }, ROOM_CLEANUP_DELAY);
  cleanupTimers.set(roomId, timer);
}
