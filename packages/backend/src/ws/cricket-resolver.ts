import type { BattleCricket } from "./types";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariantByTier } from "../lib/tier-ranges";
import type { Tier } from "@taiwu/shared/types/cricket";

/** ID → 模板快速查找 */
const templateMap = new Map(CRICKET_TEMPLATES.map(t => [t.id, t]));

/**
 * 兜底解析: 只给 templateId,没有个体属性数据时使用。
 * 按模板的 tier 在 `cricket_tier_ranges` 区间内独立随机生成 6 个属性。
 *
 * (旧实现是直接读 template.attack/defense/etc,模板已无 stat 字段,
 *  改为调 generateVariantByTier 在该级别的区间内随机)
 */
export function resolveCrickets(cricketIds: number[]): BattleCricket[] | null {
  const result: BattleCricket[] = [];
  for (const id of cricketIds) {
    const t = templateMap.get(id);
    if (!t) return null;
    const v = generateVariantByTier(t.tier as Tier);
    result.push({
      id: t.id,
      templateId: t.id,
      name: t.name,
      title: t.title,
      tier: t.tier,
      attack: v.attack,
      defense: v.defense,
      speed: v.speed,
      maxHp: v.maxHp,
      hp: v.maxHp,
      maxStamina: v.maxStamina,
      stamina: v.maxStamina,
      spirit: v.spiritBase,
      trait: t.trait,
    });
  }
  return result;
}

/** 使用个体属性数据生成 BattleCricket (支持属性浮动) */
export function resolveCricketsWithStats(crickets: {
  templateId: number;
  name: string;
  title: string;
  tier: string;
  trait: string;
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  maxStamina: number;
  spiritBase: number;
}[]): BattleCricket[] {
  return crickets.map((c, i) => ({
    id: c.templateId * 100 + i,
    templateId: c.templateId,
    name: c.name,
    title: c.title,
    tier: c.tier,
    attack: c.attack,
    defense: c.defense,
    speed: c.speed,
    maxHp: c.maxHp,
    hp: c.maxHp,
    maxStamina: c.maxStamina,
    stamina: c.maxStamina,
    spirit: c.spiritBase,
    trait: c.trait,
  }));
}

/** 默认蛐蛐 ID (超时自动选择) */
export const DEFAULT_CRICKET_IDS = [1, 2, 3];
