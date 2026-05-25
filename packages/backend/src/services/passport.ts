import { PASSPORT_BASE_URL, PASSPORT_PLATFORM } from "../config/env";
import { getProxyAgent } from "../lib/proxy-agent";

interface PassportResponse<T = unknown> {
  code: number;
  message?: string;
  msg?: string;
  data?: T;
  token?: string;
  uid?: string;
  nickname?: string;
  nickName?: string;
  avatar?: string;
  mobile?: string;
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

/**
 * Passport API 客户端 — 所有接口由后端代理调用
 */
class PassportService {
  private baseUrl: string;
  private platform: number;

  constructor() {
    this.baseUrl = PASSPORT_BASE_URL;
    this.platform = PASSPORT_PLATFORM;
  }

  /** 获取短信验证码 */
  async getMobileCode(mobile: string, ip: string): Promise<void> {
    const params = new URLSearchParams({
      mobile,
      operation: "mobilecodelogin",
      platform: String(this.platform),
      uip: ip,
    });

    const url = `${this.baseUrl}/intra/v1/api/getMobileCode?${params.toString()}`;
    console.log("[Passport] 获取验证码:", url.replace(mobile, "***"));

    const res = await fetchWithTimeout(url);
    const data: PassportResponse = await res.json();

    if (data.code !== 200) {
      throw new Error(data.msg || "发送验证码失败");
    }
  }

  /** 验证码登录 */
  async mobileCodeLogin(mobile: string, code: string): Promise<{
    token: string;
    uid: string;
    nickName: string;
    avatar?: string;
    mobile?: string;
  }> {
    const params = new URLSearchParams({
      mobile,
      mobileCode: code,
      platform: String(this.platform),
    });

    const url = `${this.baseUrl}/intra/v1/api/mobileCodeLogin`;
    console.log("[Passport] 验证码登录:", mobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"));

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data: PassportResponse = await res.json();
    console.log("[Passport] 验证码登录响应:", JSON.stringify(data).slice(0, 300));

    if (data.code !== 200) {
      throw new Error(data.msg || data.message || "登录失败");
    }

    return {
      // data.token/uid 可能在根层级或嵌套在 data 字段内
      token: data.token || (data.data as any)?.token || "",
      uid: String(data.uid || (data.data as any)?.uid || ""),
      nickName: data.nickname || data.nickName || (data.data as any)?.nickname || (data.data as any)?.nickName || "",
      avatar: data.avatar,
      mobile: data.mobile,
    };
  }

  /** 校验 Token 有效性 */
  async verifyToken(token: string): Promise<{ uid: string } | null> {
    const url = `${this.baseUrl}/intra/v1/api/verifyToken?token=${encodeURIComponent(token)}`;
    console.log("[Passport] 校验Token");

    try {
      const res = await fetchWithTimeout(url);
      const data: PassportResponse = await res.json();

      if (data.code === 200 && data.uid) {
        return { uid: String(data.uid) };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** 根据 Token 获取用户信息 */
  async getTokenInfo(token: string): Promise<{
    uid: string;
    nickName: string;
    avatar?: string;
    mobile?: string;
  } | null> {
    const url = `${this.baseUrl}/intra/v1/api/getTokenInfo?token=${encodeURIComponent(token)}`;
    console.log("[Passport] 获取TokenInfo");

    try {
      const res = await fetchWithTimeout(url);
      const data: PassportResponse = await res.json();

      if (data.code === 200 && data.uid) {
        return {
          uid: String(data.uid),
          nickName: data.nickname || data.nickName || "",
          avatar: data.avatar,
          mobile: data.mobile,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const passportService = new PassportService();