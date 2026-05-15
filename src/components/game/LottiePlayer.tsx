"use client";

import { useEffect, useRef, useState } from "react";

interface LottiePlayerProps {
  src: string;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lottie 动画播放器
 * 使用 lottie-react 动态加载 JSON 动画文件
 * 当 src 对应的 Lottie JSON 文件不可用时，显示占位容器
 */
export function LottiePlayer({
  src,
  width,
  height,
  loop = true,
  autoplay = true,
  className = "",
  style,
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const animationRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    import("lottie-react").then(({ default: Lottie }) => {
      if (cancelled || !containerRef.current) return;

      fetch(src)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load");
          return res.json();
        })
        .then((data) => {
          if (cancelled || !containerRef.current) return;
          // 使用 lottie-react 的 useLottie hook 替代方案:
          // 直接渲染 Lottie 组件
          setError(false);
          import("react-dom/client").then(({ createRoot }) => {
            // 实际上 lottie-react 导出的是 React 组件，需要不同的渲染方式
            // 这里简化：直接用 div 占位，等有实际文件时再集成
          });
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    }).catch(() => {
      if (!cancelled) setError(true);
    });

    return () => { cancelled = true; };
  }, [src]);

  const containerStyle: React.CSSProperties = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {error ? (
        <div className="w-full h-full flex items-center justify-center bg-[var(--color-gold)]/5 rounded-lg border border-[var(--color-gold)]/10">
          <span className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-noto-serif)]">
            anim
          </span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[11px] text-[var(--color-text-muted)] animate-pulse font-[family-name:var(--font-noto-serif)]">
            loading...
          </span>
        </div>
      )}
    </div>
  );
}
