import {
  COUNTER_MULTIPLIER,
  BLOCK_REDUCTION,
  DAMAGE_CAP,
  SPIRIT_FEAR_THRESHOLD,
  SPIRIT_FEAR_DAMAGE_BONUS,
  TRAIT_EFFECTS,
  DAMAGE_MULTIPLIER,
} from "../config/game";
import type { Action } from "../types/battle";

export type { Action };

/** 战斗计算所需的最小输入（运算只用到这些字段） */
export interface BattleCalcInput {
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  hp: number;
  stamina: number;
  spirit: number;
  trait: string;
}

/** 仍保留 CricketBattleState 的导出，从 types/battle.ts */
export type { CricketBattleState } from "../types/battle";

export interface ActionResult {
  damage: number;
  staminaDelta: number;
  spiritDelta: number;
  isBlocked: boolean;
  isCrit: boolean;
  counterApplied: number;
}

/**
 * 判定一方是否使用格挡
 */
function isBlocking(action: Action): boolean {
  return action === "block";
}

/**
 * 判定一方是否使用鸣叫
 */
function isChirping(action: Action): boolean {
  return action === "chirp";
}

/**
 * 获取克制倍率
 */
function getCounterMultiplier(myAction: Action, opAction: Action): number {
  // 鸣叫时不产生普通攻击，不触发克制倍率
  if (isChirping(myAction)) return 1.0;

  // 对手格挡时
  if (isBlocking(opAction)) {
    if (myAction === "feint") {
      return COUNTER_MULTIPLIER.feint_vs_block;
    }
    return 1.0;
  }

  // 对手鸣叫时
  if (isChirping(opAction)) {
    if (myAction === "heavy_strike") {
      return COUNTER_MULTIPLIER.heavy_strike_vs_chirp;
    }
    return COUNTER_MULTIPLIER.feint_vs_chirp;
  }

  // 猛击 vs 虚晃
  if (myAction === "heavy_strike" && opAction === "feint") {
    return COUNTER_MULTIPLIER.heavy_strike_vs_feint;
  }

  return 1.0;
}

/**
 * 计算基础伤害（未含克制、斗性等修正）
 */
function calcBaseDamage(
  attacker: BattleCalcInput,
  action: Action
): number {
  if (isBlocking(action) || isChirping(action)) return 0;

  const atk = attacker.attack;
  const def = attacker.defense; // 使用攻击方属性，实际对战中防御来自防守方
  const randomFactor = Math.random() * 3;

  if (action === "heavy_strike") {
    return Math.max(atk * 1.6 - def * 0.6 + randomFactor - 2, 1);
  }

  // feint
  return Math.max(atk * 1.0 - def * 0.3 + randomFactor, 1);
}

/**
 * 应用特性加成
 */
function applyTrait(
  attacker: BattleCalcInput,
  defender: BattleCalcInput,
  damage: number,
  myAction: Action
): number {
  let result = damage;

  // 攻击方特性
  const attackerTrait = TRAIT_EFFECTS[attacker.trait as keyof typeof TRAIT_EFFECTS];
  if (attackerTrait) {
    if ("feintMultiplier" in attackerTrait && myAction === "feint") {
      result *= attackerTrait.feintMultiplier;
    }
  }

  // 防御方特性
  const defenderTrait = TRAIT_EFFECTS[defender.trait as keyof typeof TRAIT_EFFECTS];
  if (defenderTrait) {
    if ("lowHpDefenseMultiplier" in defenderTrait && defender.hp / defender.maxHp < 0.3) {
      result *= 1 / defenderTrait.lowHpDefenseMultiplier; // 伤害降低
    }
  }

  return result;
}

/**
 * 计算完整回合结果
 */
