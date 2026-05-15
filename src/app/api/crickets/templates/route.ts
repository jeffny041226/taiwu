import { NextResponse } from "next/server";

export async function GET() {
  // TODO: 从 Supabase 获取蛐蛐模板列表
  return NextResponse.json({ templates: [] });
}
