import type { Room, Action } from "./types";
import { calcRoundResult, getEffectiveStat } from "../src/lib/battle-calc";
import { ACTION_STAMINA_COST } from "../src/config/game";

export interface RoundResultPayload {
  leftAction: Action;
  rightAction: Action;
  leftHpDelta: number;
  rightHpDelta: number;
  leftStaminaDelta: number;
  rightStaminaDelta: number;
  leftDefeated: boolean;
  rightDefeated: boolean;
  leftHp: number;
  rightHp: number;
  leftSpiritDelta: number;
  rightSpiritDelta: number;
}

export interface RoundWinPayload {
  winner: "left" | "right" | "draw";
  leftScore: number;
  rightScore: number;
  defeatedCricket: {
    side: "left" | "right";
    name: string;
    title: string;
  } | null;
}

export interface GameOverPayload {
  winner: "left" | "right";
  leftScore: number;
  rightScore: number;
}

/**
 * 执行一回合结算
 */
export function resolveRound(room: Room): {
  roundResult: RoundResultPayload;
  roundWin: RoundWinPayload | null;
  gameOver: GameOverPayload | null;
  defeatedSide: "left" | "right" | "both" | null;
} {
  const leftAction = room.leftAction!;
  const rightAction = room.rightAction!;
  const leftCricket = room.leftCrickets[room.currentLeftIndex];
  const rightCricket = room.rightCrickets[room.currentRightIndex];

  // 使用共享的战斗计算引擎
  const result = calcRoundResult(
    {
      attack: getEffectiveStat(leftCricket, "attack"),
      defense: getEffectiveStat(leftCricket, "defense"),
      speed: getEffectiveStat(leftCricket, "speed"),
      maxHp: leftCricket.maxHp,
      hp: leftCricket.hp,
      stamina: leftCricket.stamina,
      spirit: leftCricket.spirit,
      trait: leftCricket.trait,
    },
    {
      attack: getEffectiveStat(rightCricket, "attack"),
      defense: getEffectiveStat(rightCricket, "defense"),
      speed: getEffectiveStat(rightCricket, "speed"),
      maxHp: rightCricket.maxHp,
      hp: rightCricket.hp,
      stamina: rightCricket.stamina,
      spirit: rightCricket.spirit,
      trait: rightCricket.trait,
    },
    leftAction,
    rightAction
  );

  // 应用伤害
  rightCricket.hp = Math.max(0, rightCricket.hp - result.attackerResult.damage);
  leftCricket.hp = Math.max(0, leftCricket.hp - result.defenderResult.damage);

  // 应用耐力变化
  leftCricket.stamina = Math.max(0, Math.min(leftCricket.maxStamina, leftCricket.stamina + result.attackerResult.staminaDelta));
  rightCricket.stamina = Math.max(0, Math.min(rightCricket.maxStamina, rightCricket.stamina + result.defenderResult.staminaDelta));

  // 应用斗性变化
  leftCricket.spirit = Math.max(0, Math.min(200, leftCricket.spirit + result.attackerResult.spiritDelta));
  rightCricket.spirit = Math.max(0, Math.min(200, rightCricket.spirit + result.defenderResult.spiritDelta));

  const leftDefeated = leftCricket.hp <= 0;
  const rightDefeated = rightCricket.hp <= 0;

  const roundResult: RoundResultPayload = {
    leftAction,
    rightAction,
    leftHpDelta: -result.defenderResult.damage,
    rightHpDelta: -result.attackerResult.damage,
    leftStaminaDelta: result.attackerResult.staminaDelta,
    rightStaminaDelta: result.defenderResult.staminaDelta,
    leftDefeated,
    rightDefeated,
    leftHp: leftCricket.hp,
    rightHp: rightCricket.hp,
    leftSpiritDelta: result.attackerResult.spiritDelta,
    rightSpiritDelta: result.defenderResult.spiritDelta,
  };

  let roundWin: RoundWinPayload | null = null;
  let gameOver: GameOverPayload | null = null;

  // 判断本局胜负
  let defeatedSide: "left" | "right" | "both" | null = null;
  if (leftDefeated && rightDefeated) {
    defeatedSide = "both";
    // 同时倒: 比较剩余HP百分比
    const leftPct = leftCricket.hp / leftCricket.maxHp;
    const rightPct = rightCricket.hp / rightCricket.maxHp;
    if (leftPct >= rightPct) {
      room.leftScore++;
      roundWin = { winner: "left", leftScore: room.leftScore, rightScore: room.rightScore, defeatedCricket: { side: "right", name: rightCricket.name, title: rightCricket.title } };
    } else {
      room.rightScore++;
      roundWin = { winner: "right", leftScore: room.leftScore, rightScore: room.rightScore, defeatedCricket: { side: "left", name: leftCricket.name, title: leftCricket.title } };
    }
  } else if (leftDefeated) {
    defeatedSide = "left";
    room.rightScore++;
    roundWin = { winner: "right", leftScore: room.leftScore, rightScore: room.rightScore, defeatedCricket: { side: "left", name: leftCricket.name, title: leftCricket.title } };
  } else if (rightDefeated) {
    defeatedSide = "right";
    room.leftScore++;
    roundWin = { winner: "left", leftScore: room.leftScore, rightScore: room.rightScore, defeatedCricket: { side: "right", name: rightCricket.name, title: rightCricket.title } };
  }

  // 判断整场结束
  if (room.battleMode === "best_of_3") {
    if (room.leftScore >= 2) {
      gameOver = { winner: "left", leftScore: room.leftScore, rightScore: room.rightScore };
    } else if (room.rightScore >= 2) {
      gameOver = { winner: "right", leftScore: room.leftScore, rightScore: room.rightScore };
    }
  } else {
    // 车轮战: 一方败阵蛐蛐用完即结束
    if (defeatedSide === "left" || defeatedSide === "both") {
      if (room.currentLeftIndex + 1 >= room.leftCrickets.length) {
        gameOver = { winner: "right", leftScore: room.leftScore, rightScore: room.rightScore };
      }
    }
    if (defeatedSide === "right" || defeatedSide === "both") {
      if (room.currentRightIndex + 1 >= room.rightCrickets.length) {
        gameOver = { winner: "left", leftScore: room.leftScore, rightScore: room.rightScore };
      }
    }
  }

  return { roundResult, roundWin, gameOver, defeatedSide };
}

/**
 * 服务端强制校验伤害上限 (二次防御)
 */
export function validateDamage(
  damage: number,
  targetMaxHp: number,
  action: Action
): number {
  const caps: Record<Action, number> = {
    heavy_strike: 0.35,
    feint: 0.3,
    block: 0,
    chirp: 0,
  };
  const cap = caps[action];
  if (cap > 0) {
    return Math.min(damage, Math.floor(targetMaxHp * cap));
  }
  return damage;
}

/**
 * 校验蛐蛐数量 (服务端强制 <3 只禁止参战)
 */
export function validateCricketCount(
  cricketIds: number[] | undefined
): boolean {
  if (!cricketIds) return false;
  return cricketIds.length >= 3;
}
