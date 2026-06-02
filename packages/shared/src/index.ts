// Types
export type { Tier, Trait, CricketTemplate, UserCricket } from "./types/cricket";
export type { Action, RoomPhase, Player, RoomState, CricketBattleState, RoundResult, GameOverResult } from "./types/battle";
export type {
  ClientMessage, ServerMessage,
  RoomCreateMessage, RoomJoinMessage, RoomPracticeMessage,
  RoomMatchmakeMessage, RoomMatchmakeCancelMessage,
  BattleReadyMessage, BattleActionMessage,
  RoomCreatedMessage, RoomJoinedMessage, RoomStateMessage, RoomErrorMessage,
  RoomMatchmakeWaitingMessage, RoomMatchedMessage,
  RoomMatchmakeTimeoutMessage, RoomMatchmakeCancelledMessage,
  BattleRoundResultMessage, BattleRoundWinMessage, BattleGameOverMessage,
} from "./types/ws-message";

// Config
export {
  MIN_CRICKETS_TO_BATTLE, ROOM_CODE_CHARSET, ROOM_CODE_LENGTH,
  ACTION_STAMINA_COST, BLOCK_REDUCTION, COUNTER_MULTIPLIER,
  DAMAGE_CAP, SPIRIT_FEAR_THRESHOLD, SPIRIT_FEAR_DAMAGE_BONUS,
  AUTO_READY_DELAY, WS_HEARTBEAT_INTERVAL, WS_PING_TIMEOUT,
  ROOM_CLEANUP_DELAY, ACTION_TIMEOUT, CRICKET_SELECTION_TIMEOUT,
  TIER_COLORS, TRAIT_LABELS, TIER_LABELS, TRAIT_EFFECTS,
  BATTLE_MODE, BATTLE_MODE_LABELS,
} from "./config/game";
export type { BattleMode } from "./config/game";

// Lib
export { calcRoundResult, getEffectiveStat } from "./lib/battle-calc";
export type { ActionResult, BattleCalcInput } from "./lib/battle-calc";
export { pullOne, pullMultiple, simulateDistribution } from "./lib/gacha-engine";
export type { GachaItem } from "./lib/gacha-engine";
export { generateRoomCode, validateRoomCode } from "./lib/room-code";
export { getTierLabel, getTierColor, getTraitLabel, getTraitDescription, formatRange, formatTierRangeStats } from "./lib/cricket-utils";

// Data
export { CRICKET_TEMPLATES, getCricketThumb } from "./data/cricket-templates";