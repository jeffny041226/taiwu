import type { CricketTemplate } from "@taiwu/shared/types/cricket";

/**
 * HTTP API 客户端 — 指向独立后端服务
 */
const BASE_URL = "/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("passport_token") : null;
  const uid = typeof window !== "undefined" ? localStorage.getItem("uid") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (uid) headers["X-Passport-Uid"] = uid;
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface UserCricketResponse {
  id: number;
  template_id: number;
  template: CricketTemplate;
  obtained_at: string;
}

export const api = {
  /** 发送短信验证码 */
  authSendCode: (mobile: string) =>
    request<{ success: boolean }>("/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),

  /** 验证码登录 */
  authLoginWithCode: (mobile: string, code: string) =>
    request<{ token: string; uid: string; nickName: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ mobile, code }),
    }),

  /** 验证 Passport Token */
  authVerifyToken: (token: string) =>
    request<{ uid: string; nickName: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  /** 获取用户信息 */
  getUserProfile: () => request<{ uid: string; nickName: string; avatar?: string }>("/user/profile"),

  /** 获取用户战绩 */
  getUserStats: () => request<{ wins: number; losses: number; draws: number }>("/user/stats"),

  /** 获取用户蛐蛐列表 */
  getCrickets: () => request<{ crickets: UserCricketResponse[] }>("/crickets"),

  /** 获取蛐蛐模板列表 */
  getTemplates: () => request<{ templates: CricketTemplate[] }>("/crickets/templates"),

  /** 放生蛐蛐 */
  releaseCricket: (cricketId: number) =>
    request<{ success: boolean }>("/crickets/release", {
      method: "POST",
      body: JSON.stringify({ cricketId }),
    }),

  /** 获取抽奖次数 */
  getGachaChances: () => request<{ chances: number }>("/gacha/chances"),

  /** 抽笼 */
  pullGacha: (count: 1 | 5 | 10) =>
    request<{ results: UserCricketResponse[]; count: number }>("/gacha/pull", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),

  /** 创建支付订单 */
  createPayOrder: (product: string) =>
    request<{ success: boolean; order_id: string; mock: boolean; mweb_url: string | null }>("/pay/create", {
      method: "POST",
      body: JSON.stringify({ product }),
    }),

  /** 确认支付（mock 模式） */
  confirmPay: (orderId: string) =>
    request<{ success: boolean; chances: number; dup?: boolean }>("/pay/confirm", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    }),

  /** 查询支付状态 */
  payStatus: (orderId: string) => request<{ paid: boolean; chances: number }>(`/pay/status?order_id=${orderId}`),

  /** 校验房间 */
  checkRoom: (roomId: string) => request<{ exists: boolean; phase: string }>(`/room/${roomId}`),
};