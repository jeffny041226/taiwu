import type { Action, RoomState, RoundResult, GameOverResult } from "./battle";

// --- Client → Server ---

export interface RoomCreateMessage {
  type: "room:create";
  payload: Record<string, never>;
}

export interface RoomJoinMessage {
  type: "room:join";
  payload: { roomId: string };
}

export interface RoomPracticeMessage {
  type: "room:practice";
  payload: Record<string, never>;
}

export interface RoomMatchmakeMessage {
  type: "room:matchmake";
  payload: { uid: string; nickName: string };
}

export interface RoomMatchmakeCancelMessage {
  type: "room:matchmake.cancel";
  payload: { uid: string };
}

export interface BattleReadyMessage {
  type: "battle:ready";
  payload: { cricketIds: number[] };
}

export interface BattleActionMessage {
  type: "battle:action";
  payload: { action: Action };
}

export type ClientMessage =
  | RoomCreateMessage
  | RoomJoinMessage
  | RoomPracticeMessage
  | RoomMatchmakeMessage
  | RoomMatchmakeCancelMessage
  | BattleReadyMessage
  | BattleActionMessage
  | { type: "ping"; payload: unknown };

// --- Server → Client ---

export interface RoomCreatedMessage {
  type: "room:created";
  payload: { roomId: string };
}

export interface RoomJoinedMessage {
  type: "room:joined";
  payload: RoomState;
}

export interface RoomStateMessage {
  type: "room:state";
  payload: RoomState;
}

export interface RoomErrorMessage {
  type: "room:error";
  payload: { message: string };
}

export interface RoomMatchmakeWaitingMessage {
  type: "room:matchmake.waiting";
  payload: { position: number };
}

export interface RoomMatchedMessage {
  type: "room:matched";
  payload: { roomId: string };
}

export interface RoomMatchmakeTimeoutMessage {
  type: "room:matchmake.timeout";
  payload: Record<string, never>;
}

export interface RoomMatchmakeCancelledMessage {
  type: "room:matchmake.cancelled";
  payload: Record<string, never>;
}

export interface BattleRoundResultMessage {
  type: "battle:roundResult";
  payload: RoundResult;
}

export interface BattleRoundWinMessage {
  type: "battle:roundWin";
  payload: { winner: "left" | "right"; roundScore: { left: number; right: number } };
}

export interface BattleGameOverMessage {
  type: "battle:gameOver";
  payload: GameOverResult;
}

export type ServerMessage =
  | RoomCreatedMessage
  | RoomJoinedMessage
  | RoomStateMessage
  | RoomErrorMessage
  | RoomMatchmakeWaitingMessage
  | RoomMatchedMessage
  | RoomMatchmakeTimeoutMessage
  | RoomMatchmakeCancelledMessage
  | BattleRoundResultMessage
  | BattleRoundWinMessage
  | BattleGameOverMessage
  | { type: "pong"; payload: unknown };
