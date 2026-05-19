"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { ensureAuth } from "@/lib/auth";
import { TIER_COLORS, TIER_LABELS, TRAIT_LABELS } from "@taiwu/shared/config/game";
import type { CricketTemplate, Tier, Trait } from "@taiwu/shared/types/cricket";

const imgProps = { unoptimized: true };

interface UserCricket {
  id: number;
  uid: string;
  template_id: number;
  template?: CricketTemplate;
  obtained_at: string;
}

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
  const [crickets, setCrickets] = useState<UserCricket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    ensureAuth().then(async () => {
      try {
        const data = await api.getCrickets();
        setCrickets(data.crickets as UserCricket[]);
      } catch (e: any) {
        setErrorMsg(e.message || "加载失败");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const handleRelease = async (cricketId: number) => {
    try {
      await api.releaseCricket(cricketId);
      setCrickets(prev => prev.filter(c => c.id !== cricketId));
    } catch (e: any) {
      setErrorMsg(e.message || "放生失败");
    }
  };

  // Resolve image for cricket — prefer template.imageKey from API, fallback to local
  const cricketImage = (uc: UserCricket): string => {
    if (uc.template?.imageKey) return uc.template.imageKey;
    return `/assets/crickets/cricket-${String(((uc.template_id - 1) % 6) + 1).padStart(3, "0")}-thumb.png`;
  };

  const tierColorMap: Record<string, string> = {
    common: TIER_COLORS.common.text,
    rare: TIER_COLORS.rare.text,
    epic: TIER_COLORS.epic.text,
    legendary: TIER_COLORS.legendary.text,
  };

  return (
    <div className="w-full min-h-[100dvh]">
      <div className="fixed inset-0 -z-10" style={{ backgroundImage: "url(/assets/backgrounds/bg-backpack.webp)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }} />
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} />
      <div className="relative z-10">
        <TopBar title="背包" backHref="/" />

      {errorMsg && (
        <div className="px-4 py-2 text-center text-[13px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</div>
      )}

      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">加载中...</p>
          </div>
        ) : crickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[16px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">背包空空如也</p>
            <p className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">去虫市开笼获取蛐蛐吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {crickets.map((uc) => {
              const tmpl = uc.template;
              if (!tmpl) return null;
              const color = tierColorMap[tmpl.tier] || "#a0a0a0";
              return (
                <div key={uc.id} className="w-[173px] h-[215px] rounded-xl bg-[var(--color-bg-base)]/40 border border-[var(--color-gold)]/15 flex flex-col items-center relative">
                  {/* 品质标签 */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-[family-name:var(--font-noto-serif)]"
                    style={{ color: color, backgroundColor: `${color}20` }}>{TIER_LABELS[tmpl.tier]}</div>

                  {/* 蛐蛐图片 */}
                  <div className="w-[120px] h-[80px] mt-5 mb-1 flex items-center justify-center">
                    <Image src={cricketImage(uc)} alt={tmpl?.name || ""} width={120} height={80} {...imgProps} className="object-contain" />
                  </div>

                  {/* 名称 + 称号 */}
                  <p className="text-[15px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{tmpl.name}</p>
                  <p className="text-[12px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] mb-1">{tmpl.title}</p>

                  {/* 属性条 */}
                  <div className="w-[145px]">
                    <StatBar label="攻" value={tmpl.attack} color="var(--color-stat-atk)" />
                    <StatBar label="防" value={tmpl.defense} color="var(--color-stat-def)" />
                    <StatBar label="速" value={tmpl.speed} color="var(--color-stat-spd)" />
                  </div>

                  {/* 特性 + 放生 */}
                  <div className="flex items-center justify-between w-[145px] mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] text-[var(--color-gold)] bg-[var(--color-gold)]/10 font-[family-name:var(--font-noto-serif)]">{TRAIT_LABELS[tmpl.trait]}</span>
                    <button type="button" onClick={() => handleRelease(uc.id)}
                      className="w-[22px] h-[22px] rounded flex items-center justify-center text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="放生">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}