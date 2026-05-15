/**
 * HTTP API 客户端
 */
const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  /** 获取用户信息 */
  getUserProfile: () => request<{ uid: string; nickName: string; avatar?: string }>("/user/profile"),

  /** 获取用户战绩 */
  getUserStats: () => request<{ wins: number; losses: number; draws: number }>("/user/stats"),

  /** 获取用户蛐蛐列表 */
  getCrickets: () => request<{ crickets: unknown[] }>("/crickets"),

  /** 获取蛐蛐模板列表 */
  getTemplates: () => request<{ templates: unknown[] }>("/crickets/templates"),

  /** 放生蛐蛐 */
  releaseCricket: (cricketId: number) =>
    request<{ success: boolean }>("/crickets/release", {
      method: "POST",
      body: JSON.stringify({ cricketId }),
    }),

  /** 抽笼 */
  pullGacha: (count: 1 | 5 | 10) =>
    request<{ results: unknown[] }>("/gacha/pull", {
      method: "POST",
      body: JSON.stringify({ count }),
    }),

  /** 校验房间 */
  checkRoom: (roomId: string) => request<{ exists: boolean; phase: string }>(`/room/${roomId}`),
};
