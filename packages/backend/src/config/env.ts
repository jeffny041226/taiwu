import dotenv from "dotenv";
import path from "path";

// Load .env from backend package directory (resolved relative to this file)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || "4000", 10);
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
export const BATTLE_MODE = process.env.BATTLE_MODE || "tag_team";

// 山海 Passport 配置
export const PASSPORT_BASE_URL = process.env.PASSPORT_BASE_URL || "http://passport.szwb.imgo.tv";
export const PASSPORT_PLATFORM = parseInt(process.env.PASSPORT_PLATFORM || "7", 10);

// 微信支付配置（占位符，接入时替换）
export const WX_APP_ID = process.env.WX_APP_ID || "wx_placeholder_appid";
export const WX_MCH_ID = process.env.WX_MCH_ID || "placeholder_mch_id";
export const WX_API_KEY = process.env.WX_API_KEY || "placeholder_api_key";
export const WX_NOTIFY_URL = process.env.WX_NOTIFY_URL || "http://localhost:4000/api/pay/notify";
export const WX_PAY_MOCK = process.env.WX_PAY_MOCK === "true" || !process.env.WX_MCH_ID || process.env.WX_MCH_ID === "placeholder_mch_id";