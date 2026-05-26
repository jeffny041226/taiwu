"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { api } from "@/lib/api";
import { ensureAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/useWebSocket";

const imgProps = { unoptimized: true };

interface LadderPlayer {
  rank: number;
  uid: string;
  nickName: string;
  avatar?: string;
  combatPower: number;
  isMe?: boolean;
}

export default function LadderPage() {
  const router = useRouter();
  const [myUid, setMyUid] = useState("");
  const [token, setToken] = useState("");
  const [myRank, setMyRank] = useState(0);
  const [myPower, setMyPower] = useState(1000);
  const [myWins, setMyWins] = useState(0);
  const [myLosses, setMyLosses] = useState(0);
  const [players, setPlayers] = useState<LadderPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTop100, setShowTop100] = useState(false);
  const [top100, setTop100] = useState<LadderPlayer[]>([]);
  const [challengeTarget, setChallengeTarget] = useState<LadderPlayer | null>(null);
  const [myCrickets, setMyCrickets] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [challenging, setChallenging] = useState(false);

  // Auth
  useEffect(() => {
    ensureAuth().then(auth => {
      if (auth) { setMyUid(auth.uid); setToken(auth.token); }
    });
  }, []);

  // Load ladder data
  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [posData, cricketData] = await Promise.all([
        api.getLadderPosition(),
        api.getCrickets(),
      ]);
      setMyRank(posData.myRank);
      setMyPower(posData.myCombatPower);
      setMyWins(posData.myWins ?? 0);
      setMyLosses(posData.myLosses ?? 0);
      setPlayers(posData.list);
      setMyCrickets(cricketData.crickets);
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (myUid) loadData(); }, [myUid, loadData]);

  // Load top100
  const openTop100 = async () => {
    setShowTop100(true);
    try {
      const data = await api.getLadderTop100();
      setTop100(data.list);
    } catch { /* ignore */ }
  };

  // Challenge flow
  const startChallenge = (player: LadderPlayer) => {
    if (player.isMe) return;
    setChallengeTarget(player);
    setSelectedIds([]);
  };

  const toggleCricket = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const doChallenge = () => {
    if (!challengeTarget || selectedIds.length !== 3 || !token) return;
    setChallenging(true);

    const cricketStats = selectedIds.map(id => {
      const c = myCrickets.find((x: any) => x.id === id);
      const t = c?.template;
      return {
        templateId: t?.id ?? 0,
        name: t?.name ?? "?",
        title: t?.title ?? "",
        tier: t?.tier ?? "common",
        trait: t?.trait ?? "fierce",
        attack: c?.attack ?? 10,
        defense: c?.defense ?? 10,
        speed: c?.speed ?? 10,
        maxHp: c?.maxHp ?? 100,
        maxStamina: c?.maxStamina ?? 100,
        spiritBase: c?.spiritBase ?? 100,
      };
    });

    router.push(
      `/battle/challenge?targetUid=${challengeTarget.uid}&targetName=${encodeURIComponent(challengeTarget.nickName)}&cricketIds=${selectedIds.join(",")}&cricketStats=${encodeURIComponent(JSON.stringify(cricketStats))}&token=${encodeURIComponent(token)}&myUid=${encodeURIComponent(myUid)}`
    );
  };

  if (loading) return <LoadingOverlay visible message="加载天梯..." />;

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      {/* Background */}
      <div className="fixed inset-0 -z-10" style={{ backgroundImage: "url(/assets/backgrounds/bg-home.webp)", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 -z-10 bg-black/50" />

      <TopBar title="战力天梯" backHref="/"
        rightSlot={<button type="button" onClick={openTop100}
          className="h-8 px-4 rounded-lg border border-[var(--color-gold)]/30 bg-[rgba(197,160,89,0.08)] text-[13px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/60 active:scale-95 transition-all whitespace-nowrap">
          排行榜
        </button>}
      />

      {/* My stats card */}
      <div className="mx-4 mt-4 p-4 rounded-xl border border-[var(--color-gold)]/20 bg-[rgba(20,14,10,0.8)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-gold)]/40 bg-[rgba(197,160,89,0.1)] flex items-center justify-center">
              <span className="text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">{myRank > 0 ? `#${myRank}` : "-"}</span>
            </div>
            <div>
              <p className="text-[16px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">战力 {myPower}</p>
              <p className="text-[12px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">{myWins}胜 {myLosses}负</p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-center text-red-400 text-[13px] mt-3 font-[family-name:var(--font-noto-serif)]">{error}</p>}

      {/* Player list */}
      <div className="mx-4 mt-3 pb-24 space-y-1.5">
        {players.map(p => (
          <div key={p.uid}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${p.isMe ? "border-[var(--color-gold)]/40 bg-[rgba(197,160,89,0.08)]" : "border-white/5 bg-[rgba(20,14,10,0.6)]"}`}>
            <span className="w-8 text-center text-[13px] font-bold text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">{p.rank}</span>
            <Image src={p.avatar || "/assets/avatars/avatar-default.png"} alt="" width={36} height={36} className="rounded-full border border-[var(--color-gold)]/20" {...imgProps} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] truncate">{p.nickName}{p.isMe ? " (我)" : ""}</p>
              <p className="text-[12px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">战力 {p.combatPower}</p>
            </div>
            {!p.isMe && (
              <button type="button" onClick={() => startChallenge(p)}
                className="h-8 px-3 rounded-lg border border-[var(--color-gold)]/30 bg-[rgba(197,160,89,0.06)] text-[12px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/60 active:scale-95 transition-all">
                挑战
              </button>
            )}
          </div>
        ))}
        {players.length === 0 && !error && (
          <p className="text-center text-[var(--color-text-muted)] text-[14px] mt-8 font-[family-name:var(--font-noto-serif)]">暂无其他玩家</p>
        )}
      </div>

      {/* Bottom: 布阵 button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 pb-[34px] flex justify-center">
        <Link href="/ladder/defense"
          className="w-[342px] h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/60 active:scale-[0.98] transition-all flex items-center justify-center">
          布阵
        </Link>
      </div>

      {/* Top100 overlay */}
      {showTop100 && (
        <div className="fixed inset-0 z-50 bg-[var(--color-bg-base)]/90 backdrop-blur-sm flex flex-col" onClick={() => setShowTop100(false)}>
          <div className="flex items-center justify-between px-4 h-[55px] border-b border-[var(--color-gold)]/15" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">全服排行</h2>
            <button type="button" onClick={() => setShowTop100(false)} className="text-[var(--color-text-secondary)] text-[24px]">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1" onClick={e => e.stopPropagation()}>
            {top100.map(p => (
              <div key={p.uid} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${p.uid === myUid ? "border-[var(--color-gold)]/30 bg-[rgba(197,160,89,0.06)]" : "border-white/5 bg-[rgba(20,14,10,0.4)]"}`}>
                <span className={`w-7 text-center text-[13px] font-bold font-[family-name:var(--font-noto-serif)] ${p.rank <= 3 ? "text-[var(--color-gold)]" : "text-[var(--color-text-secondary)]"}`}>
                  {p.rank <= 3 ? ["🥇","🥈","🥉"][p.rank - 1] : p.rank}
                </span>
                <Image src={p.avatar || "/assets/avatars/avatar-default.png"} alt="" width={32} height={32} className="rounded-full" {...imgProps} />
                <span className="flex-1 text-[13px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] truncate">{p.nickName}</span>
                <span className="text-[13px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">{p.combatPower}</span>
              </div>
            ))}
            {top100.length === 0 && <p className="text-center text-[var(--color-text-muted)] mt-8">加载中...</p>}
          </div>
        </div>
      )}

      {/* Challenge cricket selection overlay */}
      {challengeTarget && (
        <div className="fixed inset-0 z-50 bg-[var(--color-bg-base)]/90 backdrop-blur-sm flex flex-col" onClick={() => setChallengeTarget(null)}>
          <div className="flex items-center justify-between px-4 h-[55px] border-b border-[var(--color-gold)]/15" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setChallengeTarget(null)} className="text-[var(--color-text-secondary)] text-[16px] font-[family-name:var(--font-noto-serif)]">取消</button>
            <h2 className="text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)]">挑战 {challengeTarget.nickName}</h2>
            <button type="button" onClick={doChallenge} disabled={selectedIds.length !== 3 || challenging}
              className="h-8 px-3 rounded-lg border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[13px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] disabled:opacity-30 active:scale-95 transition-all">
              {challenging ? "..." : `挑战(${selectedIds.length}/3)`}
            </button>
          </div>
          {/* Selected slots */}
          <div className="flex justify-center gap-3 py-3 px-4" onClick={e => e.stopPropagation()}>
            {[0, 1, 2].map(i => {
              const cid = selectedIds[i];
              const cricket = cid ? myCrickets.find((c: any) => c.id === cid) : null;
              const tmpl = cricket?.template;
              const src = tmpl?.imageKey || (tmpl ? `/assets/crickets/cricket-${String(((tmpl.id - 1) % 6) + 1).padStart(3, "0")}-thumb.png` : "");
              return (
                <div key={i} className="w-[90px] h-[80px] rounded-lg border border-dashed border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.4)] flex items-center justify-center">
                  {cricket ? (
                    <div className="flex flex-col items-center">
                      <Image src={src} alt="" width={40} height={32} {...imgProps} className="object-contain" />
                      <span className="text-[11px] text-[var(--color-text-primary)] mt-1 truncate max-w-[80px]">{tmpl?.name}</span>
                    </div>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-[24px]">+</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Cricket grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              {myCrickets.map((c: any) => {
                const tmpl = c.template;
                if (!tmpl) return null;
                const selected = selectedIds.includes(c.id);
                const src = tmpl.imageKey || `/assets/crickets/cricket-${String(((tmpl.id - 1) % 6) + 1).padStart(3, "0")}-thumb.png`;
                return (
                  <button key={c.id} type="button" onClick={() => toggleCricket(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left ${selected ? "border-[var(--color-gold)] bg-[rgba(197,160,89,0.1)] shadow-[0_0_8px_rgba(197,160,89,0.1)]" : "border-white/5 bg-[rgba(20,14,10,0.6)]"}`}>
                    <Image src={src} alt="" width={40} height={32} {...imgProps} className="object-contain flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[var(--color-text-primary)] truncate">{tmpl.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{tmpl.title}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">攻{c.attack} 防{c.defense} 速{c.speed}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
