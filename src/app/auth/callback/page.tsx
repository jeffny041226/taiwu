"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * 外部登录回调页
 * 接收 h5.shuziwenbo.cn 登录后回传的 sz_t 参数（格式: ${token}_${uid}）
 * 调用后端 /api/auth/callback 同步用户信息后跳转首页
 */
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const szT = searchParams.get("sz_t") || "";

    if (!szT) {
      console.warn("[AuthCallback] 缺少 sz_t 参数，直接跳转首页");
      router.replace("/");
      return;
    }

    // sz_t 格式: ${token}_${uid}，取最后一个下划线分割
    const lastUnderscore = szT.lastIndexOf("_");
    if (lastUnderscore <= 0) {
      console.warn("[AuthCallback] sz_t 格式错误:", szT);
      router.replace("/");
      return;
    }

    const token = szT.slice(0, lastUnderscore);
    const uid = szT.slice(lastUnderscore + 1);

    console.log("[AuthCallback] sz_t 解析成功, uid:", uid);

    // 调用后端同步用户信息
    fetch("/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, uid }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.uid) {
          localStorage.setItem("passport_token", token);
          localStorage.setItem("uid", data.uid);
          localStorage.setItem("nickName", data.nickName || "");
          console.log("[AuthCallback] 登录成功，跳转首页");
        }
        router.replace("/");
      })
      .catch(() => {
        console.warn("[AuthCallback] 后端同步失败，直接跳转");
        router.replace("/");
      });
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
