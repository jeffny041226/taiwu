"use client";

import { useState, use, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { CRICKET_TEMPLATES, getCricketThumb } from "@/data/cricket-templates";
import { CRICKET_SELECTION_TIMEOUT, TIER_COLORS, TRAIT_LABELS, TIER_LABELS, MIN_CRICKETS_TO_BATTLE } from "@/config/game";
import { useCountdown } from "@/hooks/useCountdown";

interface RoomPlayer {
  uid: string;
  nickName: string;
  ready?: boolean;
}

interface RoomState {
  roomId: string;
  phase: string;
  leftScore: number;
  rightScore: number;
  leftPlayer: RoomPlayer | null;
  rightPlayer: RoomPlayer | null;
  selectionRemaining?: number;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const myUid = searchParams.get("uid") || `user-${Math.random().toString(36).slice(2, 8)}`;
  const fromMatch = searchParams.get("from") === "match";
  const [phase, setPhase] = useState("waiting");
  const [opponent, setOpponent] = useState<RoomPlayer | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isReady, setIsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const autoReady = useCallback(() => {
    if (!isReady && wsRef.current?.readyState === WebSocket.OPEN) {
      const autoIds = CRICKET_TEMPLATES.slice(0, MIN_CRICKETS_TO_BATTLE).map(t => t.id);
      setSelectedIds(autoIds);
      setIsReady(true);
      wsRef.current.send(JSON.stringify({
        type: "battle:ready",
        payload: { roomId: roomId.toUpperCase(), uid: myUid, cricketIds: autoIds },
      }));
    }
  }, [isReady, myUid, roomId]);

  const { count, isRunning, start, stop, reset } = useCountdown(CRICKET_SELECTION_TIMEOUT, autoReady);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const envHost = process.env.NEXT_PUBLIC_WS_HOST;
    const host = (envHost && envHost !== "localhost") ? envHost : window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    const ws = new WebSocket(protocol + "://" + host + ":" + port + "/ws/battle");
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      setErrorMsg("");
      ws.send(JSON.stringify({
        type: "room:join",
        payload: { roomId: roomId.toUpperCase(), uid: myUid, nickName: "玩家" },
      }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:state") {
          const s: RoomState = msg.payload;
          setPhase(s.phase);

          // 检测对手: uid 不是自己的就是对手
          const opp = s.leftPlayer?.uid !== myUid ? s.leftPlayer : s.rightPlayer;
          if (opp && opp.uid !== myUid) {
            setOpponent(opp);
            setOpponentReady(opp.ready ?? false);
          }

          // 重连时同步倒计时
          if (s.phase === "ready" && s.selectionRemaining && !isRunning) {
            reset(s.selectionRemaining);
            start();
          }

          // 战斗开始 → 跳转战斗页
          if (s.phase === "battling") {
            stop();
            window.location.href = "/battle/" + roomId + "?uid=" + myUid + (fromMatch ? "&from=match" : "");
          }
        } else if (msg.type === "room:joined") {
          const s: RoomState = msg.payload;
          setPhase(s.phase);
          const opp = s.leftPlayer?.uid !== myUid ? s.leftPlayer : s.rightPlayer;
          if (opp && opp.uid !== myUid) {
            setOpponent(opp);
            setOpponentReady(opp.ready ?? false);
          }
        } else if (msg.type === "room:selectionStart") {
          const timeout = msg.payload.timeout as number || CRICKET_SELECTION_TIMEOUT;
          reset(timeout);
          start();
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "错误");
        }
      } catch {}
    };

    ws.onclose = () => setConnecting(true);
    ws.onerror = () => setErrorMsg("连接失败");

    return () => { ws.close(); };
  }, [roomId, myUid]);

  const toggleSelect = (id: number) => {
    if (isReady) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else if (selectedIds.length < MIN_CRICKETS_TO_BATTLE) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleReady = () => {
    if (selectedIds.length !== MIN_CRICKETS_TO_BATTLE || isReady) return;
    setIsReady(true);
    wsRef.current?.send(JSON.stringify({
      type: "battle:ready",
      payload: { roomId: roomId.toUpperCase(), uid: myUid, cricketIds: selectedIds },
    }));
  };

  const tierColorMap: Record<string, string> = {
    common: TIER_COLORS.common.text,
    rare: TIER_COLORS.rare.text,
    epic: TIER_COLORS.epic.text,
    legendary: TIER_COLORS.legendary.text,
  };

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      <TopBar title={phase === "ready" ? "选蛐蛐" : "房间"} backHref="/" />

      {/* 房间号 */}
      <div className="flex justify-center py-2">
        <div className="w-[140px] h-9 rounded-[18px] bg-[rgba(20,14,10,0.8)] border border-[var(--color-gold)]/20 flex items-center justify-center">
          <span className="text-[22px] font-bold text-[var(--color-gold)] tracking-[6px] font-[family-name:var(--font-noto-serif)]">{roomId.toUpperCase()}</span>
        </div>
      </div>

      {/* 等待阶段 */}
      {phase === "waiting" && (
        <div className="flex flex-col items-center gap-2 pt-6">
          <div className="text-[48px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)]/30">⚔</div>
          <p className="text-[16px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">等待对手加入...</p>
          <p className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">将房间号分享给好友即可开始对战</p>
          {errorMsg && <p className="text-[13px] text-red-400">{errorMsg}</p>}
        </div>
      )}

      {/* 选蛐蛐阶段 */}
      {phase === "ready" && (
        <div className="flex flex-col items-center px-4">
          {/* 倒计时 */}
          <div className="flex items-center gap-2 py-2">
            <div className="w-[48px] h-[48px] rounded-full border-2 border-[var(--color-gold)]/60 flex items-center justify-center bg-[rgba(20,14,10,0.8)]">
              <span className={"text-[28px] font-[family-name:var(--font-ma-shan)] " + (count <= 5 ? "text-red-400 animate-pulse" : "text-[var(--color-gold)]")}>{count}</span>
            </div>
            <span className="text-[12px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">选蛐蛐倒计时</span>

            {/* 对手状态 */}
            {opponent && (
              <div className="ml-4 flex items-center gap-1.5">
                <div className={"w-2.5 h-2.5 rounded-full " + (opponentReady ? "bg-green-400 animate-pulse" : "bg-[var(--color-text-muted)]")} />
                <span className="text-[11px] font-[family-name:var(--font-noto-serif)]">
                  {opponentReady ? "对手已就绪" : "对手选蛐蛐中..."}
                </span>
              </div>
            )}
          </div>

          {/* 已选展示 */}
          <div className="flex items-center gap-2 w-full max-w-[358px] mb-2">
            <span className="text-[13px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
              已选 {selectedIds.length}/{MIN_CRICKETS_TO_BATTLE} 只蛐蛐
            </span>
            <div className="flex-1 flex gap-2">
              {Array.from({ length: MIN_CRICKETS_TO_BATTLE }, (_, i) => i).map(slot => {
                const tmpl = selectedIds[slot] ? CRICKET_TEMPLATES.find(t => t.id === selectedIds[slot]) : null;
                return (
                  <div key={slot} className={"w-[56px] h-[56px] rounded-lg flex flex-col items-center justify-center " + (tmpl ? "border border-[var(--color-gold)]/50 bg-[rgba(20,14,10,0.6)]" : "border border-white/5 bg-[rgba(20,14,10,0.3)]")}>
                    {tmpl ? (
                      <>
                        <Image src={getCricketThumb(tmpl.id)} alt={tmpl.name} width={32} height={28} unoptimized className="object-contain" />
                        <span className="text-[8px] truncate max-w-[50px]" style={{ color: tierColorMap[tmpl.tier] }}>{tmpl.name}</span>
                      </>
                    ) : (
                      <span className="text-[20px] text-[var(--color-text-muted)]/30 font-[family-name:var(--font-ma-shan)]">?</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 蛐蛐列表 */}
          <div className="w-full max-w-[358px] overflow-y-auto flex-1" style={{ maxHeight: "420px" }}>
            <div className="grid grid-cols-2 gap-2">
              {CRICKET_TEMPLATES.map(tmpl => {
                const isSelected = selectedIds.includes(tmpl.id);
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => toggleSelect(tmpl.id)}
                    disabled={isReady}
                    className={"relative flex items-center gap-2 p-2 rounded-lg transition-all " + (isSelected ? "border-2 border-[var(--color-gold)] bg-[rgba(197,160,89,0.12)] shadow-[0_0_8px_rgba(197,160,89,0.2)]" : "border border-white/5 bg-[rgba(20,14,10,0.6)] hover:border-[var(--color-gold)]/30") + (isReady ? " opacity-50 pointer-events-none" : "")}
                  >
                    {/* 选中标记 */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-[10px] text-[var(--color-bg-base)] font-bold">✓</div>
                    )}
                    {/* 缩略图 */}
                    <Image src={getCricketThumb(tmpl.id)} alt={tmpl.name} width={40} height={35} unoptimized className="object-contain flex-shrink-0" />
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-bold truncate font-[family-name:var(--font-noto-serif)]" style={{ color: tierColorMap[tmpl.tier] }}>{tmpl.name}</span>
                        <span className="text-[8px] px-1 rounded" style={{ color: tierColorMap[tmpl.tier], backgroundColor: tierColorMap[tmpl.tier] + "18" }}>{TIER_LABELS[tmpl.tier]}</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-[family-name:var(--font-ma-shan)]">{tmpl.title}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] px-1 rounded bg-[rgba(197,160,89,0.06)] text-[var(--color-gold)]/80">{TRAIT_LABELS[tmpl.trait]}</span>
                        <span className="text-[9px] text-[var(--color-text-muted)]">攻{tmpl.attack} 防{tmpl.defense} 速{tmpl.speed}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 准备按钮 */}
          <div className="w-full max-w-[358px] mt-3 pb-4">
            {errorMsg && <p className="text-[13px] text-red-400 text-center mb-2">{errorMsg}</p>}
            {isReady ? (
              <div className="h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.6)] flex items-center justify-center animate-pulse">
                <span className="text-[18px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">等待对手就绪...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleReady}
                disabled={selectedIds.length !== MIN_CRICKETS_TO_BATTLE}
                className={"w-full h-[50px] rounded-[10px] border transition-all font-[family-name:var(--font-noto-serif)] text-[18px] font-bold " + (selectedIds.length === MIN_CRICKETS_TO_BATTLE ? "border-[var(--color-gold)] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[var(--color-gold)] hover:border-[var(--color-gold)]/70 active:scale-[0.98]" : "border-white/5 bg-[rgba(20,14,10,0.4)] text-[var(--color-text-muted)] opacity-50 pointer-events-none")}
              >
                准备完成
              </button>
            )}
          </div>
        </div>
      )}

      <LoadingOverlay visible={connecting} message="连接房间中..." />
    </div>
  );
}