"use client";

interface LoadingOverlayProps {
  message?: string;
  visible?: boolean;
}

export function LoadingOverlay({ message = "加载中...", visible = true }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-[50] bg-[var(--color-bg-base)]/80 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="w-[60px] h-[60px] rounded-full border-2 border-[var(--color-gold)]/20 border-t-[var(--color-gold)] animate-spin mb-4" />
      <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">
        {message}
      </p>
    </div>
  );
}
