"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { ensureAuth } from "@/lib/auth";
import { TIER_COLORS, TIER_LABELS, TRAIT_LABELS } from "@taiwu/shared/config/game";
import type { CricketTemplate, Tier } from "@taiwu/shared/types/cricket";

const imgProps = { unoptimized: true };

const gachaBtnClass = "w-[175px] h-[42px] rounded-lg border text-[18px] font-bold font-[family-name:var(--font-noto-serif)] transition-all active:scale-[0.98] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)]";
const gachaBtnActive = `${gachaBtnClass} border-[var(--color-gold)]/70 shadow-[0_0_12px_rgba(197,160,89,0.15)] text-[var(--color-gold)]`;
const gachaBtnInactive = `${gachaBtnClass} border-[var(--color-gold)]/30 text-[var(--color-gold)]/70 hover:border-[var(--color-gold)]/50`;

interface GachaResult {
  id: number;
  template_id: number;
  template: CricketTemplate;
}

export default function MarketPage() {
  const [selectedCount, setSelectedCount] = useState<1 | 5 | 10>(1);
  const [chances, setChances] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [results, setResults] = useState<GachaResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auth init + load chances
  useEffect(() => {
    ensureAuth();
    loadChances();
  }, []);

  const loadChances = async () => {
    try {
      const data = await api.getGachaChances();
      setChances(data.chances);
    } catch { /* ignore */ }
  };

  const handlePullOrBuy = async () => {
    if (isPulling || isPaying) return;
    setErrorMsg("");

    // 次数足够 → 直接抽
    if (chances >= selectedCount) {
      setIsPulling(true);
      try {
        const data = await api.pullGacha(selectedCount);
        setResults(data.results as GachaResult[]);
        setShowResults(true);
        setChances(c => c - selectedCount);
      } catch (e: any) {
        setErrorMsg(e.message || "抽笼失败");
      } finally {
        setIsPulling(false);
      }
      return;
    }

    // 次数不足 → 走支付
    setIsPaying(true);
    try {
      const productKey = `gacha_${selectedCount}`;
      // 1. 创建订单
      const order = await api.createPayOrder(productKey);

      if (order.mock) {
        // Mock 模式 — 直接确认支付
        const paid = await api.confirmPay(order.order_id);
        if (paid.success) {
          setChances(paid.chances);
          setErrorMsg("支付成功，开始抽笼...");
          // 支付成功 → 自动抽
          const data = await api.pullGacha(selectedCount);
          setResults(data.results as GachaResult[]);
          setShowResults(true);
          setChances(c => c - selectedCount);
          setErrorMsg("");
        }
      } else if (order.mweb_url) {
        // 真实 H5 支付 — 跳转到微信
        window.location.href = order.mweb_url;
      } else {
        setErrorMsg("支付功能暂未开通");
      }
    } catch (e: any) {
      if (e.message?.includes("402") || e.message?.includes("不足")) {
        setErrorMsg("抽奖次数不足");
      } else {
        setErrorMsg("支付失败");
      }
    } finally {
      setIsPaying(false);
    }
  };

  const closeResults = () => {
    setShowResults(false);
    setResults([]);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(/assets/backgrounds/bg-market.webp)" }}>
      <TopBar title="虫市" backHref="/" />

      <div className="relative z-10 flex h-[calc(100dvh-55px)]">
        {/* Left: Gacha Display */}
        <div className="w-1/2 flex flex-col items-center justify-center px-2">
          <div className="w-[120px] h-[120px] rounded-xl bg-[var(--color-bg-base)]/40 border border-[var(--color-gold)]/15 flex flex-col items-center justify-center">
            <div className="text-[var(--color-gold)] text-4xl mb-2 font-[family-name:var(--font-ma-shan)]">笼</div>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-ma-shan)]">开笼觅良虫</p>
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="w-1/2 flex flex-col items-center pt-12 px-2 gap-[14px]">
          {/* 剩余次数 */}
          <div className="w-[175px] text-center mb-2">
            <p className="text-[12px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">剩余次数</p>
            <p className="text-[28px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">{chances}</p>
          </div>

          {([1, 5, 10] as const).map((count) => (
            <button key={count} type="button" onClick={() => setSelectedCount(count)}
              className={selectedCount === count ? gachaBtnActive : gachaBtnInactive}>
              {chances >= count ? `开${count}笼` : `开${count}笼 ¥${count}`}
            </button>
          ))}

          <button type="button" onClick={handlePullOrBuy} disabled={isPulling || isPaying}
            className="w-[175px] h-[50px] rounded-lg border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-50">
            {isPaying ? "支付中..." : isPulling ? "开笼中..." : chances >= selectedCount ? "开笼！" : `购买并开笼 ¥${selectedCount}`}
          </button>

          {errorMsg && <p className="text-[13px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</p>}

          {/* Probability table */}
          <div className="mt-6 w-[175px]">
            <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] mb-2">概率公示</p>
            <div className="space-y-1 text-[11px] font-[family-name:var(--font-noto-serif)]">
              <div className="flex justify-between"><span style={{ color: "#a0a0a0" }}>普通</span><span style={{ color: "#4a90d9", fontWeight: "bold" }}>48%</span></div>
              <div className="flex justify-between"><span style={{ color: "#4a90d9" }}>稀有</span><span style={{ color: "#4a90d9", fontWeight: "bold" }}>30%</span></div>
              <div className="flex justify-between"><span style={{ color: "#8b5cf6" }}>史诗</span><span style={{ color: "#4a90d9", fontWeight: "bold" }}>15%</span></div>
              <div className="flex justify-between"><span style={{ color: "#c5a059" }}>传说</span><span style={{ color: "#4a90d9", fontWeight: "bold" }}>7%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Results overlay */}
      {showResults && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-4" onClick={closeResults}>
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-3 py-6 px-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)] text-center">开笼结果</p>
            <div className="grid grid-cols-3 gap-2">
              {results.map((r) => {
                const tmpl = r.template;
                if (!tmpl) return null;
                const tierColor = TIER_COLORS[tmpl.tier as Tier]?.text || "#a0a0a0";
                const imgSrc = tmpl.imageKey || `/assets/crickets/cricket-${String(((tmpl.id - 1) % 6) + 1).padStart(3, "0")}-thumb.png`;
                return (
                  <div key={r.id} className="flex flex-col items-center p-2 rounded-lg border border-[var(--color-gold)]/15 bg-[rgba(20,14,10,0.6)]">
                    <Image src={imgSrc} alt={tmpl.name} width={60} height={50} {...imgProps} className="object-contain" />
                    <span className="text-[12px] font-bold font-[family-name:var(--font-noto-serif)] mt-1" style={{ color: tierColor }}>{tmpl.name}</span>
                    <span className="text-[9px] px-1 rounded font-[family-name:var(--font-noto-serif)]" style={{ color: tierColor, backgroundColor: tierColor + "18" }}>{TIER_LABELS[tmpl.tier]}</span>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={closeResults}
              className="w-full h-[44px] rounded-lg border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all">
              收下
            </button>
          </div>
        </div>
      )}

      {/* Marquee */}
      <div className="absolute bottom-[34px] left-0 right-0 z-[10] h-9 bg-[rgba(20,14,10,0.7)] border-t border-[var(--color-gold)]/15 flex items-center overflow-hidden">
        <div className="whitespace-nowrap text-[12px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">
          玩家***抽到了【传说】赤牙将军 &nbsp;|&nbsp; 玩家***抽到了【稀有】青头大王 &nbsp;|&nbsp; 玩家***抽到了【史诗】紫翅飞将
        </div>
      </div>
    </div>
  );
}