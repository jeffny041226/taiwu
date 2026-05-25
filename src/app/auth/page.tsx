"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { sendCode, loginWithCode } from "@/lib/auth";

type Status = "idle" | "sending" | "codeSent" | "loggingIn" | "error";

export default function AuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(mobile)) {
      setErrorMsg("请输入正确的手机号");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      await sendCode(mobile);
      setStatus("codeSent");
      startCountdown();
    } catch (e: any) {
      setErrorMsg(e.message || "发送验证码失败");
      setStatus("error");
    }
  };

  const handleLogin = async () => {
    if (!mobile || !code) {
      setErrorMsg("请输入手机号和验证码");
      return;
    }
    if (code.length !== 6) {
      setErrorMsg("验证码为6位");
      return;
    }
    setStatus("loggingIn");
    setErrorMsg("");
    try {
      await loginWithCode(mobile, code);
      router.push("/");
    } catch (e: any) {
      setErrorMsg(e.message || "登录失败");
      setStatus("error");
    }
  };

  const isLoading = status === "sending" || status === "loggingIn";
  const canSendCode = !isLoading && countdown === 0 && mobile.length === 11;

  return (
    <div className="relative w-full min-h-[100dvh] bg-cover bg-center" style={{ backgroundImage: "linear-gradient(180deg, #2a2212 0%, #3d3020 30%, #2a2212 70%, #1a1408 100%)" }}>
      <TopBar title="登录" backHref="/" />

      {/* Spacer */}
      <div className="pt-14" />

      {/* Form */}
      <div className="flex flex-col items-center px-4">
        <div className="w-full max-w-[358px] flex flex-col gap-4">

          {/* Phone number */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">手机号</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={mobile}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setMobile(v);
                  setErrorMsg("");
                  setStatus("idle");
                  // 修改手机号时清除倒计时
                  if (countdown > 0) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setCountdown(0);
                  }
                }}
                disabled={isLoading}
                placeholder="请输入手机号"
                maxLength={11}
                className="flex-1 h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!canSendCode}
                className="h-[48px] px-4 rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[13px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : status === "sending" ? "发送中..." : "获取验证码"}
              </button>
            </div>
          </div>

          {/* SMS Code */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">验证码</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                setErrorMsg("");
                setStatus("idle");
              }}
              disabled={isLoading}
              placeholder="请输入6位验证码"
              maxLength={6}
              className="w-full h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] tracking-[6px] text-center text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] placeholder:tracking-normal outline-none focus:border-[var(--color-gold)]/70"
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-[13px] text-red-400 text-center font-[family-name:var(--font-noto-serif)]">{errorMsg}</p>
          )}

          {/* Login button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading || mobile.length !== 11 || code.length !== 6}
            style={{ opacity: isLoading ? 0.5 : 1 }}
            className="w-full h-[50px] rounded-[10px] border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {status === "loggingIn" ? "登录中..." : "登录"}
          </button>

          {/* 提示 */}
          <p className="text-[12px] text-[var(--color-text-muted)] text-center font-[family-name:var(--font-noto-serif)]">
            测试环境可使用万能验证码 666666
          </p>
        </div>
      </div>
    </div>
  );
}