"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MapleLeaves } from "@/components/game/MapleLeaves";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ensureAuth } from "@/lib/auth";

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
  const [myUid, setMyUid] = useState("");
  const [myNickName, setMyNickName] = useState("玩家");
  const [token, setToken] = useState("");
  const [matchState, setMatchState] = useState<MatchState>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const cancelSentRef = useRef(false);

  // Auth init — redirect to /auth if no JWT
  useEffect(() => {
    ensureAuth().then((auth) => {
      if (!auth) {
        window.location.href = "/auth";
        return;
      }
      setMyUid(auth.uid);
      setMyNickName(auth.nickName || "玩家");
      setToken(auth.token);
    });
  }, []);

  // 计时器
  useEffect(() => {
    if (matchState !== "waiting") { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [matchState]);

  // WS connection — use roomId "matchmake" as a placeholder (backend matches on message type)
  const wsReady = myUid && token;
  const { send, on, off, onEvent, offEvent } = useWebSocket(wsReady ? "matchmake" : null, token);

  // Send matchmake + register handlers on connect
  useEffect(() => {
    if (!wsReady) return;
    cancelSentRef.current = false;
    send("room:matchmake", { uid: myUid, nickName: myNickName });
    setMatchState("waiting");

    const handleMatched = (payload: unknown) => {
      const p = payload as { roomId: string };
      cancelSentRef.current = true;
      setMatchState("matched");
      setTimeout(() => router.push(`/room/${p.roomId}?uid=${myUid}&from=match`), 600);
    };

    const handleTimeout = () => setMatchState("timeout");
    const handleCancelled = () => router.push("/");
    const handleError = (payload: unknown) => {
      const p = payload as { message?: string };
      setErrorMsg(p.message || "匹配失败");
      setMatchState("error");
    };
    const handleWaiting = (payload: unknown) => {
      const p = payload as { position: number };
      setMatchState("waiting");
    };

    // WS 重连后重新发送匹配请求
    const handleReconnect = () => {
      if (!cancelSentRef.current) {
        send("room:matchmake", { uid: myUid, nickName: myNickName });
      }
    };

    on("room:matched", handleMatched);
    on("room:matchmake.timeout", handleTimeout);
    on("room:matchmake.cancelled", handleCancelled);
    on("room:error", handleError);
    on("room:matchmake.waiting", handleWaiting);
    onEvent("reconnect", handleReconnect);

    return () => {
      if (!cancelSentRef.current) send("room:matchmake.cancel", { uid: myUid });
      off("room:matched", handleMatched);
      off("room:matchmake.timeout", handleTimeout);
      off("room:matchmake.cancelled", handleCancelled);
      off("room:error", handleError);
      off("room:matchmake.waiting", handleWaiting);
      offEvent("reconnect", handleReconnect);
    };
  }, [wsReady, myUid, myNickName]);

  const handleCancel = () => {
    cancelSentRef.current = true;
    send("room:matchmake.cancel", { uid: myUid });
    router.push("/");
  };

  const handleRetry = () => {
    setMatchState("connecting");
    setErrorMsg("");
    cancelSentRef.current = false;
    send("room:matchmake", { uid: myUid, nickName: myNickName });
    setMatchState("waiting");
  };

  const isLoading = matchState === "connecting" || matchState === "waiting";

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-bg-base)]" />
      <MapleLeaves />

      <header className="relative z-[10] flex items-center justify-between px-4 h-[60px]">
        <div className="flex items-center gap-3">
          <Image src="/assets/avatars/avatar-default.png" alt="头像" width={48} height={48} className="rounded-full border border-[var(--color-gold)]/50" {...imgProps} />
          <span className="text-[var(--color-text-primary)] text-base truncate font-[family-name:var(--font-noto-serif)]">{myNickName}</span>
        </div>
        <button type="button" onClick={handleCancel}
          className="h-9 px-3 rounded-lg border border-[var(--color-gold)]/25 bg-[rgba(197,160,89,0.06)] text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-text-secondary)] transition-all">
          返回大厅
        </button>
      </header>

      <section className="relative z-[10] flex flex-col items-center justify-center px-4" style={{ height: "calc(100dvh - 60px)" }}>
        {matchState === "matched" ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Image src="/assets/crickets/cricket-001.png" alt="匹配成功" width={200} height={200} {...imgProps} className="object-contain" />
            <p className="text-[28px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)]">棋逢对手！</p>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">即将进入房间...</p>
          </div>
        ) : matchState === "timeout" ? (
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
          <div className="flex flex-col items-center gap-6">
            <div className="w-[220px] h-[200px] rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-bg-base)]/60 flex flex-col items-center justify-center gap-3">
              <Image src="/assets/crickets/cricket-001.png" alt="匹配中" width={140} height={140} {...imgProps} className="object-contain opacity-60" />
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" style={{ animationDelay: "0s" }} />
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" style={{ animationDelay: "0.3s" }} />
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-gold)] animate-pulse" style={{ animationDelay: "0.6s" }} />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[22px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
                {matchState === "connecting" ? "连接中..." : "匹配中..."}
              </p>
              <p className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">
                {matchState === "connecting" ? "连接中..." : elapsed < 60 ? `已等待 ${elapsed} 秒` : `已等待 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒`}
              </p>
            </div>
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