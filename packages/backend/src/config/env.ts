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