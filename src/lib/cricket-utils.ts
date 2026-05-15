import { TRAIT_EFFECTS, TIER_LABELS, TIER_COLORS, TRAIT_LABELS } from "@/config/game";

export interface CricketTemplate {
  id: number;
  name: string;
  title: string;
  tier: "common" | "rare" | "epic" | "legendary";
  attack: number;
  defense: number;
  speed: number;
  hpBase: number;
  staminaBase: number;
  spiritBase: number;
  trait: string;
  color?: string;
  emoji?: string;
  gachaWeight: number;
  imageKey?: string;
}

export interface UserCricket {
  id: number;
  uid: string;
  templateId: number;
  template: CricketTemplate;
  imageKey?: string;
  obtainedAt: string;
}

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
