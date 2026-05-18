import type { BattleCricket } from "./types";
import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";

/** ID → 模板快速查找 */
const templateMap = new Map(CRICKET_TEMPLATES.map(t => [t.id, t]));

/** 将 templateIds 解析为 BattleCricket 对象数组 (使用模板基础属性) */
export function resolveCrickets(cricketIds: number[]): BattleCricket[] | null {
  const result: BattleCricket[] = [];
  for (const id of cricketIds) {
    const t = templateMap.get(id);
    if (!t) return null;
    result.push({
      id: t.id,
      templateId: t.id,
      name: t.name,
      title: t.title,
      tier: t.tier,
      attack: t.attack,
      defense: t.defense,
      speed: t.speed,
      maxHp: t.hpBase,
      hp: t.hpBase,
      maxStamina: t.staminaBase,
      stamina: t.staminaBase,
      spirit: t.spiritBase,
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