/**
 * S3 图片加载器
 * 根据 image_key 生成 S3 URL，支持本地开发回退
 */

const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE_URL || "";

/**
 * 获取蛐蛐图片 URL
 * @param imageKey S3 对象路径
 * @param size 目标尺寸 (200 or 400)
 * @returns 完整的图片 URL
 */
export function getCricketImageUrl(
  imageKey: string | null | undefined,
  size: 200 | 400 = 200
): string {
  if (!imageKey) {
    return `/assets/crickets/placeholder-${size}.png`;
  }
  if (S3_BASE) {
    return `${S3_BASE}/${imageKey}`;
  }
  return `/assets/crickets/${imageKey}`;
}

/**
 * ReactDOM.preload 预加载关键图片
 * 在 layout.tsx 或 page.tsx 中调用
 */
export function preloadCriticalImages(): void {
  if (typeof document === "undefined") return;

  const criticalImages = [
    "/assets/backgrounds/bg-home.webp",
  ];

  for (const src of criticalImages) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    document.head.appendChild(link);
  }
}
