"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapleLeaves } from "@/components/game/MapleLeaves";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";

const imgProps = { unoptimized: true };

const btnClass = "w-[342px] h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 hover:shadow-[0_0_12px_rgba(197,160,89,0.15)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none";

type Action = "idle" | "creating" | "joining" | "practice" | "error";

export default function HomePage() {
  const [myUid] = useState(() => `user-${Math.random().toString(36).slice(2, 8)}`);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [action, setAction] = useState<Action>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const WS_TIMEOUT = 6000;

  const connectWs = () => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const envHost = process.env.NEXT_PUBLIC_WS_HOST;
    const host = (envHost && envHost !== "localhost") ? envHost : window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    const wsUrl = `${protocol}://${host}:${port}/ws/battle`;
    wsRef.current?.close();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    return ws;
  };

  const sendWhenOpen = (ws: WebSocket, msg: string, onTimeout?: () => void) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else if (ws.readyState === WebSocket.CONNECTING) {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        ws.close();
        onTimeout?.();
      }, WS_TIMEOUT);
      ws.onopen = () => {
        clearTimeout(timer);
        if (!timedOut) ws.send(msg);
      };
    }
  };

  useEffect(() => { return () => { wsRef.current?.close(); }; }, []);
  useEffect(() => { setIsPracticeMode(false); }, []);

  const handleCreateRoom = () => {
    setAction("creating"); setErrorMsg("");
    const ws = connectWs();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:created" || msg.type === "room:state") {
          if (msg.payload.roomId) { setCreatedRoomId(msg.payload.roomId); setAction("idle"); }
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "创建失败"); setAction("error");
          setTimeout(() => setAction("idle"), 2000);
        }
      } catch {}
    };
    ws.onerror = () => { setErrorMsg("网络连接失败"); setAction("error"); setTimeout(() => setAction("idle"), 2000); };
    sendWhenOpen(ws, JSON.stringify({ type: "room:create", payload: { uid: myUid, nickName: "玩家" } }),
      () => { setErrorMsg("连接服务器超时"); setAction("error"); setTimeout(() => setAction("idle"), 2000); });
  };

  const handlePractice = () => {
    setIsPracticeMode(true); setAction("practice"); setErrorMsg("");
    const ws = connectWs();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:created" || msg.type === "room:state") {
          if (msg.payload.roomId) { setCreatedRoomId(msg.payload.roomId); setAction("idle"); }
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "失败"); setAction("error");
          setTimeout(() => setAction("idle"), 2000);
        }
      } catch {}
    };
    ws.onerror = () => { setErrorMsg("网络连接失败"); setAction("error"); setTimeout(() => setAction("idle"), 2000); };
    sendWhenOpen(ws, JSON.stringify({ type: "room:practice", payload: { uid: myUid, nickName: "玩家" } }),
      () => { setErrorMsg("连接服务器超时"); setAction("error"); setTimeout(() => setAction("idle"), 2000); });
  };

  const handleJoinRoom = () => {
    if (roomCode.length !== 5) return;
    setAction("joining"); setErrorMsg("");
    const ws = connectWs();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "room:joined" || msg.type === "room:state") {
          if (msg.payload.roomId) { setCreatedRoomId(msg.payload.roomId); setAction("idle"); }
        } else if (msg.type === "room:error") {
          setErrorMsg(msg.payload.message || "加入失败"); setAction("error");
          setTimeout(() => setAction("idle"), 2000);
        }
      } catch {}
    };
    ws.onerror = () => { setErrorMsg("网络连接失败"); setAction("error"); setTimeout(() => setAction("idle"), 2000); };
    sendWhenOpen(ws, JSON.stringify({ type: "room:join", payload: { roomId: roomCode.toUpperCase(), uid: myUid, nickName: "玩家" } }),
      () => { setErrorMsg("连接服务器超时"); setAction("error"); setTimeout(() => setAction("idle"), 2000); });
  };

  useEffect(() => {
    if (createdRoomId) {
      if (isPracticeMode) {
        window.location.href = `/battle/${createdRoomId}?mode=practice&uid=${myUid}`;
      } else {
        window.location.href = `/room/${createdRoomId}?uid=${myUid}`;
      }
    }
  }, [createdRoomId, isPracticeMode, myUid]);

  const isLoading = action === "creating" || action === "joining" || action === "practice";

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <div className="absolute inset-0 bg-[var(--color-bg-base)]" />
      <MapleLeaves />

      {/* Top Bar */}
      <header className="relative z-[10] flex items-center justify-between px-4 h-[60px]">
        <div className="flex items-center gap-3">
          <Image src="/assets/avatars/avatar-default.png" alt="头像" width={48} height={48} className="rounded-full border border-[var(--color-gold)]/50" {...imgProps} />
          <span className="text-[var(--color-text-primary)] text-base max-w-[200px] truncate font-[family-name:var(--font-noto-serif)]">玩家</span>
        </div>
        <Link href="/backpack" className="h-11 px-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--color-gold)]/25 bg-[rgba(197,160,89,0.06)] hover:bg-[rgba(197,160,89,0.12)] hover:border-[var(--color-gold)]/50 transition-all">
          <Image src="/assets/ui/icons/icon-backpack.png" alt="背包" width={24} height={24} {...imgProps} />
          <span className="text-[13px] text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">背包</span>
        </Link>
      </header>

      {/* Logo */}
      <section className="relative z-[10] flex flex-col items-center pt-6 pb-4">
        <div className="w-[260px] h-[70px] flex items-center justify-center">
          <Image src="/assets/ui/misc/logo-text.png" alt="斗蛐蛐" width={260} height={70} priority {...imgProps} />
        </div>
        <p className="text-[13px] text-[var(--color-text-secondary)] tracking-[4px] font-[family-name:var(--font-noto-serif)]">巅峰至臻对战版</p>
      </section>

      {/* Cricket Display */}
      <section className="relative z-[10] flex flex-col items-center px-4 pt-2 pb-6">
        <div className="w-[300px] h-[260px] rounded-xl border border-[var(--color-gold)]/15 bg-[var(--color-bg-base)]/40 flex flex-col items-center justify-center">
          <p className="text-[14px] text-[var(--color-gold)] font-[family-name:var(--font-ma-shan)]">铁齿铜牙</p>
          <p className="text-[22px] font-bold text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">赤牙将军</p>
          <div className="w-[260px] h-[180px] flex items-center justify-center my-2">
            <Image src="/assets/crickets/cricket-001.png" alt="赤牙将军" width={260} height={180} {...imgProps} className="object-contain w-full h-full" />
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] tracking-[2px] font-[family-name:var(--font-noto-serif)]">攻25&nbsp;&nbsp;防20&nbsp;&nbsp;速20</p>
        </div>
      </section>

      {/* Error */}
      {errorMsg && (
        <div className="relative z-[15] mx-4 mb-2 text-center text-[14px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</div>
      )}

      {/* Buttons */}
      <section className="relative z-[10] flex flex-col items-center gap-3 px-4 pb-8">
        <Link href="/matchmake" className={btnClass + " flex items-center justify-center border-[var(--color-gold)]/60 bg-gradient-to-b from-[rgba(197,160,89,0.15)] to-[rgba(20,14,10,0.9)]"}>匹配对战</Link>

        <button type="button" onClick={handleCreateRoom} disabled={isLoading} className={btnClass}>开房对战</button>

        {showJoinInput ? (
          <div className="flex gap-2 w-[342px]">
            <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={5} placeholder="输入房间号"
              className="flex-1 h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.9)] px-4 text-center text-[20px] tracking-[6px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70 uppercase" />
            <button type="button" onClick={handleJoinRoom} disabled={roomCode.length !== 5 || isLoading}
              className={`h-[50px] px-6 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold whitespace-nowrap flex items-center justify-center font-[family-name:var(--font-noto-serif)] ${roomCode.length === 5 ? "text-[#4a90d9] hover:border-[#4a90d9]/70" : "text-[var(--color-text-muted)] opacity-40 pointer-events-none"}`}>进入</button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowJoinInput(true)} className={btnClass}>加入房间</button>
        )}

        <button type="button" onClick={handlePractice} disabled={isLoading} className={btnClass}>训练</button>
      </section>

      <LoadingOverlay visible={isLoading} message={action === "creating" ? "创建房间中..." : action === "joining" ? "加入房间中..." : "启动训练中..."} />
    </div>
  );
}
