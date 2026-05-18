import type { CricketTemplate } from "@taiwu/shared/types/cricket";

/**
 * HTTP API 客户端 — 指向独立后端服务
 */
const BASE_URL = "/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  /** 用户名+密码注册 */
  authRegister: (username: string, password: string, nickName?: string) =>
    request<{ token: string; uid: string; nickName: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, nickName }),
    }),

  /** 游客快速注册 */
  authGuest: (nickName?: string) =>
    request<{ token: string; uid: string; nickName: string }>("/auth/guest", {
      method: "POST",
      body: JSON.stringify({ nickName }),
    }),

  /** 用户名+密码登录 */
  authLogin: (username: string, password: string) =>
    request<{ token: string; uid: string; nickName: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  /** JWT token 登录（验证已有 token） */
  authLoginToken: (token: string) =>
    request<{ uid: string; nickName: string }>("/auth/login-token", {
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

  /** 抽笼 */
  pullGacha: (count: 1 | 5 | 10) =>
    request<{ results: UserCricketResponse[]; count: number }>("/gacha/pull", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),

  /** 校验房间 */
  checkRoom: (roomId: string) => request<{ exists: boolean; phase: string }>(`/room/${roomId}`),
};