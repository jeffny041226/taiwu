import type { CricketTemplate, Tier, Trait } from "../types/cricket";

/** 20 只蛐蛐模板 (matching packages/backend/src/db/schema.ts → cricket_templates) */
export const CRICKET_TEMPLATES: CricketTemplate[] = [
  // 普通 (common) — 8只
  { id: 1,  name: "褐背小将",  title: "褐甲护体",  tier: "common" as Tier, attack: 15, defense: 18, speed: 12, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "steadfast" as Trait, gachaWeight: 100, isActive: true },
  { id: 2,  name: "灰翅将军",  title: "灰翼低鸣",  tier: "common" as Tier, attack: 16, defense: 17, speed: 13, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "tenacious" as Trait, gachaWeight: 100, isActive: true },
  { id: 3,  name: "黄足童子",  title: "黄足轻点",  tier: "common" as Tier, attack: 14, defense: 19, speed: 11, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "resonant" as Trait,  gachaWeight: 100, isActive: true },
  { id: 4,  name: "白须先锋",  title: "白须飘飘",  tier: "common" as Tier, attack: 17, defense: 15, speed: 14, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "steadfast" as Trait, gachaWeight: 100, isActive: true },
  { id: 5,  name: "黑背力士",  title: "黑背驮山",  tier: "common" as Tier, attack: 18, defense: 20, speed: 10, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "tenacious" as Trait, gachaWeight: 100, isActive: true },
  { id: 6,  name: "斑纹小将",  title: "斑纹交错",  tier: "common" as Tier, attack: 15, defense: 16, speed: 15, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "resonant" as Trait,  gachaWeight: 100, isActive: true },
  { id: 7,  name: "青足勇士",  title: "青足踏云",  tier: "common" as Tier, attack: 16, defense: 18, speed: 12, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "steadfast" as Trait, gachaWeight: 100, isActive: true },
  { id: 8,  name: "赤须郎君",  title: "赤须如焰",  tier: "common" as Tier, attack: 19, defense: 15, speed: 13, hpBase: 100, staminaBase: 100, spiritBase: 100, trait: "tenacious" as Trait, gachaWeight: 100, isActive: true },

  // 稀有 (rare) — 6只
  { id: 9,  name: "青头大王",  title: "青面獠牙",  tier: "rare" as Tier, attack: 16, defense: 18, speed: 14, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "resonant" as Trait,   gachaWeight: 65, isActive: true },
  { id: 10, name: "黑头金刚",  title: "黑甲战神",  tier: "rare" as Tier, attack: 18, defense: 16, speed: 15, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "fierce" as Trait,     gachaWeight: 65, isActive: true },
  { id: 11, name: "铁翅元帅",  title: "铁翼横空",  tier: "rare" as Tier, attack: 17, defense: 22, speed: 12, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "steadfast" as Trait,  gachaWeight: 65, isActive: true },
  { id: 12, name: "金须战将",  title: "金须飘然",  tier: "rare" as Tier, attack: 15, defense: 20, speed: 16, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "resonant" as Trait,   gachaWeight: 65, isActive: true },
  { id: 13, name: "斑背先锋",  title: "斑背驮甲",  tier: "rare" as Tier, attack: 14, defense: 19, speed: 17, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "fierce" as Trait,     gachaWeight: 65, isActive: true },
  { id: 14, name: "黄翅太保",  title: "黄翅遮天",  tier: "rare" as Tier, attack: 12, defense: 18, speed: 14, hpBase: 110, staminaBase: 105, spiritBase: 105, trait: "resonant" as Trait,   gachaWeight: 65, isActive: true },

  // 史诗 (epic) — 4只
  { id: 15, name: "紫翅飞将",  title: "紫翼天翔",  tier: "epic" as Tier, attack: 23, defense: 7,  speed: 22, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "swift" as Trait,      gachaWeight: 30, isActive: true },
  { id: 16, name: "赤羽天骄",  title: "赤羽如血",  tier: "epic" as Tier, attack: 22, defense: 8,  speed: 24, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "cunning" as Trait,    gachaWeight: 30, isActive: true },
  { id: 17, name: "蓝甲天兵",  title: "蓝甲耀日",  tier: "epic" as Tier, attack: 24, defense: 7,  speed: 21, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "swift" as Trait,      gachaWeight: 30, isActive: true },
  { id: 18, name: "白翼先知",  title: "白翼通灵",  tier: "epic" as Tier, attack: 22, defense: 8,  speed: 23, hpBase: 120, staminaBase: 110, spiritBase: 110, trait: "cunning" as Trait,    gachaWeight: 30, isActive: true },

  // 传说 (legendary) — 2只
  { id: 19, name: "赤牙将军",  title: "铁齿铜牙",  tier: "legendary" as Tier, attack: 25, defense: 20, speed: 20, hpBase: 130, staminaBase: 120, spiritBase: 120, trait: "fierce" as Trait,    gachaWeight: 15, isActive: true },
  { id: 20, name: "金翅霸王",  title: "金翼无双",  tier: "legendary" as Tier, attack: 24, defense: 21, speed: 19, hpBase: 130, staminaBase: 120, spiritBase: 120, trait: "tenacious" as Trait, gachaWeight: 15, isActive: true },
];

/** 蛐蛐缩略图路径 (6 张占位图循环使用) */
export function getCricketThumb(id: number): string {
  const idx = ((id - 1) % 6) + 1;
  return `/assets/crickets/cricket-${String(idx).padStart(3, "0")}-thumb.png`;
}