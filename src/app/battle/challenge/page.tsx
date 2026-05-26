"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";

function ChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const targetUid = searchParams.get("targetUid") || "";
    const targetName = searchParams.get("targetName") || "";
    const cricketIds = (searchParams.get("cricketIds") || "").split(",").map(Number).filter(Boolean);
    const cricketStatsStr = searchParams.get("cricketStats") || "";
    const token = searchParams.get("token") || "";
    const myUid = searchParams.get("myUid") || "";
    let cricketStats: any[] = [];
    try { cricketStats = JSON.parse(decodeURIComponent(cricketStatsStr)); } catch {}

    if (!targetUid || cricketIds.length !== 3 || cricketStats.length !== 3 || !token) {
      router.replace("/ladder");
      return;
    }

    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || "4000";
    const wsUrl = `ws://${window.location.hostname}:${wsPort}/ws/battle?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "room:challenge",
        payload: { targetUid, cricketIds, cricketStats },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "room:created") {
          ws.close();
          router.replace(`/battle/${msg.payload.roomId}?mode=challenge&targetName=${encodeURIComponent(targetName)}&uid=${encodeURIComponent(myUid)}&token=${encodeURIComponent(token)}`);
        } else if (msg.type === "room:error") {
          alert(msg.payload.message || "挑战失败");
          ws.close();
          router.replace("/ladder");
        }
      } catch {}
    };

    ws.onerror = () => { router.replace("/ladder"); };

    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) { ws.close(); router.replace("/ladder"); }
    }, 15000);
  }, [router, searchParams]);

  return <LoadingOverlay visible message="发起挑战中..." />;
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<LoadingOverlay visible message="加载中..." />}>
      <ChallengeContent />
    </Suspense>
  );
}
