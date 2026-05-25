/**
 * 转换首页素材
 * 运行: npx tsx scripts/process-home-assets.ts
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const TEMP = path.resolve("temp");
const PUBLIC = path.resolve("public/assets");

async function main() {
  // 1. 背景图: PNG → WebP，放到 backgrounds 目录
  const bgSrc = path.join(TEMP, "微信图片_20260525171622_11_170.png");
  const bgDest = path.join(PUBLIC, "backgrounds", "bg-home.webp");
  
  if (fs.existsSync(bgSrc)) {
    console.log("处理背景图...");
    await sharp(bgSrc)
      .resize(780, 1688, { fit: "cover", position: "center" })
      .webp({ quality: 85 })
      .toFile(bgDest);
    const stat = fs.statSync(bgDest);
    console.log(`  背景图已生成: ${bgDest} (${(stat.size / 1024).toFixed(0)} KB)`);
  } else {
    console.error("背景图源文件不存在:", bgSrc);
  }

  // 2. 标题文案: 直接放到 images 目录
  const titleSrc = path.join(TEMP, "斗蛐蛐.png");
  const titleDest = path.join(PUBLIC, "ui", "title-logo.png");

  if (fs.existsSync(titleSrc)) {
    console.log("处理标题文案...");
    fs.mkdirSync(path.dirname(titleDest), { recursive: true });
    await sharp(titleSrc)
      .png({ quality: 90 })
      .toFile(titleDest);
    const stat = fs.statSync(titleDest);
    console.log(`  标题图已生成: ${titleDest} (${(stat.size / 1024).toFixed(0)} KB)`);
  } else {
    console.error("标题图文案源文件不存在:", titleSrc);
  }
}

main().catch(console.error);
