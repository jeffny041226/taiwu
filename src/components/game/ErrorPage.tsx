"use client";

import Link from "next/link";

interface ErrorPageProps {
  title?: string;
  message?: string;
  showHome?: boolean;
}

export function ErrorPage({
  title = "出错了",
  message = "请稍后再试",
  showHome = true,
}: ErrorPageProps) {
  return (
    <div className="relative w-full min-h-[100dvh] bg-[var(--color-bg-base)] flex flex-col items-center justify-center px-4">
      <div className="text-[60px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)]/30 mb-4">!</div>
      <h1 className="text-[22px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] mb-2">
        {title}
      </h1>
      <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)] mb-8">
        {message}
      </p>
      {showHome && (
        <Link
          href="/"
          className="w-[200px] h-[44px] rounded-[10px] border border-[var(--color-gold)]/30 bg-gradient-to-b from-[rgba(30,22,16,0.85)] to-[rgba(20,14,10,0.9)] text-[18px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)] flex items-center justify-center hover:border-[var(--color-gold)]/70 transition-all active:scale-[0.98]"
        >
          返回大厅
        </Link>
      )}
    </div>
  );
}
