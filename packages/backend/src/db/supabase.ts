import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../config/env";

/** Supabase 服务端客户端 (service role，无 RLS 限制)
 *  若 SUPABASE_URL 未配置，则返回 null — REST 路由会返回空数据，WS 仍可正常工作 */
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return _client;
}

/** 便捷 getter — 有 Supabase 时返回客户端，否则抛错 */
export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) throw new Error("Supabase 未配置 (缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return client;
}

