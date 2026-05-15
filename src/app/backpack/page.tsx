"use client";

import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";

const imgProps = { unoptimized: true };

const MOCK_CRICKETS = [
  { id: 1, name: "赤牙将军", title: "铁齿铜牙", tier: "legendary" as const, attack: 25, defense: 20, speed: 20, trait: "fierce", image: "/assets/crickets/cricket-001.png" },
  { id: 2, name: "青头大王", title: "青面獠牙", tier: "rare" as const, attack: 16, defense: 18, speed: 14, trait: "resonant", image: "/assets/crickets/cricket-002.png" },
  { id: 3, name: "紫翅飞将", title: "紫翼天翔", tier: "epic" as const, attack: 23, defense: 7, speed: 22, trait: "swift", image: "/assets/crickets/cricket-003.png" },
  { id: 4, name: "褐背小将", title: "褐甲护体", tier: "common" as const, attack: 15, defense: 18, speed: 12, trait: "steadfast", image: "/assets/crickets/cricket-004.png" },
  { id: 5, name: "金翅霸王", title: "金翼无双", tier: "legendary" as const, attack: 24, defense: 21, speed: 19, trait: "tenacious", image: "/assets/crickets/cricket-005.png" },
  { id: 6, name: "黑头金刚", title: "黑甲战神", tier: "rare" as const, attack: 18, defense: 16, speed: 15, trait: "fierce", image: "/assets/crickets/cricket-006.png" },
];

const TIER_COLORS: Record<string, string> = { common: "#a0a0a0", rare: "#4a90d9", epic: "#8b5cf6", legendary: "#c5a059" };

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min((value / 25) * 100, 100);
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[12px] text-[var(--color-text-secondary)] w-4 font-[family-name:var(--font-noto-serif)]">{label}</span>
      <div className="flex-1 h-[6px] rounded-[3px] bg-[#2a1a14]"><div className="h-full rounded-[3px]" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
      <span className="text-[12px] text-[var(--color-text-primary)] w-5 text-right font-[family-name:var(--font-noto-serif)]">{value}</span>
    </div>
  );
}

export default function BackpackPage() {
  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      <TopBar title="背包" backHref="/" />

      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {MOCK_CRICKETS.map((c) => (
            <div key={c.id} className="w-[173px] h-[215px] rounded-xl bg-[var(--color-bg-base)]/40 border border-[var(--color-gold)]/15 flex flex-col items-center relative">
              {/* 品质标签 */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-noto-serif)]"
                style={{ color: TIER_COLORS[c.tier], backgroundColor: `${TIER_COLORS[c.tier]}20` }}>{c.tier === "common" ? "普通" : c.tier === "rare" ? "稀有" : c.tier === "epic" ? "史诗" : "传说"}</div>

              {/* 蛐蛐图片 */}
              <div className="w-[120px] h-[80px] mt-5 mb-1 flex items-center justify-center">
                <Image src={c.image} alt={c.name} width={120} height={80} {...imgProps} className="object-contain" />
              </div>

              {/* 名称 + 称号 */}
              <p className="text-[15px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{c.name}</p>
              <p className="text-[12px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] mb-1">{c.title}</p>

              {/* 属性条 */}
              <div className="w-[145px]">
                <StatBar label="攻" value={c.attack} color="var(--color-stat-atk)" />
                <StatBar label="防" value={c.defense} color="var(--color-stat-def)" />
                <StatBar label="速" value={c.speed} color="var(--color-stat-spd)" />
              </div>

              {/* 特性 + 放生 */}
              <div className="flex items-center justify-between w-[145px] mt-1">
                <span className="px-2 py-0.5 rounded text-[10px] text-[var(--color-gold)] bg-[var(--color-gold)]/10 font-[family-name:var(--font-noto-serif)]">{c.trait}</span>
                <button type="button" className="w-[22px] h-[22px] rounded flex items-center justify-center text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="放生">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
