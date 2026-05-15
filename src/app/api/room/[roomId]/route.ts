import { NextRequest, NextResponse } from "next/server";
import { validateRoomCode } from "@/lib/room-code";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const valid = validateRoomCode(roomId.toUpperCase());
  return NextResponse.json({ exists: valid, phase: "unknown" });
}
