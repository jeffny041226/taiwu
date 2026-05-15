"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightSlot?: ReactNode;
  rightWide?: boolean;
}

export function TopBar({ title, showBack = true, backHref = "/", rightSlot, rightWide }: TopBarProps) {
  return (
    <header className="sticky top-0 z-[10] flex items-center h-[55px] px-4 bg-[var(--color-bg-base)]/95 backdrop-blur-sm">
      <div className="w-9">
        {showBack && (
          <Link href={backHref} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
            <span className="text-[var(--color-gold)] text-xl">←</span>
          </Link>
        )}
      </div>
      {title && (
        <h1 className="flex-1 text-center text-[20px] font-bold text-[var(--color-gold)] font-[family-name:var(--font-noto-serif)]">
          {title}
        </h1>
      )}
      <div className={rightWide ? "flex justify-end min-w-0" : "w-9 flex justify-end"}>{rightSlot}</div>
    </header>
  );
}
