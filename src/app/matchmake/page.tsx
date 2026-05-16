"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { MapleLeaves } from "@/components/game/MapleLeaves";

const imgProps = { unoptimized: true };

type MatchState = "connecting" | "waiting" | "matched" | "timeout" | "error";

const btnClass =
  "w-[342px] h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all";

function LoadingFallback() {
  return (
    <div className="relative w-full h-[100dvh] flex items-center justify-center bg-[var(--color-bg-base)]">
      <p className="text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">加载中...</p>
    </div>
  );
}

export default function MatchmakePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MatchmakeContent />
    </Suspense>
  );
}

function MatchmakeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [myUid] = useState(() => searchParams.get("uid") || `user-${Math.random().toString(36).slice(2, 8)}`);
  const [matchState, setMatchState] = useState<MatchState>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const cancelSentRef = useRef(false);

  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const envHost = process.env.NEXT_PUBLIC_WS_HOST;
    const host = (envHost && envHost !== "localhost") ? envHost : window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    const wsUrl = `${protocol}://${host}:${port}/ws/battle`;
    wsRef.current?.close();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    return ws;
  }, []);

  // 计时器：等待时每秒+1
  useEffect(() => {
    if (matchState !== "waiting") { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [matchState]);

  // 连接 WS 并发送匹配请求
  useEffect(() => {
    cancelSentRef.current = false;
    const ws = connectWs();

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "room:matchmake", payload: { uid: myUid, nickName: "玩家" } }));
      setMatchState("waiting");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:matched") {
          cancelSentRef.current = true;
          setMatchState("matched");
          const roomId = msg.payload.roomId;
          setTimeout(() => {
            router.push(`/room/${roomId}?uid=${myUid}`);
          }, 600);
        } else if (msg.type === "room:matchmake.timeout") {
          setMatchState("timeout");
        } else if (msg.type === "room:matchmake.cancelled") {
          // 取消成功 → 返回首页
          router.push("/");
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "匹配失败");
          setMatchState("error");
        }
      } catch {}
    };

    ws.onerror = () => {
      setErrorMsg("网络连接失败");
      setMatchState("error");
    };

    return () => {
      // 组件卸载时取消匹配（除非已经匹配成功）
      if (!cancelSentRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "room:matchmake.cancel", payload: { uid: myUid } }));
      }
      ws.close();
    };
  }, [myUid, connectWs, router]);

  // 手动取消匹配
  const handleCancel = () => {
    cancelSentRef.current = true;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "room:matchmake.cancel", payload: { uid: myUid } }));
    }
    ws?.close();
    wsRef.current = null;
    router.push("/");
  };

  // 超时后重试
  const handleRetry = () => {
    setMatchState("connecting");
    setErrorMsg("");
    const ws = connectWs();
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "room:matchmake", payload: { uid: myUid, nickName: "玩家" } }));
      setMatchState("waiting");
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:matched") {
          setMatchState("matched");
          setTimeout(() => router.push(`/room/${msg.payload.roomId}?uid=${myUid}`), 600);
        } else if (msg.type === "room:matchmake.timeout") {
          setMatchState("timeout");
        } else if (msg.type === "room:matchmake.cancelled") {
          router.push("/");
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "匹配失败");
          setMatchState("error");
        }
      } catch {}
    };
    ws.onerror = () => {
      setErrorMsg("网络连接失败");
      setMatchState("error");
    };
  };

  const isLoading = matchState === "connecting" || matchState === "waiting";

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-bg-base)]" />
      <MapleLeaves />

      {/* Top bar */}
      <header className="relative z-[10] flex items-center justify-between px-4 h-[60px]">
        <div className="flex items-center gap-3">
          <Image src="/assets/avatars/avatar-default.png" alt="头像" width={48} height={48} className="rounded-full border border-[var(--color-gold)]/50" {...imgProps} />
          <span className="text-[var(--color-text-primary)] text-base truncate font-[family-name:var(--font-noto-serif)]">玩家</span>
        </div>
        <button type="button" onClick={handleCancel}
          className="h-9 px-3 rounded-lg border border-[var(--color-gold)]/25 bg-[rgba(197,160,89,0.06)] text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-text-secondary)] transition-all">
          返回大厅
        </button>
      </header>

      {/* 匹配区域 */}
      <section className="relative z-[10] flex flex-col items-center justify-center px-4" style={{ height: "calc(100dvh - 60px)" }}>
        {matchState === "matched" ? (
          /* ── 匹配成功 ── */
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Image src="/assets/crickets/cricket-001.png" alt="匹配成功" width={200} height={200} {...imgProps} className="object-contain" />
            <p className="text-[28px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)]">棋逢对手！</p>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">即将进入房间...</p>
          </div>
        ) : matchState === "timeout" ? (
          /* ── 匹配超时 ── */
          <div className="flex flex-col items-center gap-6">
            <div className="w-[220px] h-[200px] rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-bg-base)]/60 flex items-center justify-center">
              <p className="text-[56px] opacity-30">⏳</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[22px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">匹配超时</p>
              <p className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">暂时没有找到对手，试试换个时间</p>
            </div>
            <button type="button" onClick={handleRetry} className={btnClass}>重新匹配</button>
            <button type="button" onClick={handleCancel}
              className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)] hover:text-[var(--color-text-secondary)] transition-colors underline underline-offset-2">
              返回大厅
            </button>
          </div>
        ) : matchState === "error" ? (
          /* ── 匹配失败 ── */
          <div className="flex flex-col items-center gap-6">
            <div className="w-[220px] h-[200px] rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-bg-base)]/60 flex items-center justify-center">
              <p className="text-[56px] opacity-30">⚠</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[22px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">匹配失败</p>
              <p className="text-[13px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</p>
            </div>
            <button type="button" onClick={handleRetry} className={btnClass}>重试</button>
            <button type="button" onClick={handleCancel}
              className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)] hover:text-[var(--color-text-secondary)] transition-colors underline underline-offset-2">
              返回大厅
            </button>
          </div>
        ) : (
          /* ── 匹配中 ── */
          <div className="flex flex-col items-center gap-6">
            {/* 蛐蛐装饰图 */}
            <div className="w-[220px] h-[200px] rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-bg-base)]/60 flex flex-col items-center justify-center gap-3">
              <Image src="/assets/crickets/cricket-001.png" alt="匹配中" width={140} height={140} {...imgProps} className="object-contain opacity-60" />
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" style={{ animationDelay: "0s" }} />
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" style={{ animationDelay: "0.3s" }} />
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" style={{ animationDelay: "0.6s" }} />
              </div>
            </div>
            {/* 状态文字 */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[22px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
                {matchState === "connecting" ? "连接中..." : "匹配中..."}
              </p>
              <p className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">
                {matchState === "connecting" ? "连接中..." : elapsed < 60 ? `已等待 ${elapsed} 秒` : `已等待 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒`}
              </p>
            </div>
            {/* 取消按钮 */}
            <button type="button" onClick={handleCancel}
              className="h-[50px] w-[220px] rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[16px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/30 hover:text-[var(--color-text-secondary)] transition-all active:scale-[0.98]">
              取消匹配
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
