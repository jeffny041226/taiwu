"use client";

import { useState } from "react";
import Link from "next/link";

const gachaBtnClass = "w-[175px] h-[42px] rounded-lg border text-[18px] font-bold font-[family-name:var(--font-noto-serif)] transition-all active:scale-[0.98] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)]";
const gachaBtnActive = `${gachaBtnClass} border-[var(--color-gold)]/70 shadow-[0_0_12px_rgba(197,160,89,0.15)] text-[var(--color-gold)]`;
const gachaBtnInactive = `${gachaBtnClass} border-[var(--color-gold)]/30 text-[var(--color-gold)]/70 hover:border-[var(--color-gold)]/50`;

export default function MarketPage() {
  const [selectedCount, setSelectedCount] = useState<1 | 5 | 10>(1);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[var(--color-bg-base)]">
      <header className="relative z-[10] flex items-center h-[55px] px-4">
        <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
          <span className="text-[var(--color-gold)] text-xl">←</span>
        </Link>
        <h1 className="flex-1 text-center text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] mr-9">虫市</h1>
      </header>

      <div className="relative z-[10] flex h-[calc(100dvh-55px)]">
        {/* Left: Gacha Display */}
        <div className="w-1/2 flex flex-col items-center justify-center px-2">
          <div className="w-[120px] h-[120px] rounded-xl bg-[var(--color-bg-base)]/40 border border-[var(--color-gold)]/15 flex flex-col items-center justify-center">
            <div className="text-[var(--color-gold)] text-4xl mb-2 font-[family-name:var(--font-ma-shan)]">笼</div>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-ma-shan)]">开笼觅良虫</p>
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="w-1/2 flex flex-col items-center pt-16 px-2 gap-[14px]">
          {([1, 5, 10] as const).map((count) => (
            <button key={count} type="button" onClick={() => setSelectedCount(count)}
              className={selectedCount === count ? gachaBtnActive : gachaBtnInactive}>
              开{count}笼
            </button>
          ))}

          {/* Probability table */}
          <div className="mt-6 w-[175px]">
            <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] mb-2">概率公示</p>
            <div className="space-y-1 text-[11px] font-[family-name:var(--font-noto-serif)]">
              <div className="flex justify-between"><span style={{ color: "#a0a0a0" }}>普通</span><span className="text-[var(--color-text-secondary)]">48%</span></div>
              <div className="flex justify-between"><span style={{ color: "#4a90d9" }}>稀有</span><span className="text-[var(--color-text-secondary)]">30%</span></div>
              <div className="flex justify-between"><span style={{ color: "#8b5cf6" }}>史诗</span><span className="text-[var(--color-text-secondary)]">15%</span></div>
              <div className="flex justify-between"><span style={{ color: "#c5a059" }}>传说</span><span className="text-[var(--color-text-secondary)]">7%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee */}
      <div className="absolute bottom-[34px] left-0 right-0 z-[10] h-9 bg-[rgba(20,14,10,0.7)] border-t border-[var(--color-gold)]/15 flex items-center overflow-hidden">
        <div className="whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">
          玩家***抽到了【传说】赤牙将军 &nbsp;|&nbsp; 玩家***抽到了【稀有】青头大王 &nbsp;|&nbsp; 玩家***抽到了【史诗】紫翅飞将
        </div>
      </div>
    </div>
  );
}
