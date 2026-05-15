import { NextResponse } from "next/server";

export async function GET() {
  // TODO: 从 Supabase 获取用户信息
  return NextResponse.json({
    uid: "demo-user",
    nickName: "玩家",
    avatar: null,
  });
}
