import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { count } = await request.json();
  // TODO: 调用 gacha-engine 抽奖，记录到 Supabase
  return NextResponse.json({ results: [], count });
}
