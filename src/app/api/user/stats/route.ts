import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ wins: 0, losses: 0, draws: 0 });
}
