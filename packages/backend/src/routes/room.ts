import { Router } from "express";
import { getRoom } from "../ws/room-manager";

export const roomRouter = Router();

roomRouter.get("/:roomId", (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const room = getRoom(roomId);
  if (!room) {
    res.json({ exists: false });
    return;
  }
  res.json({ exists: true, phase: room.phase });
});