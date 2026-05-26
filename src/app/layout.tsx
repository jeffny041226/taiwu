import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Ma_Shan_Zheng } from "next/font/google";
import "./globals.css";

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const maShanZheng = Ma_Shan_Zheng({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-ma-shan",
  display: "swap",
  fallback: ["var(--font-noto-serif)"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "斗蛐蛐 — 巅峰至臻对战版",
  description: "古风蛐蛐格斗游戏",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${notoSerifSC.variable} ${maShanZheng.variable}`}>
      <body className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] overflow-x-hidden">
        <div className="mx-auto max-w-[390px] min-h-[100dvh] relative overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
