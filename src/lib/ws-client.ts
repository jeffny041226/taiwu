import { WS_HEARTBEAT_INTERVAL, WS_PING_TIMEOUT } from "@taiwu/shared/config/game";

type MessageHandler = (payload: unknown) => void;

type EventType = "message" | "reconnect";

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private eventHandlers = new Map<EventType, Set<() => void>>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private url = "";
  private closed = false;
  private pendingMessages: { type: string; payload: unknown }[] = [];

  connect(roomId?: string, token?: string): void {
    this.closed = false;
    this.reconnectAttempts = 0;

    const backendPort = process.env.NEXT_PUBLIC_WS_PORT || "4000";
    const wsHost = typeof window !== "undefined"
      ? window.location.hostname
      : "localhost";
    const wsProto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const baseUrl = `${wsProto}//${wsHost}:${backendPort}/ws/battle`;
    const params: string[] = [];
    if (roomId) params.push(`room=${roomId}`);
    if (token) params.push(`token=${token}`);
    const query = params.length > 0 ? `?${params.join("&")}` : "";
    this.url = `${baseUrl}${query}`;

    this.createConnection();
  }

  private createConnection(): void {
    if (this.closed) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      const isReconnect = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      // 发送积压消息
      const pending = this.pendingMessages.splice(0);
      console.log(`[WSClient] 连接已建立, 发送 ${pending.length} 条积压消息`);
      for (const msg of pending) {
        this.ws?.send(JSON.stringify(msg));
      }
      if (isReconnect) {
        this.emitEvent("reconnect");
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pong") {
          this.handlePong();
          return;
        }
        this.dispatch(msg.type, msg.payload);
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.closed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * this.reconnectAttempts, 5000);
        setTimeout(() => this.createConnection(), delay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(type: string, payload: unknown = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.pendingMessages.push({ type, payload });
    }
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** 监听内部事件 (reconnect 等) */
  onEvent(event: EventType, handler: () => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  offEvent(event: EventType, handler: () => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  disconnect(): void {
    this.closed = true;
    this.stopHeartbeat();
    this.pendingMessages = [];
    this.ws?.close();
    this.ws = null;
  }

  private dispatch(type: string, payload: unknown): void {
    if (type !== "pong") {
      console.log(`[WSClient] 收到消息: type=${type}`);
    }
    this.handlers.get(type)?.forEach((handler) => handler(payload));
  }

  private emitEvent(event: EventType): void {
    this.eventHandlers.get(event)?.forEach((handler) => handler());
  }

  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      this.send("ping");
      this.pongTimer = setTimeout(() => {
        this.ws?.close();
      }, WS_PING_TIMEOUT);
    }, WS_HEARTBEAT_INTERVAL);
  }

  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }
}