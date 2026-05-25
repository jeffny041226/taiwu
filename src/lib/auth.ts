/**
 * Auth utility — 山海 Passport 登录管理
 * 所有页面共享这份逻辑
 */

import { api } from "./api";

/** 同步检查是否已认证（有 Passport Token） */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem("passport_token");
  const uid = localStorage.getItem("uid");
  return !!token && !!uid;
}

/** 获取已存储的 auth 信息 (同步，可能为 null) */
export function getAuth(): { uid: string; nickName: string; token: string } | null {
  const token = localStorage.getItem("passport_token");
  const uid = localStorage.getItem("uid");
  const nickName = localStorage.getItem("nickName");
  if (!token || !uid) return null;
  return { uid, nickName: nickName ?? "", token };
}

/**
 * 确保已认证 — 如果有 localStorage token 则验证并返回；
 * 如果没有则返回 null（让页面决定是否跳转到 /auth）
 */
export async function ensureAuth(): Promise<{ uid: string; nickName: string; token: string } | null> {
  const token = localStorage.getItem("passport_token");
  const uid = localStorage.getItem("uid");

  if (!token || !uid) return null;

  // Verify the token is still valid with backend
  try {
    const result = await api.authVerifyToken(token);
    // Update nickName from backend (may have changed)
    localStorage.setItem("nickName", result.nickName);
    return { uid: result.uid, nickName: result.nickName, token };
  } catch {
    // Token expired or invalid — clear and return null
    clearAuth();
    return null;
  }
}

/** 发送短信验证码 */
export async function sendCode(mobile: string): Promise<void> {
  await api.authSendCode(mobile);
}

/** 验证码登录 */
export async function loginWithCode(mobile: string, code: string): Promise<{ uid: string; nickName: string; token: string }> {
  const result = await api.authLoginWithCode(mobile, code);
  localStorage.setItem("passport_token", result.token);
  localStorage.setItem("uid", result.uid);
  localStorage.setItem("nickName", result.nickName);
  return { uid: result.uid, nickName: result.nickName, token: result.token };
}

/** 清除认证信息 */
export function clearAuth(): void {
  localStorage.removeItem("passport_token");
  localStorage.removeItem("uid");
  localStorage.removeItem("nickName");
}

/** 获取外部登录 URL（h5.shuziwenbo.cn 统一登录入口） */
export function getLoginUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const targetUrl = encodeURIComponent(`${baseUrl}/auth/callback`);
  return `http://h5.shuziwenbo.cn/login?from=modou&target=${targetUrl}`;
}

/** 退出登录 — 清除 auth 并跳转大厅 */
export function logout(): void {
  clearAuth();
  window.location.href = "/";
}