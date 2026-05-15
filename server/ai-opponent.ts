import type { WebSocket } from "ws";
import type { Action, BattleCricket } from "./types";
import type { CricketBattleState } from "../src/lib/battle-calc";

/**
 * AI 对手逻辑
 * 基于玩家上一回合动作做倾向性选择，模拟合理对手行为
 */
const ALL_ACTIONS: Action[] = ["heavy_strike", "feint", "block", "chirp"];

/** AI 权重策略：针对玩家上一回合动作 */
const COUNTER_WEIGHTS: Record<Action, { heavy_strike: number; feint: number; block: number; chirp: number }> = {
  heavy_strike: { heavy_strike: 10, feint: 15, block: 55, chirp: 20 },  // 偏向格挡防御
  feint:        { heavy_strike: 50, feint: 10, block: 15, chirp: 25 },   // 偏向猛击反制
  block:        { heavy_strike: 25, feint: 45, block: 10, chirp: 20 },   // 偏向虚晃破防
  chirp:        { heavy_strike: 50, feint: 20, block: 15, chirp: 15 },   // 偏向猛击克制
};

/**
 * AI 选择动作
 * @param aiCricket AI 当前蛐蛐状态
 * @param playerLastAction 玩家上一回合动作 (undefined 表示第一回合)
 * @param playerCricket 玩家当前蛐蛐状态
 */
export function aiChooseAction(
  aiCricket: CricketBattleState,
  playerLastAction: Action | null,
  playerCricket: CricketBattleState
): Action {
  // 第一回合或随机种子
  if (!playerLastAction) {
    return weightedRandom({
      heavy_strike: 30,
      feint: 25,
      block: 25,
      chirp: 20,
    });
  }

  // 耐力不足时增加鸣叫/格挡概率
  const staminaRatio = aiCricket.stamina / 100;
  let weights = { ...COUNTER_WEIGHTS[playerLastAction] };

  if (staminaRatio < 0.3) {
    // 低耐力时更倾向恢复
    weights.block += 20;
    weights.chirp += 20;
    weights.heavy_strike = Math.max(0, weights.heavy_strike - 20);
    weights.feint = Math.max(0, weights.feint - 10);
  }

  // 对手低血量时更激进
  if (playerCricket.hp / playerCricket.maxHp < 0.25) {
    weights.heavy_strike += 15;
  }

  // AI 低血量时更保守
  if (aiCricket.hp / aiCricket.maxHp < 0.3) {
    weights.block += 15;
    weights.heavy_strike = Math.max(0, weights.heavy_strike - 10);
  }

  return weightedRandom(weights);
}

/** 加权随机选择 */
function weightedRandom(
  weights: Record<Action, number>
): Action {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (const [action, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return action as Action;
  }

  return "block"; // fallback
}

/**
 * 生成 AI 对手信息
 */
export function createAIPlayer(ws?: WebSocket) {
  return {
    uid: "ai-opponent",
    nickName: "训练大师",
    avatar: undefined,
    cricketIds: undefined,
    readyRound: true,
    ws: ws as WebSocket, // AI 无真实 ws，由 server 直接处理
  };
}

/**
 * 生成 AI 的蛐蛐数据 (基于模板的简单映射)
 */
export function createAICrickets(): BattleCricket[] {
  return [
    {
      id: 1001, templateId: 7, name: "青头大王", title: "青面獠牙", tier: "rare",
      attack: 16, defense: 18, speed: 14,
      maxHp: 110, hp: 110, maxStamina: 105, stamina: 105,
      spirit: 105, trait: "resonant",
    },
    {
      id: 1002, templateId: 8, name: "黑头金刚", title: "黑甲战神", tier: "rare",
      attack: 18, defense: 16, speed: 15,
      maxHp: 110, hp: 110, maxStamina: 105, stamina: 105,
      spirit: 105, trait: "fierce",
    },
    {
      id: 1003, templateId: 10, name: "铁翅元帅", title: "铁翼横空", tier: "rare",
      attack: 17, defense: 22, speed: 12,
      maxHp: 110, hp: 110, maxStamina: 105, stamina: 105,
      spirit: 105, trait: "steadfast",
    },
  ];
}
