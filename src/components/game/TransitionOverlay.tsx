"use client";

import { useEffect, useState } from "react";

interface TransitionOverlayProps {
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

/**
 * 转场动画遮罩
 * 用于页面切换时的过渡效果
 */
export function TransitionOverlay({
  message = "正在进入...",
  duration = 1500,
  onComplete,
}: TransitionOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    const outTimer = setTimeout(() => setAnimateOut(true), duration - 400);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className={`absolute inset-0 z-[100] bg-[var(--color-bg-base)] flex flex-col items-center justify-center transition-opacity duration-400 ${animateOut ? "opacity-0" : "opacity-100"}`}>
      <div className="text-[48px] font-[family-name:var(--font-ma-shan)] text-[var(--color-gold)] animate-pulse mb-3">
        斗
      </div>
      <p className="text-[14px] text-[var(--color-text-secondary)] font-[family-name:var(--font-noto-serif)]">
        {message}
      </p>
    </div>
  );
}
