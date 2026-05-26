import { CRICKET_TEMPLATES } from "@taiwu/shared/data/cricket-templates";
import { generateVariant } from "@taiwu/shared/lib/cricket-utils";

/**
 * 内存蛐蛐存储 — 没有 Supabase 时使用
 * 用 uid 作为 key，存储该用户的蛐蛐列表
 * 仅用于开发/演示，重启后数据丢失
 */

interface MemoryCricket {
  id: number;
  uid: string;
  template_id: number;
  image_key: string | null;
  obtained_at: string;
  /** 个体属性 */
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  maxStamina: number;
  spiritBase: number;
}

const store = new Map<string, MemoryCricket[]>();
let nextId = 1;

/** 内存抽奖次数存储 */
const gachaChances = new Map<string, number>();

export function memoryGetGachaChances(uid: string): number {
  return gachaChances.get(uid) || 0;
}

export function memorySetGachaChances(uid: string, count: number): void {
  gachaChances.set(uid, count);
}

export function memoryAddGachaChances(uid: string, delta: number): number {
  const current = memoryGetGachaChances(uid);
  const updated = current + delta;
  gachaChances.set(uid, updated);
  return updated;
}

export function memoryInsert(uid: string, records: Array<{ template_id: number; image_key: string | null }>): MemoryCricket[] {
  const existing = store.get(uid) || [];
  const now = new Date().toISOString();
  const inserted = records.map(r => {
    const template = CRICKET_TEMPLATES.find(t => t.id === r.template_id);
    const variant = template ? generateVariant(template) : { attack: 10, defense: 10, speed: 10, maxHp: 100, maxStamina: 100, spiritBase: 100 };
    return {
      id: nextId++,
      uid,
      template_id: r.template_id,
      image_key: r.image_key,
      obtained_at: now,
      ...variant,
    };
  });
  store.set(uid, [...existing, ...inserted]);
  return inserted;
}

export function memoryGetAll(uid: string): MemoryCricket[] {
  return store.get(uid) || [];
}

export function memoryDelete(uid: string, cricketId: number): boolean {
  const existing = store.get(uid) || [];
  const filtered = existing.filter(c => c.id !== cricketId);
  if (filtered.length === existing.length) return false;
  store.set(uid, filtered);
  return true;
}

// ── 兑换码内存存储 ──

interface MemoryRedeemCode {
  id: number;
  code: string;
  template_id: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

const redeemCodes = new Map<string, MemoryRedeemCode>();
let nextRedeemId = 1;

export function memoryCreateRedeemCode(code: string, templateId: number): MemoryRedeemCode {
  const record: MemoryRedeemCode = {
    id: nextRedeemId++,
    code,
    template_id: templateId,
    is_used: false,
    used_by: null,
    used_at: null,
    created_at: new Date().toISOString(),
  };
  redeemCodes.set(code, record);
  return record;
}

export function memoryGetRedeemCode(code: string): MemoryRedeemCode | undefined {
  return redeemCodes.get(code);
}

export function memoryUseRedeemCode(code: string, uid: string): MemoryRedeemCode | undefined {
  const record = redeemCodes.get(code);
  if (!record || record.is_used) return undefined;
  record.is_used = true;
  record.used_by = uid;
  record.used_at = new Date().toISOString();
  return record;
}

// ── 战力系统内存存储 ──

const combatPowers = new Map<string, number>();
const defenseLineups = new Map<string, number[]>();
const winLossRecords = new Map<string, { wins: number; losses: number }>();

export function memoryGetCombatPower(uid: string): number {
  return combatPowers.get(uid) ?? 1000;
}

export function memorySetCombatPower(uid: string, power: number): void {
  combatPowers.set(uid, Math.max(0, power));
}

export function memoryAdjustCombatPower(uid: string, delta: number): number {
  const current = memoryGetCombatPower(uid);
  const updated = Math.max(0, current + delta);
  combatPowers.set(uid, updated);
  return updated;
}

export function memoryGetDefenseCrickets(uid: string): number[] {
  return defenseLineups.get(uid) ?? [];
}

export function memorySetDefenseCrickets(uid: string, cricketIds: number[]): void {
  defenseLineups.set(uid, cricketIds.slice(0, 3));
}

export function memoryGetWinLoss(uid: string): { wins: number; losses: number } {
  return winLossRecords.get(uid) ?? { wins: 0, losses: 0 };
}

export function memoryAddWin(uid: string): void {
  const current = memoryGetWinLoss(uid);
  winLossRecords.set(uid, { wins: current.wins + 1, losses: current.losses });
}

export function memoryAddLoss(uid: string): void {
  const current = memoryGetWinLoss(uid);
  winLossRecords.set(uid, { wins: current.wins, losses: current.losses + 1 });
}