"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { ensureAuth } from "@/lib/auth";
import { getCricketImageUrl } from "@/lib/image-loader";
import { TIER_COLORS, TIER_LABELS } from "@taiwu/shared/config/game";
import type { CricketTemplate } from "@taiwu/shared/types/cricket";

const imgProps = { unoptimized: true };

const TIER_ORDER: Record<string, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

interface HandbookEntry {
  template: CricketTemplate;
  owned: boolean;
}

function templateImage(tmpl: CricketTemplate): string {
  return getCricketImageUrl(tmpl.imageKey, tmpl.id);
}

export default function HandbookPage() {
  const [entries, setEntries] = useState<HandbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    ensureAuth().then(async (auth) => {
      if (!auth) return;
      try {
        const [templatesData, cricketsData] = await Promise.all([
          api.getTemplates(),
          api.getCrickets(),
        ]);
        const ownedIds = new Set(
          cricketsData.crickets.map((c: any) => c.template_id ?? c.template?.id)
        );
        const merged: HandbookEntry[] = templatesData.templates.map((tmpl) => ({
          template: tmpl,
          owned: ownedIds.has(tmpl.id),
        }));
        merged.sort((a, b) => {
          const tierDiff = (TIER_ORDER[b.template.tier] ?? 0) - (TIER_ORDER[a.template.tier] ?? 0);
          if (tierDiff !== 0) return tierDiff;
          return a.template.id - b.template.id;
        });
        setEntries(merged);
      } catch (e: any) {
        setErrorMsg(e.message || "加载失败");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="w-full min-h-[100dvh]">
      <div className="fixed inset-0 -z-10" style={{ backgroundImage: "url(/assets/backgrounds/bg-backpack.webp)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }} />
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} />
      <div className="relative z-10">
        <TopBar title="图鉴" backHref="/" />

        {errorMsg && (
          <div className="px-4 py-2 text-center text-[13px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</div>
        )}

        <div className="px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">加载中...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-[16px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">暂无蛐蛐图鉴</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {entries.map(({ template: tmpl, owned }) => {
                const tierColor = TIER_COLORS[tmpl.tier]?.text ?? "#a0a0a0";
                return (
                  <div key={tmpl.id}
                    className={`w-[173px] h-[215px] rounded-xl border border-[var(--color-gold)]/15 flex flex-col items-center relative ${owned ? "bg-[var(--color-bg-base)]/40" : "bg-[var(--color-bg-base)]/30"}`}>
                    {/* 品质标签 */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold font-[family-name:var(--font-noto-serif)]"
                      style={{ color: tierColor, backgroundColor: `${tierColor}30` }}>{TIER_LABELS[tmpl.tier]}</div>

                    {/* 蛐蛐图片 */}
                    <div className={`w-[120px] h-[80px] mt-5 mb-1 flex items-center justify-center ${!owned ? "grayscale opacity-60" : ""}`}>
                      <Image src={templateImage(tmpl)} alt={tmpl.name} width={120} height={80} {...imgProps} className="object-contain" />
                    </div>

                    {/* 名称 + 称号 */}
                    <div className={!owned ? "grayscale opacity-60" : ""}>
                      <p className="text-[15px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{tmpl.name}</p>
                      <p className="text-[12px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] mb-1">{tmpl.title}</p>
                    </div>

                    {/* 已拥有 / 去拥有 */}
                    <div className="flex-1 flex items-end pb-3">
                      {owned ? (
                        <span className="text-[12px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">已拥有</span>
                      ) : (
                        <Link href="/market"
                          className="px-3 py-1 rounded-lg text-[12px] font-bold text-white bg-[#4a90d9] font-[family-name:var(--font-noto-serif)] hover:bg-[#3a7bc8] active:scale-95 transition-all">
                          去拥有
                        </Link>
                      )}
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
