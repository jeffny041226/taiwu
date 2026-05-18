import { TRAIT_EFFECTS, TIER_LABELS, TIER_COLORS, TRAIT_LABELS } from "../config/game";
import type { CricketTemplate } from "../types/cricket";

export type { CricketTemplate };

/**
 * 获取品质对应的显示文字
 */
export function getTierLabel(tier: string): string {
  return TIER_LABELS[tier] || tier;
}

/**
 * 获取品质对应的颜色
 */
export function getTierColor(tier: string): { text: string; bg: string } {
  return TIER_COLORS[tier as keyof typeof TIER_COLORS] || { text: "#a0a0a0", bg: "rgba(160,160,160,0.15)" };
}

/**
 * 获取特性对应的显示文字
 */
export function getTraitLabel(trait: string): string {
  return TRAIT_LABELS[trait] || trait;
}

/**
 * 获取特性对应的效果描述
 */
export function getTraitDescription(trait: string): string {
  const effect = TRAIT_EFFECTS[trait as keyof typeof TRAIT_EFFECTS];
  return effect?.description || "";
}

/**
 * 计算有效的最终攻击力（含特性加成）
 */
export function getEffectiveAttack(template: CricketTemplate): number {
  const effect = TRAIT_EFFECTS[template.trait as keyof typeof TRAIT_EFFECTS];
  if (effect && "attackMultiplier" in effect) {
    return Math.round(template.attack * effect.attackMultiplier);
  }
  return template.attack;
}

/**
 * 计算有效的最终速度（含特性加成）
 */
export function getEffectiveSpeed(template: CricketTemplate): number {
  const effect = TRAIT_EFFECTS[template.trait as keyof typeof TRAIT_EFFECTS];
  if (effect && "speedMultiplier" in effect) {
    return Math.round(template.speed * effect.speedMultiplier);
  }
  return template.speed;
}

/**
 * 格式化属性为简短的显示文本
 */
export function formatStats(cricket: CricketTemplate): string {
  return `攻${cricket.attack}  防${cricket.defense}  速${cricket.speed}`;
}

/**
 * 品级浮动范围
 */
const TIER_VARIATION: Record<string, { min: number; max: number }> = {
  common:    { min: 0.85, max: 1.00 },
  rare:      { min: 0.90, max: 1.05 },
  epic:      { min: 0.95, max: 1.10 },
  legendary: { min: 1.00, max: 1.15 },
};

/**
 * 为模板生成个体浮动属性值
 */
export function generateVariant(template: CricketTemplate): {
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  maxStamina: number;
  spiritBase: number;
} {
  const range = TIER_VARIATION[template.tier] || TIER_VARIATION.common;
  const rand = () => range.min + Math.random() * (range.max - range.min);

  return {
    attack: Math.round(template.attack * rand()),
    defense: Math.round(template.defense * rand()),
    speed: Math.round(template.speed * rand()),
    maxHp: Math.round(template.hpBase * rand()),
    maxStamina: Math.round(template.staminaBase * rand()),
    spiritBase: Math.round(template.spiritBase * rand()),
  };
}