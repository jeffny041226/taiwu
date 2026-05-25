import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { BACKEND_PORT } from "./config/env";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { tokenCache } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { cricketsRouter } from "./routes/crickets";
import { gachaRouter } from "./routes/gacha";
import { roomRouter } from "./routes/room";
import { payRouter } from "./routes/pay";
import { redeemRouter } from "./routes/redeem";
import { handleMessage, handleClose } from "./ws/handler";
import { getAllRooms, finishRoom, scheduleCleanup } from "./ws/room-manager";
import { passportService } from "./services/passport";

const app = express();

app.use(corsMiddleware);
app.use(express.json());

// REST routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/crickets", cricketsRouter);
app.use("/api/gacha", gachaRouter);
app.use("/api/room", roomRouter);
app.use("/api/pay", payRouter);
app.use("/api/redeem", redeemRouter);

app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// WebSocket server (noServer mode, attached to HTTP upgrade)
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);

  if (url.pathname === "/ws/battle") {
    const token = url.searchParams.get("token");

    const handleUpgrade = (decoded: { uid: string; nickName: string } | null) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        if (decoded) {
          (ws as any).uid = decoded.uid;
          (ws as any).nickName = decoded.nickName;
        }
        wss.emit("connection", ws, request);
      });
    };

    if (!token) {
      handleUpgrade(null);
      return;
    }

    // 检查缓存
    const cached = tokenCache.get(token);
    if (cached) {
      handleUpgrade({ uid: cached.uid, nickName: cached.nickName });
      return;
    }

    // 异步验证 Passport Token
    passportService.verifyToken(token).then(verified => {
      if (!verified) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      // 异步获取用户信息
      passportService.getTokenInfo(token).then(info => {
        const nickName = info?.nickName || "";
        tokenCache.set(token, { uid: verified.uid, nickName });
        handleUpgrade({ uid: verified.uid, nickName });
      }).catch(() => {
        tokenCache.set(token, { uid: verified.uid, nickName: "" });
        handleUpgrade({ uid: verified.uid, nickName: "" });
      });
    }).catch(() => {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
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