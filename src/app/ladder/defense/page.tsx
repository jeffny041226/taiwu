"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { api } from "@/lib/api";
import { ensureAuth } from "@/lib/auth";
import type { CricketTemplate } from "@taiwu/shared/types/cricket";
import { TIER_COLORS, TIER_LABELS } from "@taiwu/shared/config/game";
import type { Tier } from "@taiwu/shared/types/cricket";

const imgProps = { unoptimized: true };

export default function DefensePage() {
  const router = useRouter();
  const [myCrickets, setMyCrickets] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { ensureAuth(); }, []);

  useEffect(() => {
    Promise.all([
      api.getCrickets(),
      api.getDefense(),
    ]).then(([cData, dData]) => {
      setMyCrickets(cData.crickets);
      if (dData.cricketIds?.length > 0) {
        setSelectedIds(dData.cricketIds);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleCricket = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setMsg("");
  };

  const handleSave = async () => {
    if (selectedIds.length !== 3) {
      setMsg("请选择 3 只蛐蛐作为防守阵容");
      return;
    }
    setSaving(true); setMsg("");
    try {
      await api.setDefense(selectedIds);
      setMsg("保存成功");
      setTimeout(() => router.back(), 800);
    } catch (e: any) {
      setMsg(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingOverlay visible message="加载中..." />;

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      <div className="fixed inset-0 -z-10" style={{ backgroundImage: "url(/assets/backgrounds/bg-backpack.webp)", backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 -z-10 bg-black/50" />

      <TopBar title="布阵" backHref="/ladder" />

      {/* Selected preview */}
      <div className="flex justify-center gap-3 py-4 px-4">
        {[0, 1, 2].map(i => {
          const cid = selectedIds[i];
          const cricket = cid ? myCrickets.find(c => c.id === cid) : null;
          const tmpl = cricket?.template as CricketTemplate | undefined;
          const src = tmpl?.imageKey || (tmpl ? `/assets/crickets/cricket-${String(((tmpl.id - 1) % 6) + 1).padStart(3, "0")}-thumb.png` : "");
          return (
            <div key={i} className="w-[100px] h-[88px] rounded-lg border-2 border-dashed border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.4)] flex items-center justify-center">
              {cricket ? (
                <div className="flex flex-col items-center">
                  <Image src={src} alt="" width={44} height={36} {...imgProps} className="object-contain" />
                  <span className="text-[11px] text-[var(--color-gold)] mt-1 font-[family-name:var(--font-noto-serif)]">{tmpl?.name}</span>
                </div>
              ) : (
                <span className="text-[var(--color-text-muted)] text-[28px] font-[family-name:var(--font-noto-serif)]">空</span>
              )}
            </div>
          );
        })}
      </div>

      {msg && <p className={`text-center text-[13px] mb-2 font-[family-name:var(--font-noto-serif)] ${msg.includes("成功") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}

      {/* Cricket grid */}
      <div className="px-4 pb-24">
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-2 font-[family-name:var(--font-noto-serif)]">选择 3 只蛐蛐作为防守阵容</p>
        <div className="grid grid-cols-2 gap-2">
          {myCrickets.map((c: any) => {
            const tmpl = c.template as CricketTemplate | undefined;
            if (!tmpl) return null;
            const selected = selectedIds.includes(c.id);
            const tierColor = TIER_COLORS[tmpl.tier as Tier]?.text || "#a0a0a0";
            const src = tmpl.imageKey || `/assets/crickets/cricket-${String(((tmpl.id - 1) % 6) + 1).padStart(3, "0")}-thumb.png`;
            return (
              <button key={c.id} type="button" onClick={() => toggleCricket(c.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left ${selected ? "border-[var(--color-gold)] bg-[rgba(197,160,89,0.1)] shadow-[0_0_8px_rgba(197,160,89,0.1)]" : "border-white/5 bg-[rgba(20,14,10,0.6)]"}`}>
                <Image src={src} alt="" width={40} height={32} {...imgProps} className="object-contain flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate font-[family-name:var(--font-noto-serif)]" style={{ color: tierColor }}>{tmpl.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">{tmpl.title} · {TIER_LABELS[tmpl.tier]}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">攻{c.attack} 防{c.defense} 速{c.speed}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 pb-[34px] flex justify-center">
        <button type="button" onClick={handleSave} disabled={saving}
          className="w-[342px] h-[50px] rounded-[10px] border border-[var(--color-gold)]/40 bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-40">
          {saving ? "保存中..." : "保存防守阵容"}
        </button>
      </div>
    </div>
  );
}
