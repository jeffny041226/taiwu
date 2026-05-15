import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Supabase 客户端 (浏览器端)
 * 使用 anon key，权限受 RLS 限制
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase 服务端客户端
 * 使用 service role key，仅用于 API routes / server 端
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key);
}
