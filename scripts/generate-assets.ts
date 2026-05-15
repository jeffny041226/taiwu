/**
 * 素材占位文件生成脚本
 * 使用 sharp 生成所有规格的占位图
 * 运行: npx tsx scripts/generate-assets.ts
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ASSETS_DIR = path.resolve("public/assets");
const GOLD = "#c5a059";
const GOLD_DIM = "#8a7040";
const BG_BASE = "#0a0807";
const TEXT_PRIMARY = "#e0d8c8";
const TEXT_MUTED = "#6a5840";

// ======== 辅助函数 ========

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/** 创建纯色带边框和标签的占位图 */
async function createPlaceholder(
  filepath: string, w: number, h: number,
  bgColor: string, borderColor: string, label: string,
  textColor: string = TEXT_MUTED
) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${bgColor}" rx="4"/>
    <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="${borderColor}" stroke-width="1" rx="3"/>
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-family="serif" font-size="${Math.min(w, h) * 0.25}" fill="${textColor}">${label}</text>
    <text x="${w / 2}" y="${h / 2 + Math.min(w, h) * 0.2}" text-anchor="middle" font-family="sans-serif" font-size="8" fill="${textColor}" opacity="0.5">${w}×${h}</text>
  </svg>`;

  const format = filepath.endsWith(".webp") ? "webp" : "png";
  await sharp(Buffer.from(svg)).resize(w, h)[format]().toFile(filepath);
}

/** 创建背景图 */
async function createBg(filepath: string, label: string, accentColor: string) {
  const w = 390, h = 844;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g" cx="50%" cy="60%" r="60%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${BG_BASE}" stop-opacity="1"/>
      </radialGradient>
      <pattern id="ink" width="60" height="40" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="8" fill="${accentColor}" opacity="0.03"/>
        <circle cx="40" cy="25" r="5" fill="${accentColor}" opacity="0.02"/>
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="${BG_BASE}"/>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${h}" fill="url(#ink)"/>
    <text x="195" y="420" text-anchor="middle" font-family="serif" font-size="28" fill="${GOLD}" opacity="0.3">${label}</text>
    <text x="195" y="460" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${GOLD_DIM}" opacity="0.2">390×844 WebP</text>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(w, h).webp().toFile(filepath);
}

/** 创建 9-slice 按钮 */
async function createButton(filepath: string, w: number, h: number, label: string, accentColor: string) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(30,22,16,0.95)"/>
        <stop offset="100%" stop-color="rgba(20,14,10,0.98)"/>
      </linearGradient>
    </defs>
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="8" fill="url(#bg)" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.3"/>
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-family="serif" font-size="${Math.min(h * 0.35, 20)}" font-weight="bold" fill="${GOLD}">${label}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(filepath);
}

/** 创建徽章 */
async function createBadge(filepath: string, label: string, textColor: string) {
  const w = 62, h = 22;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" rx="4" fill="${textColor}" fill-opacity="0.15"/>
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="11" fill="${textColor}">${label}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(w, h).png().toFile(filepath);
}

// ======== 主函数 ========

async function main() {
  console.log("开始生成占位素材...\n");

  // --- 背景图 (390×844 WebP) ---
  console.log("[1/8] 背景图...");
  const bgs = [
    ["bg-home.webp", "大厅·水墨山水", "#6b4030"],
    ["bg-market.webp", "虫市·古玩摊", "#4a5058"],
    ["bg-backpack.webp", "背包·书斋", "#3a2a20"],
    ["bg-battle.webp", "战斗·暗黑", "#1a1510"],
    ["bg-room.webp", "房间·演武场", "#4a3828"],
  ];
  for (const [file, label, color] of bgs) {
    await createBg(`${ASSETS_DIR}/backgrounds/${file}`, label, color);
  }

  // --- UI: 按钮 ---
  console.log("[2/8] UI 按钮...");
  const btnDir = `${ASSETS_DIR}/ui/buttons`;
  await createButton(`${btnDir}/btn-primary-bg.png`, 342, 50, "主按钮", GOLD);
  await createButton(`${btnDir}/btn-action-bg.png`, 175, 66, "动作", GOLD);
  await createButton(`${btnDir}/btn-action-heavy.png`, 175, 66, "猛击", "rgba(197,74,58,0.5)");
  await createButton(`${btnDir}/btn-action-feint.png`, 175, 66, "虚晃", "rgba(139,92,246,0.5)");
  await createButton(`${btnDir}/btn-action-block.png`, 175, 66, "格挡", "rgba(74,122,154,0.5)");
  await createButton(`${btnDir}/btn-action-chirp.png`, 175, 66, "鸣叫", "rgba(138,154,74,0.5)");
  await createButton(`${btnDir}/btn-gacha-bg.png`, 175, 42, "抽笼", GOLD);

  // --- UI: 边框/卡片 ---
  console.log("[3/8] 边框卡片...");
  const frameDir = `${ASSETS_DIR}/ui/frames`;
  await createPlaceholder(`${frameDir}/frame-golden.png`, 177, 194, "rgba(197,160,89,0.05)", GOLD, "金框", GOLD);
  await createPlaceholder(`${frameDir}/card-bg-backpack.png`, 173, 215, "rgba(20,14,10,0.8)", `${GOLD}40`, "卡片", TEXT_PRIMARY);
  await createPlaceholder(`${frameDir}/card-bg-room.png`, 173, 190, "rgba(20,14,10,0.8)", `${GOLD}40`, "选择", TEXT_PRIMARY);
  await createPlaceholder(`${frameDir}/room-code-bg.png`, 140, 36, "rgba(20,14,10,0.8)", `${GOLD}40`, "房间号", GOLD);
  await createPlaceholder(`${frameDir}/display-plate.png`, 300, 220, "rgba(10,8,7,0.5)", `${GOLD}30`, "展示区", TEXT_PRIMARY);

  // --- UI: 品质徽章 ---
  console.log("[4/8] 品质徽章...");
  const badgeDir = `${ASSETS_DIR}/ui/badges`;
  await createBadge(`${badgeDir}/badge-common.png`, "普通", "#a0a0a0");
  await createBadge(`${badgeDir}/badge-rare.png`, "稀有", "#4a90d9");
  await createBadge(`${badgeDir}/badge-epic.png`, "史诗", "#8b5cf6");
  await createBadge(`${badgeDir}/badge-legendary.png`, "传说", GOLD);

  // --- UI: 编号标记 ---
  console.log("[5/8] 编号图标...");
  const numDir = `${ASSETS_DIR}/ui/numbers`;
  for (const n of [1, 2, 3]) {
    const svg = `<svg width="26" height="26" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="12.5" fill="${GOLD}" opacity="0.9"/>
      <text x="13" y="14" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="14" font-weight="bold" fill="${BG_BASE}">${n}</text>
    </svg>`;
    await sharp(Buffer.from(svg)).resize(26, 26).png().toFile(`${numDir}/num-${n}.png`);
  }

  // --- UI: 图标 ---
  console.log("[6/8] 图标...");
  const iconDir = `${ASSETS_DIR}/ui/icons`;
  const icons: [string, number, number, string, string][] = [
    ["icon-backpack.png", 40, 40, "囊", TEXT_PRIMARY],
    ["icon-avatar-default.png", 40, 40, "?", GOLD],
    ["icon-versus.png", 80, 40, "VS", GOLD],
    ["icon-release.png", 22, 22, "✕", "#e04040"],
    ["icon-back-arrow.png", 36, 36, "←", GOLD],
    ["icon-toggle-on.png", 40, 22, "ON", GOLD],
    ["icon-toggle-off.png", 40, 22, "OFF", TEXT_MUTED],
    ["icon-copy.png", 18, 18, "📋", TEXT_MUTED],
  ];
  for (const [file, w, h, label, color] of icons) {
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="4" fill="${BG_BASE}" opacity="0.5"/>
      <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="${Math.min(w, h) * 0.6}" fill="${color}">${label}</text>
    </svg>`;
    await sharp(Buffer.from(svg)).resize(w, h).png().toFile(`${iconDir}/${file}`);
  }

  // --- UI: 竞技场 ---
  console.log("[7/8] 竞技场...");
  const arenaDir = `${ASSETS_DIR}/ui/arena`;
  // arena-circle
  let svg = `<svg width="280" height="280" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="gc"><stop offset="0%" stop-color="#6b5040"/><stop offset="100%" stop-color="#3a2820"/></radialGradient></defs>
    <circle cx="140" cy="140" r="140" fill="url(#gc)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(280, 280).png().toFile(`${arenaDir}/arena-circle.png`);

  // arena-ring
  svg = `<svg width="296" height="296" xmlns="http://www.w3.org/2000/svg">
    <circle cx="148" cy="148" r="144" fill="none" stroke="${GOLD}" stroke-width="8" opacity="0.4"/>
    <circle cx="148" cy="148" r="140" fill="none" stroke="${BG_BASE}" stroke-width="2" opacity="0.3"/>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(296, 296).png().toFile(`${arenaDir}/arena-ring.png`);

  // arena-dou
  svg = `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
    <text x="30" y="36" text-anchor="middle" font-family="serif" font-size="42" fill="${GOLD_DIM}" opacity="0.4" transform="rotate(5,30,30)">斗</text>
  </svg>`;
  await sharp(Buffer.from(svg)).resize(60, 60).png().toFile(`${arenaDir}/arena-dou.png`);

  // --- UI: 血条/耐力条 ---
  const barsDir = `${ASSETS_DIR}/ui/bars`;
  await sharp({ create: { width: 280, height: 12, channels: 4, background: { r: 90, g: 34, b: 24, alpha: 1 } } }).png().toFile(`${barsDir}/hp-bar-bg.png`);
  await sharp({ create: { width: 1, height: 12, channels: 4, background: { r: 160, g: 80, b: 64, alpha: 1 } } }).png().toFile(`${barsDir}/hp-bar-fill.png`);
  await sharp({ create: { width: 1, height: 12, channels: 4, background: { r: 197, g: 112, b: 48, alpha: 1 } } }).png().toFile(`${barsDir}/hp-bar-fill-low.png`);
  await sharp({ create: { width: 280, height: 8, channels: 4, background: { r: 58, g: 80, b: 104, alpha: 1 } } }).png().toFile(`${barsDir}/stamina-bar-bg.png`);
  await sharp({ create: { width: 1, height: 8, channels: 4, background: { r: 90, g: 120, b: 144, alpha: 1 } } }).png().toFile(`${barsDir}/stamina-bar-fill.png`);

  // --- UI: 杂项 ---
  const miscDir = `${ASSETS_DIR}/ui/misc`;
  await createPlaceholder(`${miscDir}/logo-text.png`, 260, 70, "transparent", GOLD, "斗蛐蛐", GOLD);
  await createPlaceholder(`${miscDir}/modal-bg.png`, 342, 320, "rgba(20,14,10,0.95)", `${GOLD}60`, "弹窗", TEXT_PRIMARY);
  await createPlaceholder(`${miscDir}/cage-closed.png`, 120, 120, "rgba(30,20,10,0.9)", `${GOLD}40`, "笼", GOLD);
  await createPlaceholder(`${miscDir}/marquee-bg.png`, 390, 36, "rgba(20,14,10,0.7)", `${GOLD}20`, "", TEXT_MUTED);

  // --- UI: 枫叶粒子 ---
  await createPlaceholder(`${ASSETS_DIR}/ui/particles/particle-maple.png`, 40, 40, "transparent", "#8b3a3a", "🍁", "#8b3a3a");

  // --- 蛐蛐占位图 ---
  console.log("[8/8] 蛐蛐 & 头像...");
  const cricketDir = `${ASSETS_DIR}/crickets`;
  // 400x400 源图
  for (let i = 1; i <= 6; i++) {
    const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="${BG_BASE}" opacity="0.3"/>
      <ellipse cx="200" cy="180" rx="80" ry="60" fill="rgba(197,160,89,0.15)" stroke="${GOLD}" stroke-width="1" stroke-opacity="0.3"/>
      <circle cx="200" cy="160" r="30" fill="rgba(197,160,89,0.1)"/>
      <text x="200" y="270" text-anchor="middle" font-family="serif" font-size="48" fill="${GOLD}" opacity="0.3">虫 ${i}</text>
      <text x="200" y="310" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${TEXT_MUTED}">400×400</text>
    </svg>`;
    await sharp(Buffer.from(svg)).resize(400, 400).png().toFile(`${cricketDir}/cricket-00${i}.png`);
    // 同时生成 200×200 缩略图
    await sharp(Buffer.from(svg)).resize(200, 200).png().toFile(`${cricketDir}/cricket-00${i}-thumb.png`);
  }

  // 头像
  const avatarDir = `${ASSETS_DIR}/avatars`;
  for (const [file, label] of [["avatar-default.png", "?"], ["avatar-ai.png", "AI"]]) {
    const svg = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="23" fill="rgba(197,160,89,0.1)" stroke="${GOLD}" stroke-width="1.5" stroke-opacity="0.4"/>
      <text x="24" y="26" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="18" fill="${GOLD}" opacity="0.6">${label}</text>
    </svg>`;
    await sharp(Buffer.from(svg)).resize(48, 48).png().toFile(`${avatarDir}/${file}`);
  }

  console.log("\n所有占位图片素材生成完毕！");
  console.log(`输出目录: ${ASSETS_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
