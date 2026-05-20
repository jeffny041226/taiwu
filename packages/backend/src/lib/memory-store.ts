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