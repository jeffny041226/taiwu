import type { WebSocket } from "ws";
import type { Action, RoomPhase } from "@taiwu/shared/types/battle";
import type { BattleMode } from "@taiwu/shared/config/game";

export type { Action, RoomPhase, BattleMode };

/** 玩家信息 (服务端版，含 ws 引用) */
export interface Player {
  uid: string;
  nickName: string;
  avatar?: string;
  ws: WebSocket | null;
  cricketIds?: number[];
  readyRound: boolean;
}

/** 蛐蛐战斗数据 */
export interface BattleCricket {
  id: number;
  templateId: number;
  name: string;
  title: string;
  tier: string;
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  hp: number;
  maxStamina: number;
  stamina: number;
  spirit: number;
  trait: string;
}

/** 房间 */
export interface Room {
  roomId: string;
  phase: RoomPhase;
  leftPlayer: Player | null;
  rightPlayer: Player | null;
  isPractice: boolean;
  leftCrickets: BattleCricket[];
  rightCrickets: BattleCricket[];
  currentLeftIndex: number;
  currentRightIndex: number;
  leftScore: number;
  rightScore: number;
  leftAction: Action | null;
  rightAction: Action | null;
  actionTimer: ReturnType<typeof setTimeout> | null;
  selectionTimer: ReturnType<typeof setTimeout> | null;
  selectionStartTime: number;
  createdAt: number;
  battleMode: BattleMode;
  lastDefeatedSide: "left" | "right" | "both" | null;
}