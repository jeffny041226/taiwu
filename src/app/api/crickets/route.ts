import { NextResponse } from "next/server";

export async function GET() {
  // TODO: 从 Supabase 获取用户蛐蛐列表
  return NextResponse.json({ crickets: [] });
}
