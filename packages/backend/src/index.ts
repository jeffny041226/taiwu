import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

import { BACKEND_PORT, JWT_SECRET } from "./config/env";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { cricketsRouter } from "./routes/crickets";
import { gachaRouter } from "./routes/gacha";
import { roomRouter } from "./routes/room";
import { handleMessage, handleClose } from "./ws/handler";
import { getAllRooms, finishRoom, scheduleCleanup } from "./ws/room-manager";

const app = express();

app.use(corsMiddleware);
app.use(express.json());

// REST routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/crickets", cricketsRouter);
app.use("/api/gacha", gachaRouter);
app.use("/api/room", roomRouter);

app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// WebSocket server (noServer mode, attached to HTTP upgrade)
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);

  if (url.pathname === "/ws/battle") {
    // JWT auth on upgrade
    const token = url.searchParams.get("token");
    let decoded: { uid: string; nickName: string } | null = null;
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { uid: string; nickName: string };
      } catch {
        socket.write("HTTP/1.1 401 Unauthorized\r\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      // Attach auth info to ws
      if (decoded) {
        (ws as any).uid = decoded.uid;
        (ws as any).nickName = decoded.nickName;
      }
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws, req) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const uid = (ws as any).uid;
  console.log(`[WS] 新连接: ${clientIp}${uid ? `, uid: ${uid}` : ""}`);

  ws.on("message", (raw) => {
    handleMessage(ws, raw as Buffer);
  });

  ws.on("close", () => {
    console.log(`[WS] 连接断开: ${clientIp}`);
    handleClose(ws);
  });

  ws.on("error", (err) => {
    console.error(`[WS] 连接错误: ${clientIp}`, err.message);
  });

  ws.send(JSON.stringify({ type: "connected", payload: { message: "已连接到斗蛐蛐对战服务器" } }));
});

// Periodic cleanup of stale rooms
setInterval(() => {
  const now = Date.now();
  const expiryMs = 30 * 60 * 1000;

  for (const [roomId, room] of getAllRooms()) {
    if (now - room.createdAt > expiryMs && room.phase !== "finished") {
      console.log(`[WS] 清理过期房间: ${roomId}`);
      finishRoom(room);
      scheduleCleanup(roomId);
    }
  }
}, 60000);

server.listen(BACKEND_PORT, "0.0.0.0", () => {
  console.log(`[Backend] 斗蛐蛐服务器启动 -> http://localhost:${BACKEND_PORT}`);
  console.log(`[Backend] REST API: /api/*`);
  console.log(`[Backend] WebSocket: ws://localhost:${BACKEND_PORT}/ws/battle`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Backend] 正在关闭...");
  wss.close();
  server.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Backend] 正在关闭...");
  wss.close();
  server.close();
  process.exit(0);
});