export function calcRoundResult(
  attacker: BattleCalcInput,
  defender: BattleCalcInput,
  attackerAction: Action,
  defenderAction: Action
): { attackerResult: ActionResult; defenderResult: ActionResult } {
  // --- 攻击方对防御方造成伤害 ---
  let attackerDamage = calcBaseDamage(attacker, attackerAction);

  if (attackerDamage > 0) {
    // 克制修正
    const counter = getCounterMultiplier(attackerAction, defenderAction);
    attackerDamage *= counter;

    // 特性修正
    attackerDamage = applyTrait(attacker, defender, attackerDamage, attackerAction);

    // 对手格挡减伤
    if (isBlocking(defenderAction)) {
      const reduction =
        attackerAction === "heavy_strike"
          ? BLOCK_REDUCTION.vs_heavy_strike
          : BLOCK_REDUCTION.vs_feint;
      attackerDamage *= 1 - reduction;

      // 坚韧特性额外减伤
      const defenderTrait = TRAIT_EFFECTS[defender.trait as keyof typeof TRAIT_EFFECTS];
      if (defenderTrait && "blockBonus" in defenderTrait) {
        attackerDamage *= 1 - defenderTrait.blockBonus;
      }
    }

    // 斗性加成
    const spiritAdvantage =
      ((attacker.spirit - defender.spirit) / 200) * 0.5;
    attackerDamage += attackerDamage * spiritAdvantage;

    // 怯场效果
    if (attacker.spirit - defender.spirit > SPIRIT_FEAR_THRESHOLD) {
      attackerDamage += attackerDamage * SPIRIT_FEAR_DAMAGE_BONUS;
    }

    // 伤害上限裁剪
    const cap = DAMAGE_CAP[attackerAction as keyof typeof DAMAGE_CAP];
    if (cap) {
      attackerDamage = Math.min(attackerDamage, defender.maxHp * cap);
    }
  }

  // --- 防御方对攻击方造成伤害 ---
  let defenderDamage = calcBaseDamage(defender, defenderAction);

  if (defenderDamage > 0) {
    const counter = getCounterMultiplier(defenderAction, attackerAction);
    defenderDamage *= counter;

    defenderDamage = applyTrait(defender, attacker, defenderDamage, defenderAction);

    if (isBlocking(attackerAction)) {
      const reduction =
        defenderAction === "heavy_strike"
          ? BLOCK_REDUCTION.vs_heavy_strike
          : BLOCK_REDUCTION.vs_feint;
      defenderDamage *= 1 - reduction;

      const attackerTrait = TRAIT_EFFECTS[attacker.trait as keyof typeof TRAIT_EFFECTS];
      if (attackerTrait && "blockBonus" in attackerTrait) {
        defenderDamage *= 1 - attackerTrait.blockBonus;
      }
    }

    const spiritAdvantage =
      ((defender.spirit - attacker.spirit) / 200) * 0.5;
    defenderDamage += defenderDamage * spiritAdvantage;

    if (defender.spirit - attacker.spirit > SPIRIT_FEAR_THRESHOLD) {
      defenderDamage += defenderDamage * SPIRIT_FEAR_DAMAGE_BONUS;
    }

    const cap = DAMAGE_CAP[defenderAction as keyof typeof DAMAGE_CAP];
    if (cap) {
      defenderDamage = Math.min(defenderDamage, attacker.maxHp * cap);
    }
  }

  // --- 格子/鸣叫特殊效果 ---
  const attackerStaminaDelta = getStaminaDelta(attackerAction);
  const defenderStaminaDelta = getStaminaDelta(defenderAction);

  const attackerSpiritDelta = getSpiritDelta(attacker, attackerAction);
  const defenderSpiritDelta = getSpiritDelta(defender, defenderAction);

  return {
    attackerResult: {
      damage: Math.round(attackerDamage * DAMAGE_MULTIPLIER),
      staminaDelta: attackerStaminaDelta,
      spiritDelta: attackerSpiritDelta,
      isBlocked: isBlocking(defenderAction),
      isCrit: false, // TODO: 暴击机制
      counterApplied: getCounterMultiplier(attackerAction, defenderAction),
    },
    defenderResult: {
      damage: Math.round(defenderDamage * DAMAGE_MULTIPLIER),
      staminaDelta: defenderStaminaDelta,
      spiritDelta: defenderSpiritDelta,
      isBlocked: isBlocking(attackerAction),
      isCrit: false,
      counterApplied: getCounterMultiplier(defenderAction, attackerAction),
    },
  };
}

/**
 * 获取动作的耐力变化
 */
function getStaminaDelta(action: Action): number {
  const costs: Record<Action, number> = {
    heavy_strike: -12,
    feint: -8,
    block: -5,
    chirp: -3,
  };
  return costs[action];
}

/**
 * 获取动作的斗性变化
 */
function getSpiritDelta(
  cricket: BattleCalcInput,
  action: Action
): number {
  if (action === "chirp") {
    const baseGain = 10;
    const trait = TRAIT_EFFECTS[cricket.trait as keyof typeof TRAIT_EFFECTS];
    if (trait && "chirpSpiritMultiplier" in trait) {
      return Math.round(baseGain * trait.chirpSpiritMultiplier);
    }
    return baseGain;
  }
  if (action === "block") {
    return 3; // 格挡轻微恢复斗性
  }
  return 0;
}

/**
 * 计算属性加成后的有效值
 */
export function getEffectiveStat(
  cricket: BattleCalcInput,
  stat: "attack" | "defense" | "speed"
): number {
  const base = cricket[stat];
  const trait = TRAIT_EFFECTS[cricket.trait as keyof typeof TRAIT_EFFECTS];

  let multiplier = 1.0;

  if (stat === "attack" && trait && "attackMultiplier" in trait) {
    multiplier = trait.attackMultiplier;
  }
  if (stat === "speed" && trait && "speedMultiplier" in trait) {
    multiplier = trait.speedMultiplier;
  }
  if (stat === "defense" && trait && "lowHpDefenseMultiplier" in trait && cricket.hp / cricket.maxHp < 0.3) {
    multiplier = trait.lowHpDefenseMultiplier;
  }

  return Math.round(base * multiplier);
}