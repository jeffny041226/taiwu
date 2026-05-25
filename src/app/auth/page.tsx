"use client";

import { useEffect } from "react";
import { getLoginUrl } from "@/lib/auth";

/**
 * 登录页
 * 直接重定向到外部 h5.shuziwenbo.cn 登录
 * 回调地址: /auth/callback?token=xxx&uid=xxx&nickName=xxx
 */
export default function AuthPage() {
  useEffect(() => {
    window.location.href = getLoginUrl();
  }, []);

  return (
    <div className="w-full min-h-[100dvh] bg-[var(--color-bg-base)] flex items-center justify-center">
      <p className="text-[var(--color-gold)] text-sm animate-pulse">正在跳转至登录页...</p>
    </div>
  );
}
