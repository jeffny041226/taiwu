export type Action = "heavy_strike" | "feint" | "block" | "chirp";
export type RoomPhase = "waiting" | "ready" | "battling" | "roundEnd" | "finished";

export interface Player {
  uid: string;
  nickName: string;
  avatar?: string;
}

export interface RoomState {
  roomId: string;
  phase: RoomPhase;
  leftPlayer: Player | null;
  rightPlayer: Player | null;
  currentLeftCricket: number;
  currentRightCricket: number;
}

export interface CricketBattleState {
  id: number;
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

export interface RoundResult {
  leftAction: Action;
  rightAction: Action;
  leftHpDelta: number;
  rightHpDelta: number;
  leftDefeated: boolean;
  rightDefeated: boolean;
  leftScore: number;
  rightScore: number;
}

export interface GameOverResult {
  winner: "left" | "right";
  leftScore: number;
  rightScore: number;
}
