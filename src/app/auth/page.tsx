"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TopBar } from "@/components/layout/TopBar";
import { login, register } from "@/lib/auth";

type Tab = "login" | "register";
type Status = "idle" | "loading" | "error";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Login form
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Register form
  const [regUser, setRegUser] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regNick, setRegNick] = useState("");

  const handleLogin = async () => {
    if (!loginUser || !loginPass) {
      setErrorMsg("请输入用户名和密码");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await login(loginUser, loginPass);
      router.push("/");
    } catch (e: any) {
      setErrorMsg(e.message || "登录失败");
      setStatus("error");
    }
  };

  const handleRegister = async () => {
    if (!regUser || !regPass) {
      setErrorMsg("请输入用户名和密码");
      return;
    }
    if (regPass.length < 6) {
      setErrorMsg("密码至少6位");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      await register(regUser, regPass, regNick || undefined);
      router.push("/");
    } catch (e: any) {
      setErrorMsg(e.message || "注册失败");
      setStatus("error");
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)]">
      <TopBar title="登录" backHref="/" />

      {/* Logo */}
      <div className="flex flex-col items-center pt-8 pb-6">
        <div className="w-[260px] h-[70px] flex items-center justify-center">
          <Image src="/assets/ui/misc/logo-text.png" alt="斗蛐蛐" width={260} height={70} unoptimized className="object-contain" />
        </div>
        <p className="text-[14px] text-[var(--color-text-secondary)] tracking-[3px] font-[family-name:var(--font-noto-serif)] mt-2">
          登录以保存您的战绩与蛐蛐
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => { setTab("login"); setErrorMsg(""); }}
          className={`px-6 py-2 rounded-lg border font-[family-name:var(--font-noto-serif)] text-[16px] transition-all ${
            tab === "login"
              ? "border-[var(--color-gold)] bg-[rgba(197,160,89,0.12)] text-[var(--color-gold)]"
              : "border-white/5 bg-transparent text-[var(--color-text-muted)]"
          }`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => { setTab("register"); setErrorMsg(""); }}
          className={`px-6 py-2 rounded-lg border font-[family-name:var(--font-noto-serif)] text-[16px] transition-all ${
            tab === "register"
              ? "border-[var(--color-gold)] bg-[rgba(197,160,89,0.12)] text-[var(--color-gold)]"
              : "border-white/5 bg-transparent text-[var(--color-text-muted)]"
          }`}
        >
          注册
        </button>
      </div>

      {/* Form */}
      <div className="flex flex-col items-center px-4">
        <div className="w-full max-w-[358px] flex flex-col gap-4">

          {tab === "login" ? (
            <>
              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">用户名</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  disabled={isLoading}
                  placeholder="请输入用户名"
                  className="w-full h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70"
                />
              </div>
              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">密码</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  disabled={isLoading}
                  placeholder="请输入密码"
                  className="w-full h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70"
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
                style={{ opacity: isLoading ? 0.5 : 1 }}
                className="w-full h-[50px] rounded-[10px] border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all"
              >
                {isLoading ? "登录中..." : "登录"}
              </button>
            </>
          ) : (
            <>
              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">用户名</label>
                <input
                  type="text"
                  value={regUser}
                  onChange={(e) => setRegUser(e.target.value)}
                  disabled={isLoading}
                  placeholder="最多50字符"
                  maxLength={50}
                  className="w-full h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70"
                />
              </div>
              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">密码</label>
                <input
                  type="password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  disabled={isLoading}
                  placeholder="至少6位"
                  className="w-full h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70"
                />
              </div>
              {/* Nickname */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">昵称（可选）</label>
                <input
                  type="text"
                  value={regNick}
                  onChange={(e) => setRegNick(e.target.value)}
                  disabled={isLoading}
                  placeholder="不填则自动生成"
                  maxLength={50}
                  className="w-full h-[48px] rounded-[10px] border border-[var(--color-gold)]/30 bg-[rgba(20,14,10,0.8)] px-4 text-[16px] text-[var(--color-text-primary)] font-[family-name:var(--font-noto-serif)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-gold)]/70"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <p className="text-[13px] text-red-400 text-center font-[family-name:var(--font-noto-serif)]">{errorMsg}</p>
              )}

              {/* Register button */}
              <button
                type="button"
                onClick={handleRegister}
                style={{ opacity: isLoading ? 0.5 : 1 }}
                className="w-full h-[50px] rounded-[10px] border border-[var(--color-gold)] bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] hover:border-[var(--color-gold)]/70 active:scale-[0.98] transition-all"
              >
                {isLoading ? "注册中..." : "注册"}
              </button>
            </>
          )}

          {/* 游客入口已移除 */}
        </div>
      </div>
    </div>
  );
}