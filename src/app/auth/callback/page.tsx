"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * 外部登录回调页
 * 接收 h5.shuziwenbo.cn 登录后回传的 token 参数，存入 localStorage 后跳转首页
 * 兼容 query string 和 hash fragment 两种回调方式
 */
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // 先从 query string 读取
    let token = searchParams.get("token") || searchParams.get("passport_token") || searchParams.get("access_token") || "";
    let uid = searchParams.get("uid") || searchParams.get("passport_uid") || searchParams.get("user_id") || "";
    let nickName = searchParams.get("nickName") || searchParams.get("nickname") || searchParams.get("user_name") || "";

    // 如果 query string 没有，尝试从 hash fragment 读取（兼容#param=value格式）
    if (!token && typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      token = hashParams.get("token") || hashParams.get("passport_token") || hashParams.get("access_token") || "";
      uid = hashParams.get("uid") || hashParams.get("passport_uid") || hashParams.get("user_id") || "";
      nickName = hashParams.get("nickName") || hashParams.get("nickname") || hashParams.get("user_name") || "";
    }

    console.log("[AuthCallback] token:", token ? `${token.slice(0, 20)}...` : "无", "uid:", uid || "无");

    if (token && uid) {
      localStorage.setItem("passport_token", token);
      localStorage.setItem("uid", uid);
      localStorage.setItem("nickName", nickName || `玩家${uid.slice(-4)}`);
      console.log("[AuthCallback] 登录成功，跳转首页");
    } else {
      console.warn("[AuthCallback] 缺少 token/uid 参数，直接跳转首页");
    }

    router.replace("/");
  }, [router, searchParams]);

  return (
    <div className="w-full min-h-[100dvh] bg-[var(--color-bg-base)] flex items-center justify-center">
      <p className="text-[var(--color-gold)] text-sm animate-pulse">登录验证中...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-[100dvh] bg-[var(--color-bg-base)] flex items-center justify-center">
        <p className="text-[var(--color-gold)] text-sm animate-pulse">登录验证中...</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
