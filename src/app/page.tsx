"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ensureAuth, logout, getLoginUrl } from "@/lib/auth";

const imgProps = { unoptimized: true };

const btnClass = "w-[342px] h-[50px] rounded-[10px] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[20px] font-bold text-[var(--color-gold)] font-quanheng active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none";

type Action = "idle" | "practice" | "error";

export default function HomePage() {
  const [myUid, setMyUid] = useState("");
  const [nickName, setNickName] = useState("");
  const [token, setToken] = useState("");
  const [avatar, setAvatar] = useState("");
  const [action, setAction] = useState<Action>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showLogout, setShowLogout] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  // Auth init
  useEffect(() => {
    ensureAuth().then((auth) => {
      if (auth) {
        setMyUid(auth.uid);
        setNickName(auth.nickName);
        setToken(auth.token);
        if (auth.avatar) setAvatar(auth.avatar);
      }
    });
  }, []);

  // Auto-trigger practice replay(?practice=1)
  const autoPracticeRef = useRef(false);
  useEffect(() => {
    if (myUid && window.location.search === "?practice=1") {
      window.history.replaceState(null, "", "/");
      autoPracticeRef.current = true;
    }
  }, [myUid]);
  useEffect(() => {
    if (autoPracticeRef.current && wsReady && action === "idle") {
      autoPracticeRef.current = false;
      handlePractice();
    }
  });

  // WS — use "lobby" as placeholder roomId
  const wsReady = myUid && token;
  const { send, on, off } = useWebSocket(wsReady ? "lobby" : null, token);

  // Register WS handlers
  useEffect(() => {
    if (!wsReady) return;

    const handleCreatedOrState = (payload: unknown) => {
      const p = payload as { roomId: string };
      if (p.roomId) {
        setCreatedRoomId(p.roomId);
        setAction("idle");
      }
    };

    const handleError = (payload: unknown) => {
      const p = payload as { message?: string };
      setErrorMsg(p.message || "操作失败");
      setAction("error");
      setTimeout(() => setAction("idle"), 2000);
    };

    on("room:created", handleCreatedOrState);
    on("room:state", handleCreatedOrState);
    on("room:error", handleError);

    return () => {
      off("room:created", handleCreatedOrState);
      off("room:state", handleCreatedOrState);
      off("room:error", handleError);
    };
  }, [wsReady]);

  // Navigate on room creation (practice mode)
  useEffect(() => {
    if (!createdRoomId) return;
    if (isPracticeMode) {
      window.location.href = `/room/${createdRoomId}?uid=${myUid}&mode=practice`;
    }
  }, [createdRoomId, isPracticeMode, myUid]);

  useEffect(() => { setIsPracticeMode(false); }, []);

  const handlePractice = () => {
    setErrorMsg("");
    if (!myUid) {
      setErrorMsg("请先登录"); setAction("error");
      setTimeout(() => setAction("idle"), 2000);
      return;
    }
    setAction("practice");
    setIsPracticeMode(true);
    send("room:practice", { uid: myUid, nickName: "玩家" });
    const timer = setTimeout(() => {
      setAction(prev => prev === "practice" ? "error" : prev);
      setErrorMsg("训练启动超时");
    }, 6000);
    const handleResp = () => { clearTimeout(timer); setAction("idle"); };
    on("room:created", handleResp);
    on("room:state", handleResp);
    setTimeout(() => { off("room:created", handleResp); off("room:state", handleResp); if (!createdRoomId) { setAction("idle"); } }, 7000);
  };

  const loginUrl = getLoginUrl();
  const isLoading = action === "practice";

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      <Image
        src="/assets/backgrounds/bg-home.webp"
        alt=""
        fill
        {...imgProps}
        className="object-cover object-center"
        priority
      />

      {/* Top Bar */}
      <header className="relative z-[10] flex items-center justify-between px-4 h-[60px]">
        <div className="flex items-center gap-3">
          {nickName ? (
            <div className="relative">
              <button type="button" onClick={() => setShowLogout(v => !v)} onBlur={() => setTimeout(() => setShowLogout(false), 200)} className="focus:outline-none">
                <Image src={avatar || "/assets/avatars/avatar-default.png"} alt="头像" width={48} height={48} className="rounded-full border border-[var(--color-gold)]/50 cursor-pointer object-cover" {...imgProps} />
              </button>
              {showLogout && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 min-w-[80px] z-50">
                  <div className="bg-[rgba(20,14,10,0.95)] border border-[var(--color-gold)]/30 rounded-lg py-1 shadow-lg">
                    <button type="button" onClick={logout} className="w-full px-3 py-1.5 text-[13px] text-red-400 hover:bg-[rgba(255,255,255,0.05)] text-center font-[family-name:var(--font-noto-serif)] whitespace-nowrap">退出登录</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <a href={loginUrl} className="text-[14px] text-black font-bold hover:text-black/80 font-quanheng underline underline-offset-4">登录/注册</a>
          )}
          {nickName && (
            <span className="text-black text-[13px] max-w-[160px] truncate font-quanheng">{nickName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <a href={myUid ? "/market" : loginUrl} className="h-11 px-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--color-gold)]/25 bg-[rgba(197,160,89,0.06)] hover:bg-[rgba(197,160,89,0.12)] hover:border-[var(--color-gold)]/50 transition-all shrink-0">
            <Image src="/assets/ui/icons/icon-market.png" alt="虫市" width={24} height={24} className="shrink-0" {...imgProps} />
            <span className="text-[13px] text-black font-bold font-quanheng">虫市</span>
          </a>
          <a href={myUid ? "/backpack" : loginUrl} className="h-11 px-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--color-gold)]/25 bg-[rgba(197,160,89,0.06)] hover:bg-[rgba(197,160,89,0.12)] hover:border-[var(--color-gold)]/50 transition-all shrink-0">
            <Image src="/assets/ui/icons/icon-backpack.png" alt="背包" width={24} height={24} className="shrink-0" {...imgProps} />
            <span className="text-[13px] text-black font-bold font-quanheng">背包</span>
          </a>

        </div>
      </header>

      {/* 斗蛐蛐 标题 */}
      <div className="absolute left-0 right-0 z-[10] flex justify-center" style={{ top: "calc(25% - 40px)" }}>
        <Image
          src="/assets/ui/title-logo.png"
          alt="斗蛐蛐"
          width={280}
          height={100}
          {...imgProps}
          className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          priority
        />
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="relative z-[15] mx-4 mb-2 text-center text-[14px] text-red-400 font-[family-name:var(--font-noto-serif)]">{errorMsg}</div>
      )}

      {/* Buttons */}
      <section className="absolute bottom-0 left-0 right-0 z-[10] flex flex-col items-center gap-3 px-4 pb-[110px]">
        <a href={myUid ? "/matchmake" : loginUrl} className={btnClass + " inline-flex items-center justify-center bg-[rgba(197,160,89,0.12)]"}>匹配对战</a>

        <a href={myUid ? "/room/create" : loginUrl} className={btnClass + " inline-flex items-center justify-center"}>开房对战</a>

        <a href={myUid ? "/ladder" : loginUrl} className={btnClass + " inline-flex items-center justify-center"}>天梯</a>

        <button type="button" onClick={myUid ? handlePractice : () => window.location.href = loginUrl} disabled={isLoading} className={btnClass}>训练</button>
      </section>

      <LoadingOverlay visible={isLoading} message="启动训练中..." />
    </div>
  );
}
