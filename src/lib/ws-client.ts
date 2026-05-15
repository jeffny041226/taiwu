import { WS_HEARTBEAT_INTERVAL, WS_PING_TIMEOUT } from "@/config/game";

type MessageHandler = (payload: unknown) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private url = "";
  private closed = false;

  connect(roomId: string): void {
    this.closed = false;
    this.reconnectAttempts = 0;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WS_PORT || "3001";
    this.url = `${protocol}://${host}:${port}/ws/battle?room=${roomId}`;

    this.createConnection();
  }

  private createConnection(): void {
    if (this.closed) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
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
        setTimeout(() => this.createConnection(), 2000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(type: string, payload: unknown = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
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

  disconnect(): void {
    this.closed = true;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private dispatch(type: string, payload: unknown): void {
    this.handlers.get(type)?.forEach((handler) => handler(payload));
  }

  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      this.send("ping");
      this.pongTimer = setTimeout(() => {
        // 超时未收到 pong，断开重连
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
