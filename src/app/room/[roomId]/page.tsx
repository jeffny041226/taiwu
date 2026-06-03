"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { CRICKET_SELECTION_TIMEOUT, TIER_COLORS, TRAIT_LABELS, TIER_LABELS, BATTLE_MODE, BATTLE_MODE_LABELS } from "@taiwu/shared/config/game";
import { useCountdown } from "@/hooks/useCountdown";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAudio } from "@/hooks/useAudio";
import { audioManager } from "@/lib/audio-manager";
import { ensureAuth, getLoginUrl } from "@/lib/auth";
import { api } from "@/lib/api";
import { getCricketImageUrl } from "@/lib/image-loader";
import type { CricketTemplate, Tier } from "@taiwu/shared/types/cricket";
import { ASSETS } from "@/config/assets";

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

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMatch = searchParams.get("from") === "match";
  const isPractice = searchParams.get("mode") === "practice";

  const [myUid, setMyUid] = useState("");
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState("waiting");
  const [opponent, setOpponent] = useState<RoomPlayer | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [crickets, setCrickets] = useState<{
    id: number; templateId: number; template: CricketTemplate;
    attack?: number; defense?: number; speed?: number;
    maxHp?: number; maxStamina?: number; spiritBase?: number;
  }[]>([]);

  // Auth init — redirect to /auth if no JWT
  useEffect(() => {
    ensureAuth().then(async (auth) => {
      if (!auth) {
        window.location.href = getLoginUrl();
        return;
      }
      setMyUid(auth.uid);
      setToken(auth.token);
      // Fetch user's crickets from backpack
      try {
        const data = await api.getCrickets();
        setCrickets(data.crickets.map(c => ({
          id: c.id,
          templateId: c.template_id,
          template: c.template as CricketTemplate,
          attack: (c as any).attack,
          defense: (c as any).defense,
          speed: (c as any).speed,
          maxHp: (c as any).maxHp,
          maxStamina: (c as any).maxStamina,
          spiritBase: (c as any).spiritBase,
        })));
      } catch { /* use empty fallback */ }
    });
  }, []);

  const wsReady = myUid && token;

  // Audio — BGM 受首页开关控制，进入播放退出停止
  const { playBgm, playSfx } = useAudio();
  useEffect(() => {
    playBgm("room");
    return () => { audioManager.stopBgm(); };
  }, [playBgm]);

  const autoReady = useCallback(() => {
    if (!isReady && wsReady) {
      const autoIds = crickets.length > 0 ? crickets.slice(0, 3).map(c => c.id) : [1, 2, 3];
      const selected = autoIds.map(id => crickets.find(c => c.id === id)).filter(Boolean);
      const cricketStats = selected.map(c => ({
        templateId: c!.templateId,
        name: c!.template.name,
        title: c!.template.title,
        tier: c!.template.tier,
        trait: c!.template.trait,
        attack: c!.attack,
        defense: c!.defense,
        speed: c!.speed,
        maxHp: c!.maxHp,
        maxStamina: c!.maxStamina,
        spiritBase: c!.spiritBase,
      }));
      setSelectedIds(autoIds);
      setIsReady(true);
      send("battle:ready", { roomId: roomId.toUpperCase(), uid: myUid, cricketIds: cricketStats.map(c => c.templateId), cricketStats });
    }
  }, [isReady, myUid, roomId, wsReady, crickets]);

  const { send, on, off, onEvent, offEvent } = useWebSocket(wsReady ? roomId : null, token);

  const { count, isRunning, start, stop, reset } = useCountdown(CRICKET_SELECTION_TIMEOUT, autoReady);

  // Room join SFX when opponent appears
  const prevOpponentRef = useRef(false);
  useEffect(() => {
    if (opponent && !prevOpponentRef.current) {
      prevOpponentRef.current = true;
      playSfx("roomJoin");
    }
    if (!opponent) prevOpponentRef.current = false;
  }, [opponent, playSfx]);

  // Countdown SFX (beep on last 5 seconds)
  useEffect(() => {
    if (isRunning && count <= 5 && count > 0) playSfx("countdown");
  }, [count, isRunning, playSfx]);

  // Register WS message handlers
  useEffect(() => {
    if (!wsReady) return;
    setConnecting(false);

    const handleState = (payload: unknown) => {
      const s: RoomState = payload as RoomState;
      setPhase(s.phase);
      const opp = s.leftPlayer?.uid !== myUid ? s.leftPlayer : s.rightPlayer;
      if (opp && opp.uid !== myUid) {
        setOpponent(opp);
        setOpponentReady(opp.ready ?? false);
      }
      if (s.phase === "ready" && s.selectionRemaining && !isRunning) {
        reset(s.selectionRemaining);
        start();
      }
      if (s.phase === "battling") {
        stop();
        const practiceParam = isPractice ? "&mode=practice" : "";
        // 用 router.push (软导航) 而非 window.location.href (硬刷新):
        // 硬刷新会重建 AudioContext 并停留在 suspended 状态,
        // 而对战页是自动出招, 用户不会点击, BGM 永远等不到 initAutoResume 触发。
        router.push("/battle/" + roomId + "?uid=" + myUid + (fromMatch ? "&from=match" : "") + practiceParam);
      }
    };

    const handleJoined = (payload: unknown) => {
      const s: RoomState = payload as RoomState;
      setPhase(s.phase);
      const opp = s.leftPlayer?.uid !== myUid ? s.leftPlayer : s.rightPlayer;
      if (opp && opp.uid !== myUid) {
        setOpponent(opp);
        setOpponentReady(opp.ready ?? false);
      }
    };

    const handleSelectionStart = (payload: unknown) => {
      const p = payload as { timeout?: number };
      const timeout = p.timeout || CRICKET_SELECTION_TIMEOUT;
      reset(timeout);
      start();
    };

    const handleError = (payload: unknown) => {
      const p = payload as { message?: string };
      setErrorMsg(p.message || "错误");
    };

    // Send room:join on connect
    send("room:join", { roomId: roomId.toUpperCase(), uid: myUid, nickName: "玩家" });

    on("room:state", handleState);
    on("room:joined", handleJoined);
    on("room:selectionStart", handleSelectionStart);
    on("room:error", handleError);

    // WS 重连后自动重发 room:join
    const handleReconnect = () => {
      console.log("[Room] WS reconnected, re-sending room:join for roomId=" + roomId);
      send("room:join", { roomId: roomId.toUpperCase(), uid: myUid, nickName: "玩家" });
    };
    onEvent("reconnect", handleReconnect);

    return () => {
      off("room:state", handleState);
      off("room:joined", handleJoined);
      off("room:selectionStart", handleSelectionStart);
      off("room:error", handleError);
      offEvent("reconnect", handleReconnect);
    };
  }, [wsReady, myUid, roomId, fromMatch, isPractice]);

  const toggleSelect = (id: number) => {
    if (isReady) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleReady = () => {
    if (selectedIds.length !== 3 || isReady) return;
    setIsReady(true);
    // Send cricket instance stats for per-instance variation
    const selected = selectedIds.map(id => crickets.find(c => c.id === id)).filter(Boolean);
    const cricketStats = selected.map(c => ({
      templateId: c!.templateId,
      name: c!.template.name,
      title: c!.template.title,
      tier: c!.template.tier,
      trait: c!.template.trait,
      attack: c!.attack,
      defense: c!.defense,
      speed: c!.speed,
      maxHp: c!.maxHp,
      maxStamina: c!.maxStamina,
      spiritBase: c!.spiritBase,
    }));
    send("battle:ready", { roomId: roomId.toUpperCase(), uid: myUid, cricketIds: cricketStats.map(c => c.templateId), cricketStats });
    playSfx("ready");
  };

  const tierColorMap: Record<string, string> = {
    common: TIER_COLORS.common.text,
    rare: TIER_COLORS.rare.text,
    epic: TIER_COLORS.epic.text,
    legendary: TIER_COLORS.legendary.text,
  };

  return (
    <div className="relative w-full min-h-[100dvh]">
      <div className="fixed inset-0 -z-10" style={{ backgroundImage: `url(${ASSETS.backgrounds.room})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className="fixed inset-0 -z-10 bg-black/40" />
      <TopBar title={phase === "ready" ? "选蛐蛐" : "房间"} backHref="/" />

      {/* 房间号 + 对战模式 */}
      <div className="flex justify-center items-center gap-3 py-2">
        <div className="w-[140px] h-9 rounded-[18px] bg-[rgba(20,14,10,0.8)] border border-[var(--color-gold)]/20 flex items-center justify-center">
          <span className="text-[22px] font-bold text-[var(--color-gold)] tracking-[6px] font-[family-name:var(--font-noto-serif)]">{roomId.toUpperCase()}</span>
        </div>
        <span className="text-[13px] px-2 py-1 rounded border border-[var(--color-gold)]/15 bg-[rgba(197,160,89,0.06)] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">{BATTLE_MODE_LABELS[BATTLE_MODE]}</span>
      </div>

      {/* 等待阶段 */}
      {phase === "waiting" && (
        <div className="flex flex-col items-center gap-2 pt-6">
          <div className="text-[48px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)]/55 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">⚔</div>
          <p className="text-[16px] font-bold text-white font-[family-name:var(--font-noto-serif)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">等待对手加入...</p>
          <p className="text-[13px] text-[var(--color-gold)]/85 font-[family-name:var(--font-noto-serif)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">将房间号分享给好友即可开始对战</p>
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
            <span className="text-[12px] text-white font-[family-name:var(--font-noto-serif)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">选蛐蛐倒计时</span>

            {/* 对手状态 */}
            {opponent && (
              <div className="ml-4 flex items-center gap-1.5">
                <div className={"w-2.5 h-2.5 rounded-full " + (opponentReady ? "bg-green-400 animate-pulse" : "bg-white/40")} />
                <span className="text-[11px] font-bold text-white font-[family-name:var(--font-noto-serif)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {opponentReady ? "对手已就绪" : "对手选蛐蛐中..."}
                </span>
              </div>
            )}
          </div>

          {/* 已选展示 */}
          <div className="flex items-center gap-2 w-full max-w-[358px] mb-2">
            <span className="text-[13px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
              已选 {selectedIds.length}/3 只蛐蛐
            </span>
            <div className="flex-1 flex gap-2">
              {[0, 1, 2].map(slot => {
                const tmpl = selectedIds[slot] ? crickets.find(c => c.id === selectedIds[slot])?.template ?? null : null;
                return (
                  <div key={slot} className={"w-[56px] h-[56px] rounded-lg flex flex-col items-center justify-center " + (tmpl ? "border border-[var(--color-gold)]/50 bg-[rgba(20,14,10,0.6)]" : "border border-white/5 bg-[rgba(20,14,10,0.3)]")}>
                    {tmpl ? (
                      <>
                        <Image src={getCricketImageUrl(tmpl.imageKey, tmpl.id)} alt={tmpl.name} width={32} height={28} unoptimized className="object-contain" />
                        <span className="text-[9px] font-bold truncate max-w-[50px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ color: tierColorMap[tmpl.tier] }}>{tmpl.name}</span>
                      </>
                    ) : (
                      <span className="text-[20px] text-white/35 font-[family-name:var(--font-ma-shan)]">?</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 蛐蛐列表 */}
          <div className="w-full max-w-[358px] overflow-y-auto flex-1" style={{ maxHeight: "420px" }}>
            <div className="grid grid-cols-2 gap-2">
              {crickets.map(c => {
                const tmpl = c.template;
                const isSelected = selectedIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelect(c.id)}
                    disabled={isReady}
                    className={"relative flex items-center gap-2 p-2 rounded-lg transition-all " + (isSelected ? "border-2 border-[var(--color-gold)] bg-[rgba(197,160,89,0.12)] shadow-[0_0_8px_rgba(197,160,89,0.2)]" : "border border-white/5 bg-[rgba(20,14,10,0.6)] hover:border-[var(--color-gold)]/30") + (isReady ? " opacity-50 pointer-events-none" : "")}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-[10px] text-[var(--color-bg-base)] font-bold">✓</div>
                    )}
                    <Image src={getCricketImageUrl(tmpl.imageKey, tmpl.id)} alt={tmpl.name} width={40} height={35} unoptimized className="object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-bold truncate font-[family-name:var(--font-noto-serif)]" style={{ color: tierColorMap[tmpl.tier] }}>{tmpl.name}</span>
                        <span className="text-[8px] px-1 rounded" style={{ color: tierColorMap[tmpl.tier], backgroundColor: tierColorMap[tmpl.tier] + "18" }}>{TIER_LABELS[tmpl.tier]}</span>
                      </div>
                      <span className="text-[10px] text-white/80 font-[family-name:var(--font-ma-shan)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{tmpl.title}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] px-1 rounded bg-[rgba(197,160,89,0.18)] text-[var(--color-gold)] font-bold">{TRAIT_LABELS[tmpl.trait]}</span>
                        <span className="text-[9px] font-bold text-white font-[family-name:var(--font-noto-serif)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">攻{c.attack} 防{c.defense} 速{c.speed}</span>
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
                disabled={selectedIds.length !== 3}
                className={"w-full h-[50px] rounded-[10px] border transition-all font-[family-name:var(--font-noto-serif)] text-[18px] font-bold " + (selectedIds.length === 3 ? "border-[var(--color-gold)] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[var(--color-gold)] hover:border-[var(--color-gold)]/70 active:scale-[0.98]" : "border-white/5 bg-[rgba(20,14,10,0.4)] text-[var(--color-text-muted)] opacity-50 pointer-events-none")}
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