/**
 * 蛐蛐透明背景占位图生成
 * 运行: npx tsx scripts/gen-crickets.ts
 */
import sharp from "sharp";
import path from "node:path";

const CRICKET_DIR = path.resolve("public/assets/crickets");
const GOLD = "#c5a059";

const colors = [
  ["#8b3a1a", "#3a1a0a"], // 赤褐
  ["#4a6040", "#2a3a20"], // 青绿
  ["#6b5080", "#3a2850"], // 紫
  ["#6a4a30", "#3a2a1a"], // 褐
  ["#8a6a20", "#4a3a10"], // 金
  ["#4a5050", "#2a3030"], // 黑
];

async function genCricket(index: number, bodyColor: string, darkColor: string) {
  const w = 400, h = 400;
  const cx = w / 2, cy = h / 2;

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <!-- 触须 -->
    <path d="M${cx} ${cy - 55} Q${cx - 50} ${cy - 120} ${cx - 75} ${cy - 140}" fill="none" stroke="${GOLD}" stroke-width="3" stroke-opacity="0.5" stroke-linecap="round"/>
    <path d="M${cx} ${cy - 55} Q${cx + 50} ${cy - 120} ${cx + 75} ${cy - 140}" fill="none" stroke="${GOLD}" stroke-width="3" stroke-opacity="0.5" stroke-linecap="round"/>

    <!-- 后腿 -->
    <path d="M${cx - 20} ${cy + 20} L${cx - 85} ${cy + 60} L${cx - 75} ${cy + 70}" fill="none" stroke="${darkColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
    <path d="M${cx + 20} ${cy + 20} L${cx + 85} ${cy + 60} L${cx + 75} ${cy + 70}" fill="none" stroke="${darkColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>

    <!-- 中腿 -->
    <path d="M${cx - 15} ${cy + 5} L${cx - 70} ${cy + 25} L${cx - 65} ${cy + 35}" fill="none" stroke="${darkColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
    <path d="M${cx + 15} ${cy + 5} L${cx + 70} ${cy + 25} L${cx + 65} ${cy + 35}" fill="none" stroke="${darkColor}" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>

    <!-- 前腿 -->
    <path d="M${cx - 20} ${cy - 15} L${cx - 55} ${cy - 5} L${cx - 50} ${cy + 5}" fill="none" stroke="${darkColor}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <path d="M${cx + 20} ${cy - 15} L${cx + 55} ${cy - 5} L${cx + 50} ${cy + 5}" fill="none" stroke="${darkColor}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>

    <!-- 身体: 椭圆形 -->
    <ellipse cx="${cx}" cy="${cy}" rx="45" ry="70" fill="${bodyColor}" opacity="0.7"/>

    <!-- 头 -->
    <ellipse cx="${cx}" cy="${cy - 55}" rx="22" ry="18" fill="${darkColor}" opacity="0.8"/>

    <!-- 眼睛 -->
    <circle cx="${cx - 10}" cy="${cy - 60}" r="5" fill="${GOLD}" opacity="0.4"/>
    <circle cx="${cx + 10}" cy="${cy - 60}" r="5" fill="${GOLD}" opacity="0.4"/>

    <!-- 翅膀 -->
    <ellipse cx="${cx}" cy="${cy}" rx="40" ry="65" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-opacity="0.25" stroke-dasharray="8 4"/>

    <!-- 腹部纹路 -->
    <path d="M${cx - 25} ${cy - 20} Q${cx} ${cy - 10} ${cx + 25} ${cy - 20}" fill="none" stroke="${darkColor}" stroke-width="1" opacity="0.3"/>
    <path d="M${cx - 30} ${cy + 0} Q${cx} ${cy + 10} ${cx + 30} ${cy + 0}" fill="none" stroke="${darkColor}" stroke-width="1" opacity="0.3"/>
    <path d="M${cx - 28} ${cy + 20} Q${cx} ${cy + 30} ${cx + 28} ${cy + 20}" fill="none" stroke="${darkColor}" stroke-width="1" opacity="0.3"/>
  </svg>`;

  // 400x400 源图
  await sharp(Buffer.from(svg)).resize(400, 400).png().toFile(
    path.join(CRICKET_DIR, `cricket-00${index}.png`)
  );
  // 200x200 缩略图
  await sharp(Buffer.from(svg)).resize(200, 200).png().toFile(
    path.join(CRICKET_DIR, `cricket-00${index}-thumb.png`)
  );
}

async function main() {
  for (let i = 0; i < 6; i++) {
    const [body, dark] = colors[i];
    await genCricket(i + 1, body, dark);
    console.log(`  cricket-00${i + 1}.png (透明底, ${body})`);
  }
  console.log("\n蛐蛐透明底占位图生成完毕！");
}

main().catch((e) => { console.error(e); process.exit(1); });
