import { PASSPORT_BASE_URL, PASSPORT_PLATFORM } from "../config/env";
import { getProxyAgent } from "../lib/proxy-agent";

interface ShuziwenboResponse<T = unknown> {
  code: number;
  msg?: string;
  message?: string;
  data?: T;
  token?: string;
  uid?: string | number;
  nickname?: string;
  nickName?: string;
  avatar?: string;
}

/** 5 秒超时的 fetch 包装（支持 HTTP 代理） */
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const dispatcher = getProxyAgent();
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } as any : {}),
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/** 文博 API 基础 URL */
const API_BASE = "https://api.shuziwenbo.cn";

/**
 * 山海 Passport API 客户端 — 后端代理 shuziwenbo.cn 登录接口
 */
class PassportService {
  private baseUrl: string;
  private platform: number;

  constructor() {
    this.baseUrl = PASSPORT_BASE_URL;
    this.platform = PASSPORT_PLATFORM;
  }

  /** 获取短信验证码 — 走 api.shuziwenbo.cn */
  async getMobileCode(mobile: string, ip: string): Promise<void> {
    const params = new URLSearchParams({ mobile, operation: "mobilecodelogin" });
    const url = `${API_BASE}/mine/v2/getMobileCode?${params.toString()}`;
    console.log("[Passport] 获取验证码:", url.replace(mobile, "***"));

    const res = await fetchWithTimeout(url);
    const data: ShuziwenboResponse = await res.json();

    if (data.code === 200) return;
    throw new Error(data.msg || data.message || "发送验证码失败");
  }

  /** 验证码登录 — 走 api.shuziwenbo.cn */
  async mobileCodeLogin(mobile: string, code: string): Promise<{
    token: string;
    uid: string;
    nickName: string;
    avatar?: string;
  }> {
    const url = `${API_BASE}/mine/v1/mobileCodeLogin`;
    console.log("[Passport] 验证码登录:", mobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"));

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, mobileCode: code }),
    });

    const data: ShuziwenboResponse = await res.json();
    console.log("[Passport] 验证码登录响应:", JSON.stringify(data).slice(0, 300));

    if (data.code !== 200) {
      throw new Error(data.msg || data.message || "登录失败");
    }

    const token = data.token || (data.data as any)?.token || "";
    const uid = String(data.uid || (data.data as any)?.uid || "");
    const nickName = data.nickname || data.nickName || (data.data as any)?.nickname || (data.data as any)?.nickName || "";

    return { token, uid, nickName, avatar: data.avatar };
  }

  /** 校验 Token 有效性 — 走 api.shuziwenbo.cn */
  async verifyToken(token: string): Promise<{ uid: string } | null> {
    const url = `${API_BASE}/mine/v1/userInfo?token=${encodeURIComponent(token)}`;
    console.log("[Passport] 校验Token");

    try {
      const res = await fetchWithTimeout(url);
      const data: ShuziwenboResponse = await res.json();

      if (data.code === 200 && data.uid) {
        return { uid: String(data.uid) };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** 根据 Token 获取用户信息 — 走 api.shuziwenbo.cn */
  async getTokenInfo(token: string): Promise<{
    uid: string;
    nickName: string;
    avatar?: string;
    mobile?: string;
  } | null> {
    const url = `${API_BASE}/mine/v1/userInfo?token=${encodeURIComponent(token)}`;
    console.log("[Passport] 获取TokenInfo");

    try {
      const res = await fetchWithTimeout(url);
      const data: ShuziwenboResponse = await res.json();

      if (data.code === 200 && data.uid) {
        return {
          uid: String(data.uid),
          nickName: data.nickname || data.nickName || (data.data as any)?.nickname || "",
          avatar: data.avatar,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const passportService = new PassportService();
