import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** 是否隐藏背景色 (用于已有自定义背景的页面) */
  noBg?: boolean;
}

/**
 * 竖屏页面容器
 * max-w-[390px] 居中，适配移动端
 */
export function PageContainer({ children, className = "", noBg = false }: PageContainerProps) {
  return (
    <div
      className={`relative w-full min-h-[100dvh] overflow-hidden ${noBg ? "" : "bg-[var(--color-bg-base)]"} ${className}`}
    >
      {children}
    </div>
  );
}
