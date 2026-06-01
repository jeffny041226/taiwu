"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import { ensureAuth } from "@/lib/auth";
import { getCricketImageUrl } from "@/lib/image-loader";
import { useAudio } from "@/hooks/useAudio";
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
  const [pendingPayment, setPendingPayment] = useState<{ orderId: string; amount: number } | null>(null);
  const [showRedeemInput, setShowRedeemInput] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemPreview, setRedeemPreview] = useState<CricketTemplate | null>(null);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false);
  const [redeemResult, setRedeemResult] = useState<GachaResult | null>(null);
  const [showRedeemResult, setShowRedeemResult] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  // Audio
  const { playBgm, stopBgm, playSfx } = useAudio();
  useEffect(() => { playBgm("market"); return () => { stopBgm(); }; }, [playBgm, stopBgm]);

  // Auth init + load chances
  useEffect(() => {
    ensureAuth();
    loadChances();
  }, []);

  // 检查是否从微信 H5 支付返回
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payOrderId = params.get("pay_order");
    if (!payOrderId) return;

    // 清除 URL 参数
    window.history.replaceState(null, "", "/market");

    // 轮询查询支付结果
    const poll = async () => {
      try {
        const status = await api.payStatus(payOrderId);
        if (status.paid) {
          setChances(status.chances);
          setErrorMsg("支付成功，开始抽笼...");

          // 自动抽卡
          playSfx("gachaOpen");
          const data = await api.pullGacha(selectedCount);
          setResults(data.results as GachaResult[]);
          setShowResults(true);
          setChances(c => c - selectedCount);
          setErrorMsg("");
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    // 立即查一次，失败则 2 秒后再查
    poll().then(done => {
      if (!done) {
        const timer = setTimeout(() => { poll(); }, 2000);
        return () => clearTimeout(timer);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        playSfx("gachaOpen");
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
      const order = await api.createPayOrder(productKey);

      if (order.mock) {
        // Mock 模式 — 弹出支付确认框
        setPendingPayment({ orderId: order.order_id, amount: selectedCount });
        return;
      } else if (order.mweb_url) {
        // 真实 H5 支付 — 保存订单ID，跳转微信
        // 微信支付完成后会跳回 /market?pay_order=xxx
        const redirectUrl = `${window.location.origin}/market?pay_order=${order.order_id}`;
        window.location.href = `${order.mweb_url}&redirect_url=${encodeURIComponent(redirectUrl)}`;
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

  const confirmMockPayment = async () => {
    if (!pendingPayment) return;
    setIsPaying(true);
    try {
      const paid = await api.confirmPay(pendingPayment.orderId);
      if (paid.success) {
        setChances(paid.chances);
        setErrorMsg("支付成功，开始抽笼...");
        playSfx("gachaOpen");
        const data = await api.pullGacha(selectedCount);
        setResults(data.results as GachaResult[]);
        setShowResults(true);
        setChances(c => c - selectedCount);
        setErrorMsg("");
      }
    } catch {
      setErrorMsg("支付确认失败");
    } finally {
      setIsPaying(false);
      setPendingPayment(null);
    }
  };

  const cancelMockPayment = () => {
    setPendingPayment(null);
  };

  // Gacha reveal SFX
  useEffect(() => {
    if (!showResults || results.length === 0) return;
    playSfx("gachaReveal");
    const hasLegendary = results.some(r => r.template?.tier === "legendary");
    if (hasLegendary) {
      setTimeout(() => playSfx("gachaLegendary"), 600);
    }
  }, [showResults, results, playSfx]);

  const closeResults = () => {
    setShowResults(false);
    setResults([]);
  };

  const handleRedeemPreview = async () => {
    if (!redeemCode.trim()) {
      setRedeemError("请输入兑换码");
      return;
    }
    setRedeemError("");
    try {
      const data = await api.previewRedeemCode(redeemCode.trim());
      if (data.is_used) {
        setRedeemError("该兑换码已被使用");
        return;
      }
      setRedeemPreview(data.template);
      setShowRedeemInput(false);
      setShowRedeemConfirm(true);
    } catch (e: any) {
      setRedeemError(e.message || "无效的兑换码");
    }
  };

  const handleRedeemUse = async () => {
    setIsRedeeming(true);
    try {
      const data = await api.useRedeemCode(redeemCode.trim());
      setRedeemResult(data.result as GachaResult);
      setShowRedeemConfirm(false);
      setShowRedeemResult(true);
      setRedeemCode("");
    } catch (e: any) {
      setRedeemError(e.message || "兑换失败");
      setShowRedeemConfirm(false);
    } finally {
      setIsRedeeming(false);
    }
  };

  const closeRedeemResult = () => {
    setShowRedeemResult(false);
    setRedeemResult(null);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-cover bg-center" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(/assets/backgrounds/bg-market.webp)" }}>
      <TopBar title="虫市" backHref="/" />

      <div className="relative z-10 flex flex-col items-center h-[calc(100dvh-55px)] px-4">

        {/* 笼 + 概率 并列 — 顶部 */}
        <div className="pt-[calc(16px+100px)]">
          <div className="flex items-start gap-6">
            <div className="w-[120px] h-[120px] rounded-xl bg-[var(--color-bg-base)]/40 border border-[var(--color-gold)]/15 flex flex-col items-center justify-center shrink-0">
              <div className="text-[var(--color-gold)] text-4xl mb-2 font-[family-name:var(--font-ma-shan)]">笼</div>
              <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-ma-shan)]">开笼觅良虫</p>
            </div>
            <div>
              <p className="text-[14px] text-[var(--color-gold)] font-bold font-[family-name:var(--font-noto-serif)] mb-2">概率公示</p>
              <div className="space-y-1 text-[11px] font-[family-name:var(--font-noto-serif)]">
                <div className="flex items-center"><span style={{ color: "#a0a0a0", fontWeight: "bold" }}>普通</span><span style={{ color: "#f0a040", fontWeight: "bold", marginLeft: 30 }}>48%</span></div>
                <div className="flex items-center"><span style={{ color: "#4a90d9", fontWeight: "bold" }}>稀有</span><span style={{ color: "#f0a040", fontWeight: "bold", marginLeft: 30 }}>30%</span></div>
                <div className="flex items-center"><span style={{ color: "#8b5cf6", fontWeight: "bold" }}>史诗</span><span style={{ color: "#f0a040", fontWeight: "bold", marginLeft: 30 }}>15%</span></div>
                <div className="flex items-center"><span style={{ color: "#c5a059", fontWeight: "bold" }}>传说</span><span style={{ color: "#f0a040", fontWeight: "bold", marginLeft: 30 }}>7%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮区域 */}
        <div className="mt-auto flex flex-col items-center gap-3 pb-8 -translate-y-[100px]">
          {([1, 5, 10] as const).map((count) => (
            <button key={count} type="button" onClick={() => setSelectedCount(count)}
              className={selectedCount === count ? gachaBtnActive : gachaBtnInactive}>
              {chances >= count ? `开${count}笼` : `开${count}笼`}
            </button>
          ))}

          <button type="button" onClick={handlePullOrBuy} disabled={isPulling || isPaying}
            className="w-[175px] h-[50px] rounded-lg border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-50">
            {isPaying ? "支付中..." : isPulling ? "开笼中..." : chances >= selectedCount ? "开笼！" : `购买并开笼 ¥${selectedCount}`}
          </button>

          {errorMsg && <p className="text-[13px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</p>}

          <button type="button" onClick={() => { setShowRedeemInput(true); setRedeemCode(""); setRedeemError(""); }}
            className="w-[175px] h-[42px] rounded-lg border border-[var(--color-gold)]/40 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[16px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all">
            兑换码
          </button>
        </div>
      </div>

      {/* Payment confirmation overlay (mock mode) */}
      {pendingPayment && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-5 py-6 px-5">
            <p className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)] text-center">确认支付</p>

            <div className="flex flex-col items-center gap-2">
              <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">
                开{pendingPayment.amount}笼
              </p>
              <p className="text-[32px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
                ¥{pendingPayment.amount}
              </p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={cancelMockPayment}
                className="flex-1 h-[44px] rounded-lg border border-[var(--color-gold)]/20 text-[16px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/40 active:scale-[0.98] transition-all">
                取消
              </button>
              <button type="button" onClick={confirmMockPayment} disabled={isPaying}
                className="flex-1 h-[44px] rounded-lg border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[16px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-50">
                {isPaying ? "支付中..." : "确认支付"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results overlay */}
      {showResults && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-4" onClick={closeResults}>
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-3 py-6 px-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)] text-center">开笼结果</p>
            <div className="flex flex-wrap justify-center gap-2">
              {results.map((r) => {
                const tmpl = r.template;
                if (!tmpl) return null;
                const tierColor = TIER_COLORS[tmpl.tier as Tier]?.text || "#a0a0a0";
                const imgSrc = getCricketImageUrl(tmpl.imageKey, tmpl.id);
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

      {/* Redeem input overlay */}
      {showRedeemInput && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-5 py-6 px-5">
            <p className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)] text-center">输入兑换码</p>
            <input type="text" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="TW-XXXX-XXXX-XXXX"
              className="w-full h-[44px] rounded-lg border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.6)] text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] text-center placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold)]/70" />
            {redeemError && <p className="text-[13px] text-red-400 text-center font-[family-name:var(--font-noto-serif)]">{redeemError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowRedeemInput(false); setRedeemCode(""); setRedeemError(""); }}
                className="flex-1 h-[44px] rounded-lg border border-[var(--color-gold)]/20 text-[16px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/40 active:scale-[0.98] transition-all">取消</button>
              <button type="button" onClick={handleRedeemPreview}
                className="flex-1 h-[44px] rounded-lg border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[16px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem confirm overlay */}
      {showRedeemConfirm && redeemPreview && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-5 py-6 px-5">
            <p className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)] text-center">确认兑换</p>
            <div className="flex flex-col items-center gap-2">
              <Image src={getCricketImageUrl(redeemPreview.imageKey, redeemPreview.id)} alt={redeemPreview.name} width={80} height={60} {...imgProps} className="object-contain" />
              <p className="text-[18px] font-bold font-[family-name:var(--font-noto-serif)]" style={{ color: TIER_COLORS[redeemPreview.tier as Tier]?.text }}>{redeemPreview.name}</p>
              <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">{redeemPreview.title}</p>
              <span className="px-2 py-0.5 rounded text-[12px] font-[family-name:var(--font-noto-serif)]" style={{ color: TIER_COLORS[redeemPreview.tier as Tier]?.text, backgroundColor: (TIER_COLORS[redeemPreview.tier as Tier]?.text || "#a0a0a0") + "18" }}>{TIER_LABELS[redeemPreview.tier]}</span>
            </div>
            {redeemError && <p className="text-[13px] text-red-400 text-center font-[family-name:var(--font-noto-serif)]">{redeemError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowRedeemConfirm(false); setRedeemPreview(null); setRedeemError(""); }}
                className="flex-1 h-[44px] rounded-lg border border-[var(--color-gold)]/20 text-[16px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/40 active:scale-[0.98] transition-all">取消</button>
              <button type="button" onClick={handleRedeemUse} disabled={isRedeeming}
                className="flex-1 h-[44px] rounded-lg border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[16px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-50">
                {isRedeeming ? "兑换中..." : "确认兑换"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem result overlay */}
      {showRedeemResult && redeemResult && (
        <div className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/85 backdrop-blur-sm flex items-center justify-center px-4" onClick={closeRedeemResult}>
          <div className="w-full max-w-[342px] rounded-2xl border border-[var(--color-gold)]/40 bg-[rgba(20,14,10,0.9)] flex flex-col gap-3 py-6 px-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)] text-center">兑换成功</p>
            <div className="flex flex-col items-center p-2">
              {(() => {
                const tmpl = redeemResult.template;
                if (!tmpl) return null;
                const tierColor = TIER_COLORS[tmpl.tier as Tier]?.text || "#a0a0a0";
                const imgSrc = getCricketImageUrl(tmpl.imageKey, tmpl.id);
                return (
                  <div className="flex flex-col items-center p-4 rounded-lg border border-[var(--color-gold)]/20 bg-[rgba(20,14,10,0.6)]">
                    <Image src={imgSrc} alt={tmpl.name} width={100} height={80} {...imgProps} className="object-contain" />
                    <span className="text-[18px] font-bold font-[family-name:var(--font-noto-serif)] mt-2" style={{ color: tierColor }}>{tmpl.name}</span>
                    <span className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">{tmpl.title}</span>
                    <span className="text-[12px] px-2 py-0.5 rounded font-[family-name:var(--font-noto-serif)] mt-1" style={{ color: tierColor, backgroundColor: tierColor + "18" }}>{TIER_LABELS[tmpl.tier]}</span>
                  </div>
                );
              })()}
            </div>
            <button type="button" onClick={closeRedeemResult}
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