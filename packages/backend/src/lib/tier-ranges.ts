/**
 * 蛐蛐级别属性区间 — 运行时缓存 + 实例属性生成
 *
 * 设计:
 * - DB 启动时一次性加载到 `cache: Map<Tier, StatRanges>`
 * - 抽/兑热路径不查 DB,直接读内存
 * - 启动后注册 5s 定时重读 (Taiwu-admin 修改区间后无需重启)
 *
 * 区间方向: 数值越大越强 (跟 attack/defense/speed 语义一致)
 * 区间不重叠: max(下级) < min(上级)
 */

import { db } from "../db/client";
import { cricketTierRanges } from "../db/schema";
import type { Tier } from "@taiwu/shared/types/cricket";

/** 6 个属性各自的 [min, max] (整数,含端点) */
export interface StatRanges {
  attack: [number, number];
  defense: [number, number];
  speed: [number, number];
  maxHp: [number, number];
  maxStamina: [number, number];
  spiritBase: [number, number];
}

/** 实例属性 (抽/兑返回) */
export interface CricketVariant {
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  maxStamina: number;
  spiritBase: number;
}

let cache: Map<Tier, StatRanges> | null = null;

/** 全局标记,确保 setInterval 只在第一次启动时注册一次 */
declare global {
  // eslint-disable-next-line no-var
  var __tierRangesInterval: NodeJS.Timeout | undefined;
}

/**
 * 从 DB 实际加载并替换内存缓存 (无副作用,纯读 + 替换引用)。
 */
async function refreshTierRangesFromDb(): Promise<Map<Tier, StatRanges>> {
  const rows = await db.select().from(cricketTierRanges);
  const m = new Map<Tier, StatRanges>();
  for (const r of rows) {
    m.set(r.tier, {
      attack: [r.attackMin, r.attackMax],
      defense: [r.defenseMin, r.defenseMax],
      speed: [r.speedMin, r.speedMax],
      maxHp: [r.maxHpMin, r.maxHpMax],
      maxStamina: [r.maxStaminaMin, r.maxStaminaMax],
      spiritBase: [r.spiritBaseMin, r.spiritBaseMax],
    });
  }
  cache = m;
  return m;
}

/**
 * 启动时调用: 从 DB 一次性加载所有级别区间到内存,并注册 5s 定时重读。
 */
export async function loadTierRanges(): Promise<Map<Tier, StatRanges>> {
  if (!cache) {
    const m = await refreshTierRangesFromDb();
    console.log(`[TierRanges] 加载 ${m.size} 个级别区间`);
  }
  // 注册定时重读 (HMR 场景下用 globalThis 保证只注册一次)
  if (!globalThis.__tierRangesInterval) {
    globalThis.__tierRangesInterval = setInterval(() => {
      void refreshTierRangesFromDb().catch((err) => {
        console.error("[TierRanges] 定时重读失败:", err);
      });
    }, 5000);
    console.log("[TierRanges] 已注册 5s 定时重读");
  }
  return cache!;
}

/**
 * 读取指定级别的属性区间。
 * 必须先 `loadTierRanges()`,否则抛错(启动期未加载就调 = bug)。
 */
export function getTierRange(tier: Tier): StatRanges {
  if (!cache) {
    throw new Error("[TierRanges] cache 未初始化,请在 index.ts 启动时调用 loadTierRanges()");
  }
  const r = cache.get(tier);
  if (!r) {
    throw new Error(`[TierRanges] 找不到级别 ${tier} 的区间(请先 seed-tier-ranges)`);
  }
  return r;
}

/**
 * 读取所有级别的区间 (给前端 handbook 等展示用)。
 * 返回结构: { common: { attack: [8,13], ... }, rare: {...}, ... }
 */
export function getAllTierRanges(): Record<Tier, StatRanges> {
  if (!cache) {
    throw new Error("[TierRanges] cache 未初始化");
  }
  return {
    common: cache.get("common")!,
    rare: cache.get("rare")!,
    epic: cache.get("epic")!,
    legendary: cache.get("legendary")!,
  };
}

/** 区间内独立均匀随机整数 (含端点) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 为指定级别生成个体浮动属性 — 6 个属性各自独立随机。
 * (原本在 shared/lib/cricket-utils,因需要 DB 移到 backend)
 */
export function generateVariantByTier(tier: Tier): CricketVariant {
  const r = getTierRange(tier);
  return {
    attack: randInt(r.attack[0], r.attack[1]),
    defense: randInt(r.defense[0], r.defense[1]),
    speed: randInt(r.speed[0], r.speed[1]),
    maxHp: randInt(r.maxHp[0], r.maxHp[1]),
    maxStamina: randInt(r.maxStamina[0], r.maxStamina[1]),
    spiritBase: randInt(r.spiritBase[0], r.spiritBase[1]),
  };
}
