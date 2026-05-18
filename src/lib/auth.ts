/**
 * Auth utility — JWT 管理 + 登录/注册辅助
 * 所有页面共享这份逻辑
 */

import { api } from "./api";

/** 同步检查是否已认证（有 JWT） */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem("jwt");
  const uid = localStorage.getItem("uid");
  return !!token && !!uid;
}

/** 获取已存储的 auth 信息 (同步，可能为 null) */
export function getAuth(): { uid: string; nickName: string; token: string } | null {
  const token = localStorage.getItem("jwt");
  const uid = localStorage.getItem("uid");
  const nickName = localStorage.getItem("nickName");
  if (!token || !uid) return null;
  return { uid, nickName: nickName ?? "", token };
}

/**
 * 确保已认证 — 如果有 localStorage JWT 则验证并返回；
 * 如果没有则返回 null（让页面决定是否跳转到 /auth）
 */
export async function ensureAuth(): Promise<{ uid: string; nickName: string; token: string } | null> {
  const token = localStorage.getItem("jwt");
  const uid = localStorage.getItem("uid");

  if (!token || !uid) return null;

  // Verify the JWT is still valid with backend
  try {
    const result = await api.authLoginToken(token);
    // Update nickName from backend (may have changed)
    localStorage.setItem("nickName", result.nickName);
    return { uid: result.uid, nickName: result.nickName, token };
  } catch {
    // Token expired or invalid — clear and return null
    clearAuth();
    return null;
  }
}

/** 游客注册 — 快速体验，不保存身份 */
export async function guestRegister(nickName?: string): Promise<{ uid: string; nickName: string; token: string }> {
  const result = await api.authGuest(nickName);
  localStorage.setItem("jwt", result.token);
  localStorage.setItem("uid", result.uid);
  localStorage.setItem("nickName", result.nickName);
  return { uid: result.uid, nickName: result.nickName, token: result.token };
}

/** 用户名+密码注册 */
export async function register(username: string, password: string, nickName?: string): Promise<{ uid: string; nickName: string; token: string }> {
  const result = await api.authRegister(username, password, nickName);
  localStorage.setItem("jwt", result.token);
  localStorage.setItem("uid", result.uid);
  localStorage.setItem("nickName", result.nickName);
  return { uid: result.uid, nickName: result.nickName, token: result.token };
}

/** 用户名+密码登录 */
export async function login(username: string, password: string): Promise<{ uid: string; nickName: string; token: string }> {
  const result = await api.authLogin(username, password);
  localStorage.setItem("jwt", result.token);
  localStorage.setItem("uid", result.uid);
  localStorage.setItem("nickName", result.nickName);
  return { uid: result.uid, nickName: result.nickName, token: result.token };
}

/** 清除认证信息 */
export function clearAuth(): void {
  localStorage.removeItem("jwt");
  localStorage.removeItem("uid");
  localStorage.removeItem("nickName");
}

/** 退出登录 — 清除 auth 并跳转大厅 */
export function logout(): void {
  clearAuth();
  window.location.href = "/";
}