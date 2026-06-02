/** 出战所需最少蛐蛐数量 */
export const MIN_CRICKETS_TO_BATTLE = 3;

/** 房间号字符集 (排除 0O1I 等易混淆字符) */
export const ROOM_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 5;

/** 动作耐力消耗 */
export const ACTION_STAMINA_COST = {
  heavy_strike: 12,
  feint: 8,
  block: 5,
  chirp: 3,
} as const;

/** 格挡减伤率 */
export const BLOCK_REDUCTION = {
  vs_heavy_strike: 0.6,
  vs_feint: 0.4,
} as const;

/** 克制伤害倍率 */
export const COUNTER_MULTIPLIER = {
  heavy_strike_vs_chirp: 1.2,
  heavy_strike_vs_feint: 1.1,
  feint_vs_block: 1.5,
  feint_vs_chirp: 1.15,
} as const;

/** 伤害上限 (占目标最大HP比例) */
export const DAMAGE_CAP = {
  heavy_strike: 0.35,
  feint: 0.3,
} as const;

/** 怯场触发阈值 (斗性差) */
export const SPIRIT_FEAR_THRESHOLD = 10;

/** 怯场额外伤害加成 */
export const SPIRIT_FEAR_DAMAGE_BONUS = 0.1;

/** 局间自动准备延迟 (ms) */
export const AUTO_READY_DELAY = 2500;

/** WebSocket 心跳间隔 (ms) */
export const WS_HEARTBEAT_INTERVAL = 20000;

/** WebSocket ping 超时 (ms) */
export const WS_PING_TIMEOUT = 10000;

/** 断线/结算后房间清理延迟 (ms) — 给玩家充足时间点重开 */
export const ROOM_CLEANUP_DELAY = 30000;

/** 动作选择超时 (ms，超时随机出招) */
export const ACTION_TIMEOUT = 30000;

/** 选蛐蛐倒计时 (秒) */
export const CRICKET_SELECTION_TIMEOUT = 30;

/** 品质颜色映射 */
export const TIER_COLORS = {
  common:    { text: "#a0a0a0", bg: "rgba(160,160,160,0.15)" },
  rare:      { text: "#4a90d9", bg: "rgba(74,144,217,0.15)" },
  epic:      { text: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  legendary: { text: "#c5a059", bg: "rgba(197,160,89,0.15)" },
} as const;

/** 特性名称映射 */
export const TRAIT_LABELS: Record<string, string> = {
  fierce: "凶猛",
  swift: "迅捷",
  cunning: "狡黠",
  steadfast: "坚韧",
  tenacious: "顽强",
  resonant: "共鸣",
} as const;

/** 品质名称映射 */
export const TIER_LABELS: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
} as const;

/** 特性效果 */
export const TRAIT_EFFECTS = {
  fierce: {
    label: "凶猛",
    description: "攻击力×1.15",
    attackMultiplier: 1.15,
  },
  swift: {
    label: "迅捷",
    description: "速度×1.2",
    speedMultiplier: 1.2,
  },
  cunning: {
    label: "狡黠",
    description: "虚晃伤害×1.2",
    feintMultiplier: 1.2,
  },
  steadfast: {
    label: "坚韧",
    description: "格挡减伤额外+20%",
    blockBonus: 0.2,
  },
  tenacious: {
    label: "顽强",
    description: "HP低于30%时防御×1.3",
    lowHpDefenseMultiplier: 1.3,
  },
  resonant: {
    label: "共鸣",
    description: "鸣叫斗性获取×1.5",
    chirpSpiritMultiplier: 1.5,
  },
} as const;

/** 对战模式 */
export type BattleMode = "best_of_3" | "tag_team";

/** 全局对战模式配置 — 可通过环境变量 BATTLE_MODE 覆盖 */
const _envMode = typeof process !== "undefined" ? process.env?.BATTLE_MODE : undefined;
export const BATTLE_MODE: BattleMode = (_envMode === "best_of_3" || _envMode === "tag_team") ? _envMode : "tag_team";

/** 对战模式中文标签 */
export const BATTLE_MODE_LABELS: Record<BattleMode, string> = {
  best_of_3: "三局两胜",
  tag_team: "车轮战",
};

/** 伤害倍率 */
export const DAMAGE_MULTIPLIER = 2;