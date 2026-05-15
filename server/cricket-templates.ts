import type { BattleCricket } from "./types";

/** 蛐蛐模板 (仅战斗相关字段) */
interface CricketTemplate {
  id: number;
  name: string;
  title: string;
  tier: string;
  attack: number;
  defense: number;
  speed: number;
  hpBase: number;
  staminaBase: number;
  spiritBase: number;
  trait: string;
  gachaWeight: number;
}

const templates: CricketTemplate[] = [
  // 普通 (8只)
  { id: 1,  name: "褐背小将",  title: "褐甲护体",  tier: "common", attack: 15, defense: 18, speed: 12, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "steadfast", gachaWeight: 100 },
  { id: 2,  name: "灰翅将军",  title: "灰翼低鸣",  tier: "common", attack: 16, defense: 17, speed: 13, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "tenacious", gachaWeight: 100 },
  { id: 3,  name: "黄足童子",  title: "黄足轻点",  tier: "common", attack: 14, defense: 19, speed: 11, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "resonant",  gachaWeight: 100 },
  { id: 4,  name: "白须先锋",  title: "白须飘飘",  tier: "common", attack: 17, defense: 15, speed: 14, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "steadfast", gachaWeight: 100 },
  { id: 5,  name: "黑背力士",  title: "黑背驮山",  tier: "common", attack: 18, defense: 20, speed: 10, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "tenacious", gachaWeight: 100 },
  { id: 6,  name: "斑纹小将",  title: "斑纹交错",  tier: "common", attack: 15, defense: 16, speed: 15, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "resonant",  gachaWeight: 100 },
  { id: 7,  name: "青足勇士",  title: "青足踏云",  tier: "common", attack: 16, defense: 18, speed: 12, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "steadfast", gachaWeight: 100 },
  { id: 8,  name: "赤须郎君",  title: "赤须如焰",  tier: "common", attack: 19, defense: 15, speed: 13, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "tenacious", gachaWeight: 100 },
  // 稀有 (6只)
  { id: 9,  name: "青头大王",  title: "青面獠牙",  tier: "rare", attack: 16, defense: 18, speed: 14, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "resonant",   gachaWeight: 65 },
  { id: 10, name: "黑头金刚",  title: "黑甲战神",  tier: "rare", attack: 18, defense: 16, speed: 15, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "fierce",     gachaWeight: 65 },
  { id: 11, name: "铁翅元帅",  title: "铁翼横空",  tier: "rare", attack: 17, defense: 22, speed: 12, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "steadfast",  gachaWeight: 65 },
  { id: 12, name: "金须战将",  title: "金须飘然",  tier: "rare", attack: 15, defense: 20, speed: 16, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "resonant",   gachaWeight: 65 },
  { id: 13, name: "斑背先锋",  title: "斑背驮甲",  tier: "rare", attack: 14, defense: 19, speed: 17, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "fierce",     gachaWeight: 65 },
  { id: 14, name: "黄翅太保",  title: "黄翅遮天",  tier: "rare", attack: 12, defense: 18, speed: 14, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "resonant",   gachaWeight: 65 },
  // 史诗 (4只)
  { id: 15, name: "紫翅飞将",  title: "紫翼天翔",  tier: "epic", attack: 23, defense: 7,  speed: 22, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "swift",      gachaWeight: 30 },
  { id: 16, name: "赤羽天骄",  title: "赤羽如血",  tier: "epic", attack: 22, defense: 8,  speed: 24, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "cunning",    gachaWeight: 30 },
  { id: 17, name: "蓝甲天兵",  title: "蓝甲耀日",  tier: "epic", attack: 24, defense: 7,  speed: 21, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "swift",      gachaWeight: 30 },
  { id: 18, name: "白翼先知",  title: "白翼通灵",  tier: "epic", attack: 22, defense: 8,  speed: 23, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "cunning",    gachaWeight: 30 },
  // 传说 (2只)
  { id: 19, name: "赤牙将军",  title: "铁齿铜牙",  tier: "legendary", attack: 25, defense: 20, speed: 20, hpBase: 130, staminaBase: 120, spiritBase: 120, trait: "fierce",    gachaWeight: 15 },
  { id: 20, name: "金翅霸王",  title: "金翼无双",  tier: "legendary", attack: 24, defense: 21, speed: 19, hpBase: 130, staminaBase: 120, spiritBase: 120, trait: "tenacious", gachaWeight: 15 },
];

/** ID → 模板快速查找 */
export const templateMap = new Map<number, CricketTemplate>(
  templates.map((t) => [t.id, t])
);

/** 将 cricketIds 解析为 BattleCricket 对象数组 */
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

/** 默认蛐蛐 ID (超时自动选择) */
export const DEFAULT_CRICKET_IDS = [1, 2, 3];