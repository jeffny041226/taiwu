"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ensureAuth, getLoginUrl } from "@/lib/auth";

const imgProps = { unoptimized: true };
const btnClass =
  "w-full h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[20px] font-bold text-[var(--color-gold)] font-quanheng active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none";

export default function RoomCreatePage() {
  const [myUid, setMyUid] = useState("");
  const [token, setToken] = useState("");
  const [action, setAction] = useState<"idle" | "creating">("idle");
  const [roomCode, setRoomCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

  // Auth init
  useEffect(() => {
    ensureAuth().then((auth) => {
      if (!auth) {
        window.location.href = getLoginUrl();
        return;
      }
      setMyUid(auth.uid);
      setToken(auth.token);
    });
  }, []);

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
      setAction("idle");
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

  // Navigate on room creation
  useEffect(() => {
    if (!createdRoomId) return;
    window.location.href = `/room/${createdRoomId}?uid=${myUid}`;
  }, [createdRoomId, myUid]);

  const handleCreateRoom = () => {
    if (!myUid || !wsReady) return;
    setAction("creating");
    setErrorMsg("");
    send("room:create", { uid: myUid, nickName: "玩家" });
  };

  const handleJoinRoom = () => {
    if (!myUid || roomCode.length !== 5) return;
    window.location.href = `/room/${roomCode.toUpperCase()}?uid=${myUid}`;
  };

  const isLoading = action === "creating";

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      <TopBar title="创建 / 加入房间" backHref="/" />

      <div className="relative z-[10] flex flex-col items-center pt-8 px-4">

        {/* 创建房间 */}
        <div className="w-full max-w-[358px] mb-4 rounded-[16px] border border-[var(--color-gold)]/15 bg-[rgba(20,14,10,0.6)] flex flex-col items-stretch px-5 py-6 gap-3">
          <div className="text-center">
            <span className="text-[40px]">🏠</span>
          </div>
          <p className="text-center text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">创建新的房间</p>
          <p className="text-center text-[12px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">创建房间后分享房间号给好友</p>
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={isLoading || !wsReady}
            className={btnClass + " text-center"}
          >
            {isLoading ? "创建中..." : "创建房间"}
          </button>
        </div>

        {/* 分隔 */}
        <div className="flex items-center gap-3 w-full max-w-[358px] mb-4">
          <div className="flex-1 h-[1px] bg-[var(--color-gold)]/15" />
          <span className="text-[13px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">或者</span>
          <div className="flex-1 h-[1px] bg-[var(--color-gold)]/15" />
        </div>

        {/* 加入房间 */}
        <div className="w-full max-w-[358px] rounded-[16px] border border-[var(--color-gold)]/15 bg-[rgba(20,14,10,0.6)] flex flex-col items-stretch px-5 py-6 gap-3">
          <div className="text-center">
            <span className="text-[40px]">🔗</span>
          </div>
          <p className="text-center text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)]">加入已有房间</p>
          <p className="text-center text-[12px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">输入好友分享的房间号</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5))}
              placeholder="输入房间号"
              className="flex-1 min-w-0 h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.9)] px-4 text-center text-[20px] tracking-[6px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70 uppercase"
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={roomCode.length !== 5}
              className={`shrink-0 px-3 h-[50px] rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[16px] font-bold whitespace-nowrap flex items-center justify-center font-[family-name:var(--font-noto-serif)] ${roomCode.length === 5 ? "text-[#4a90d9] hover:border-[#4a90d9]/70" : "text-[var(--color-text-muted)] opacity-40 pointer-events-none"}`}
            >
              进入
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="mt-4 text-[13px] text-red-400 text-center font-[family-name:var(--font-noto-serif)]">{errorMsg}</p>
        )}
      </div>

      <LoadingOverlay visible={isLoading} message="创建房间中..." />
    </div>
  );
}
