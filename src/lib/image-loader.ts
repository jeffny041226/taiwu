/**
 * Cricket image URL resolver (canonical)
 *
 * Post-MySQL/MinIO migration:
 * - DB `cricket_templates.image_key` stores a full public URL (e.g. `http://localhost:9000/cricket-images/crickets/cricket-001.png`)
 * - Just return it as-is
 *
 * Fallback (no imageKey) maps templateId → local /assets/crickets/cricket-NNN-thumb.png
 * (6 unique images cycled across 20 templates)
 */

const S3_BASE = process.env.NEXT_PUBLIC_S3_BASE_URL || "";

/**
 * Resolve a cricket image URL.
 * @param imageKey Full public URL stored in DB (post-migration) — null/undefined for local fallback
 * @param templateId 1..20 — used to compute local fallback path
 */
export function getCricketImageUrl(
  imageKey: string | null | undefined,
  templateId: number
): string {
  if (imageKey) return imageKey;
  const num = ((templateId - 1) % 6) + 1;
  return `/assets/crickets/cricket-${String(num).padStart(3, "0")}-thumb.png`;
}

/**
 * Legacy: build a full S3 URL from a key.
 * Kept for callers that pass raw keys (e.g. user_crickets.image_key before migration).
 */
export function buildS3Url(key: string): string {
  if (key.startsWith("http")) return key;
  return S3_BASE ? `${S3_BASE}/${key}` : `/assets/crickets/${key}`;
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
