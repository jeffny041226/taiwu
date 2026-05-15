"use client";

import { useEffect, useRef, useCallback } from "react";
import { WSClient } from "@/lib/ws-client";

export function useWebSocket(roomId: string | null) {
  const clientRef = useRef<WSClient | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const client = new WSClient();
    clientRef.current = client;
    client.connect(roomId);

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [roomId]);

  const on = useCallback((type: string, handler: (payload: unknown) => void) => {
    clientRef.current?.on(type, handler);
  }, []);

  const off = useCallback((type: string, handler: (payload: unknown) => void) => {
    clientRef.current?.off(type, handler);
  }, []);

  const send = useCallback((type: string, payload: unknown = {}) => {
    clientRef.current?.send(type, payload);
  }, []);

  return { send, on, off };
}
