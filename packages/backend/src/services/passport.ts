import { PASSPORT_BASE_URL, PASSPORT_PLATFORM } from "../config/env";
import { getProxyAgent } from "../lib/proxy-agent";

interface PassportResponse<T = unknown> {
  code: number;
  msg?: string;
  message?: string;
  data?: T;
  token?: string;
  uid?: string | number;
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
 * 请求 Passport API 并解析 JSON，同时处理 uid 大数精度问题。
 *
 * 山海 Passport 返回的 uid 是 JSON number（如 1790264563728388111），
 * 共 19 位 > Number.MAX_SAFE_INTEGER（16 位），默认 JSON.parse 会丢失精度
 * （末尾 111 → 000）。
 *
 * 做法：在 parse 前用正则把 "uid":<数字> 替换为 "uid":"<字符串>"，
 * 保证 uid 值原样保留。
 */
async function fetchPassportJson<T>(
  url: string, init?: RequestInit
): Promise<T> {
  const res = await fetchWithTimeout(url, init);
  const text = await res.text();
  // 只替换 uid 字段（顶层或 data 内），避免误伤其他数字字段
  const fixed = text.replace(/"uid"\s*:\s*(\d+)/g, '"uid":"$1"');
  return JSON.parse(fixed) as T;
}

/**
 * 山海 Passport API 客户端 — 后端代理 passport.szwb.imgo.tv 接口
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
    console.log("[Passport] 获取验证码:", mobile.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"));

    const data = await fetchPassportJson<PassportResponse>(url);
    if (data.code === 200) return;
    throw new Error(data.msg || data.message || "发送验证码失败");
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

    const data = await fetchPassportJson<PassportResponse>(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    console.log("[Passport] 验证码登录响应:", JSON.stringify(data).slice(0, 300));

    if (data.code !== 200) {
      throw new Error(data.msg || data.message || "登录失败");
    }

    return {
      // data.token/uid 可能在根层级或嵌套在 data 字段内
      // uid 已由 fetchPassportJson 处理为字符串，这里直接取
      token: data.token || (data.data as any)?.token || "",
      uid: String(data.uid || (data.data as any)?.uid || ""),
      nickName: data.nickname || data.nickName || (data.data as any)?.nickname || (data.data as any)?.nickName || "",
      avatar: data.avatar || (data.data as any)?.avatar,
      mobile: data.mobile,
    };
  }

  /** 校验 Token 有效性 */
  async verifyToken(token: string): Promise<{ uid: string } | null> {
    const url = `${this.baseUrl}/intra/v1/api/verifyToken?token=${encodeURIComponent(token)}`;
    console.log("[Passport] 校验Token");

    try {
      const data = await fetchPassportJson<PassportResponse>(url);
      const resUid = data.uid || (data.data as any)?.uid;
      if (data.code === 200 && resUid) {
        return { uid: String(resUid) };
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
      const data = await fetchPassportJson<PassportResponse>(url);
      const resUid = data.uid || (data.data as any)?.uid;
      if (data.code === 200 && resUid) {
        return {
          uid: String(resUid),
          nickName: data.nickname || data.nickName || (data.data as any)?.nickname || (data.data as any)?.nickName || "",
          avatar: data.avatar || (data.data as any)?.avatar,
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
