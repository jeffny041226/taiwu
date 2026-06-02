import { TRAIT_LABELS, TIER_LABELS, TIER_COLORS, TRAIT_EFFECTS } from "../config/game";

/**
 * 蛐蛐展示工具 — 不再依赖 template 上的具体属性值 (已迁移到 DB tier 区间)
 * 个体属性改由 CricketTemplate.tier + 后端 cricket_tier_ranges 区间决定
 */

export type { CricketTemplate } from "../types/cricket";

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
 * 把 [min, max] 区间格式化为 "8-13" 字符串
 */
export function formatRange([min, max]: [number, number]): string {
  return min === max ? `${min}` : `${min}-${max}`;
}

/**
 * 把 6 个属性的 [min, max] 区间转成展示用字符串 map
 * 给 handbook 等前端展示用,需先从 `GET /api/crickets/tier-ranges` 拿到数据
 */
export function formatTierRangeStats(ranges: {
  attack: [number, number];
  defense: [number, number];
  speed: [number, number];
  maxHp: [number, number];
  maxStamina: [number, number];
  spiritBase: [number, number];
}): {
  attack: string;
  defense: string;
  speed: string;
  maxHp: string;
  maxStamina: string;
  spiritBase: string;
} {
  return {
    attack: formatRange(ranges.attack),
    defense: formatRange(ranges.defense),
    speed: formatRange(ranges.speed),
    maxHp: formatRange(ranges.maxHp),
    maxStamina: formatRange(ranges.maxStamina),
    spiritBase: formatRange(ranges.spiritBase),
  };
}
