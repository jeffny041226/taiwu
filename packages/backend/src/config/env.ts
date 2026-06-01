import dotenv from "dotenv";
import path from "path";

// Load .env from backend package directory (resolved relative to this file)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || "4000", 10);
export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
export const BATTLE_MODE = process.env.BATTLE_MODE || "tag_team";

// MySQL
export const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
export const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || "3306", 10);
export const MYSQL_USER = process.env.MYSQL_USER || "taiwu";
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "";
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "taiwu";

// MinIO / S3
export const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
export const S3_REGION = process.env.S3_REGION || "us-east-1";
export const S3_BUCKET = process.env.S3_BUCKET || "cricket-images";
export const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "";
export const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
export const S3_FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || "true") === "true";
/** 浏览器可达的 URL — 写入 image_key 行 / Next.js <Image> 直接 fetch */
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || "http://localhost:9000";

// 山海 Passport 配置
export const PASSPORT_BASE_URL = process.env.PASSPORT_BASE_URL || "http://passport.szwb.imgo.tv";
export const PASSPORT_PLATFORM = parseInt(process.env.PASSPORT_PLATFORM || "7", 10);

// 微信支付配置（服务商模式 — 山海平台）
export const WX_SP_APPID = process.env.WX_SP_APPID || "";           // 服务商APPID
export const WX_SP_MCHID = process.env.WX_SP_MCHID || "";           // 服务商商户号
export const WX_SUB_MCHID = process.env.WX_SUB_MCHID || "";         // 子商户号
export const WX_SUB_APPID = process.env.WX_SUB_APPID || "";         // 子商户APPID（可选）
export const WX_API_V3_KEY = process.env.WX_API_V3_KEY || "";       // APIv3密钥（回调通知解密用）
export const WX_CERT_SERIAL = process.env.WX_CERT_SERIAL || "";     // 商户API证书序列号
export const WX_CERT_PRIVATE_KEY_PATH = process.env.WX_CERT_PRIVATE_KEY_PATH || ""; // API证书私钥路径
export const WX_PAY_NOTIFY_URL = process.env.WX_PAY_NOTIFY_URL || "http://localhost:4000/api/pay/notify";

// 旧参数（兼容过渡，后续清理）
export const WX_APP_ID = process.env.WX_APP_ID || "wx_placeholder_appid";
export const WX_MCH_ID = process.env.WX_MCH_ID || "placeholder_mch_id";
export const WX_API_KEY = process.env.WX_API_KEY || "placeholder_api_key";

/** 是否 mock 模式 — 当核心参数为占位符时自动启用 */
export const WX_PAY_MOCK = process.env.WX_PAY_MOCK === "true" || !process.env.WX_SP_APPID || process.env.WX_SP_APPID === "wx_placeholder_appid";
