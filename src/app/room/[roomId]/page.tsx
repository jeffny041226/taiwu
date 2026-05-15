"use client";

import { useState, use, useEffect, useRef } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";

const TIER_LABELS: Record<string, string> = { common: "普通", rare: "稀有", epic: "史诗", legendary: "传说" };
const TIER_COLORS: Record<string, string> = { common: "#a0a0a0", rare: "#4a90d9", epic: "#8b5cf6", legendary: "#c5a059" };

interface RoomPlayer {
  uid: string;
  nickName: string;
}

interface RoomState {
  roomId: string;
  phase: string;
  leftScore: number;
  rightScore: number;
  leftPlayer: RoomPlayer | null;
  rightPlayer: RoomPlayer | null;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [phase, setPhase] = useState("waiting");
  const [opponent, setOpponent] = useState<RoomPlayer | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [connecting, setConnecting] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    const ws = new WebSocket(`${protocol}://${host}:${port}/ws/battle`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnecting(false);
      ws.send(JSON.stringify({
        type: "room:join",
        payload: { roomId: roomId.toUpperCase(), uid: "demo-user", nickName: "玩家" },
      }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:state") {
          const s: RoomState = msg.payload;
          setPhase(s.phase);

          // 检测对手
          const me = s.leftPlayer;
          const opp = s.leftPlayer?.uid !== "demo-user" ? s.leftPlayer : s.rightPlayer;
          if (opp) setOpponent(opp);

          // 战斗开始 → 跳转战斗页
          if (s.phase === "battling") {
            window.location.href = `/battle/${roomId}`;
          }
        } else if (msg.type === "room:joined") {
          // 有对手加入了
          const s: RoomState = msg.payload;
          setPhase(s.phase);
          const opp = s.leftPlayer?.uid !== "demo-user" ? s.leftPlayer : s.rightPlayer;
          if (opp) setOpponent(opp);
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "错误");
        }
      } catch {}
    };

    ws.onclose = () => setConnecting(true);
    ws.onerror = () => setErrorMsg("连接失败");

    return () => { ws.close(); };
  }, [roomId]);

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      <TopBar title="房间" backHref="/" />

      {/* 房间号 */}
      <div className="flex justify-center py-3">
        <div className="w-[140px] h-9 rounded-[18px] bg-[rgba(20,14,10,0.8)] border border-[var(--color-gold)]/20 flex items-center justify-center">
          <span className="text-[22px] font-bold text-[var(--color-gold)] tracking-[6px] font-[family-name:var(--font-noto-serif)]">{roomId.toUpperCase()}</span>
        </div>
      </div>

      {/* 提示 */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <div className="text-[48px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)]/30">⚔</div>
        <p className="text-[16px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">
          {phase === "battling" ? "对手已准备好，进入战斗..." :
           phase === "ready" ? "对手已加入，准备开战..." :
           "等待对手加入..."}
        </p>
        <p className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">
          将房间号分享给好友即可开始对战
        </p>
        {errorMsg && <p className="text-[13px] text-red-400">{errorMsg}</p>}
      </div>

      {/* 对手信息 */}
      {opponent && (
        <div className="mx-4 mt-6 mb-2 flex items-center gap-3 p-3 rounded-lg bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/10">
          <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 flex items-center justify-center text-[14px] text-[var(--color-gold)]">敌</div>
          <div>
            <p className="text-[15px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">{opponent.nickName}</p>
            <p className="text-[11px] text-green-400/80">{phase === "battling" ? "战斗中" : "已就绪"}</p>
          </div>
          <div className="ml-auto w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        </div>
      )}

      <LoadingOverlay visible={connecting} message="连接房间中..." />
    </div>
  );
}
