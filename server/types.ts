import type { WebSocket } from "ws";

/** 动作类型 */
export type Action = "heavy_strike" | "feint" | "block" | "chirp";

/** 房间阶段 */
export type RoomPhase = "waiting" | "ready" | "battling" | "roundEnd" | "finished";

/** 玩家信息 */
export interface Player {
  uid: string;
  nickName: string;
  avatar?: string;
  ws: WebSocket;
  cricketIds?: number[]; // 出战的3只蛐蛐ID
  readyRound: boolean;   // 局间准备状态
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
  leftPlayer: Player | null;   // 房主
  rightPlayer: Player | null;  // 对手 / AI
  isPractice: boolean;
  // 出战蛐蛐
  leftCrickets: BattleCricket[];
  rightCrickets: BattleCricket[];
  currentLeftIndex: number;
  currentRightIndex: number;
  // 局比分 (三局两胜)
  leftScore: number;
  rightScore: number;
  // 当前回合动作
  leftAction: Action | null;
  rightAction: Action | null;
  // 超时计时器
  actionTimer: ReturnType<typeof setTimeout> | null;
  // 创建时间 (清理用)
  createdAt: number;
}

/** 动作克制关系表 */
export const COUNTER_MAP: Record<Action, Action> = {
  heavy_strike: "chirp",   // 猛击 克 鸣叫
  feint: "block",          // 虚晃 克 格挡
  block: "heavy_strike",   // 格挡 克 猛击
  chirp: "feint",          // 鸣叫 克 虚晃
} as const;
