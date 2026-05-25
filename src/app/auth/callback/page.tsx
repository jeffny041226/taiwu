"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * 外部登录回调页
 * 接收 h5.shuziwenbo.cn 登录后回传的 token 参数，存入 localStorage 后跳转首页
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get("token") || searchParams.get("passport_token") || "";
    const uid = searchParams.get("uid") || searchParams.get("passport_uid") || "";
    const nickName = searchParams.get("nickName") || searchParams.get("nickname") || "";

    if (token && uid) {
      localStorage.setItem("passport_token", token);
      localStorage.setItem("uid", uid);
      localStorage.setItem("nickName", nickName || `玩家${uid.slice(-4)}`);
    }

    router.replace("/");
  }, [router, searchParams]);

  return (
    <div className="w-full min-h-[100dvh] bg-[var(--color-bg-base)] flex items-center justify-center">
      <p className="text-[var(--color-gold)] text-sm animate-pulse">登录验证中...</p>
    </div>
  );
}
