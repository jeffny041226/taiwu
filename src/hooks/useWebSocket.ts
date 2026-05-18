"use client";

import { useEffect, useRef, useCallback } from "react";
import { WSClient } from "@/lib/ws-client";

export function useWebSocket(roomId: string | null, token?: string) {
  const clientRef = useRef<WSClient | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const client = new WSClient();
    clientRef.current = client;
    client.connect(roomId, token ?? undefined);

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [roomId, token]);

  const on = useCallback((type: string, handler: (payload: unknown) => void) => {
    clientRef.current?.on(type, handler);
  }, []);

  const off = useCallback((type: string, handler: (payload: unknown) => void) => {
    clientRef.current?.off(type, handler);
  }, []);

  const send = useCallback((type: string, payload: unknown = {}) => {
    clientRef.current?.send(type, payload);
  }, []);

  const onEvent = useCallback((event: "reconnect", handler: () => void) => {
    clientRef.current?.onEvent(event, handler);
  }, []);

  const offEvent = useCallback((event: "reconnect", handler: () => void) => {
    clientRef.current?.offEvent(event, handler);
  }, []);

  return { send, on, off, onEvent, offEvent };
}