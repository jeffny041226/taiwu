import { WebSocketServer } from "ws";
import { handleMessage, handleClose } from "./ws-handler";
import { getAllRooms, finishRoom, scheduleCleanup } from "./room-manager";

const PORT = parseInt(process.env.WS_PORT || "3001", 10);

const wss = new WebSocketServer({ port: PORT });

console.log(`[WS Server] 斗蛐蛐对战服务器启动 -> ws://localhost:${PORT}`);

wss.on("connection", (ws, req) => {
  const url = req.url || "";
  const params = new URLSearchParams(url.split("?")[1] || "");
  const room = params.get("room");
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  console.log(`[WS] 新连接: ${clientIp}${room ? `, 房间: ${room}` : ""}`);

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

  // 发送欢迎消息
  ws.send(JSON.stringify({ type: "connected", payload: { message: "已连接到斗蛐蛐对战服务器" } }));
});

wss.on("error", (err) => {
  console.error("[WS Server] 服务器错误:", err);
});

// 定期清理过期房间 (每60秒)
setInterval(() => {
  const now = Date.now();
  const expiryMs = 30 * 60 * 1000; // 30分钟未活动视为过期

  for (const [roomId, room] of getAllRooms()) {
    if (now - room.createdAt > expiryMs && room.phase !== "finished") {
      console.log(`[WS] 清理过期房间: ${roomId}`);
      finishRoom(room);
      scheduleCleanup(roomId);
    }
  }
}, 60000);

// 优雅退出
process.on("SIGTERM", () => {
  console.log("[WS Server] 正在关闭...");
  wss.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[WS Server] 正在关闭...");
  wss.close();
  process.exit(0);
});
