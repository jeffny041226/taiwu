/**
 * 上传蛐蛐素材图片到 Supabase Storage 并更新数据库 image_key
 *
 * 使用方式: npx tsx scripts/upload-cricket-images.ts
 *
 * 需要在 packages/backend/.env 中配置:
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "packages/backend/.env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = "cricket-images";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("请在 packages/backend/.env 配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ASSETS_DIR = path.resolve(process.cwd(), "public/assets/crickets");

// 12 个图片文件
const files = [
  "cricket-001.png", "cricket-001-thumb.png",
  "cricket-002.png", "cricket-002-thumb.png",
  "cricket-003.png", "cricket-003-thumb.png",
  "cricket-004.png", "cricket-004-thumb.png",
  "cricket-005.png", "cricket-005-thumb.png",
  "cricket-006.png", "cricket-006-thumb.png",
];

// 20 只蛐蛐分配图片 (映射 template id → image number)
// 6张图循环: id 1→001, 2→002, ... 6→006, 7→001, 8→002, ... 20→002
const cricketImageMap: Record<number, number> = {};
for (let i = 1; i <= 20; i++) {
  cricketImageMap[i] = ((i - 1) % 6) + 1;
}

async function main() {
  // 1. 创建 Storage bucket（如果不存在）
  console.log("[1] 检查/创建 Storage bucket...");
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // 公开读取，不需要签名URL
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });
    if (error) {
      console.error("创建 bucket 失败:", error.message);
      process.exit(1);
    }
    console.log(`  创建 bucket "${BUCKET_NAME}" 成功`);
  } else {
    console.log(`  bucket "${BUCKET_NAME}" 已存在`);
  }

  // 2. 上传图片文件
  console.log("[2] 上传图片到 Storage...");
  for (const file of files) {
    const filePath = path.join(ASSETS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  文件不存在: ${filePath}, 跳过`);
      continue;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `crickets/${file}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: "image/png",
        upsert: true, // 覆盖已有文件
      });

    if (error) {
      console.error(`  上传失败: ${file} → ${error.message}`);
    } else {
      console.log(`  上传成功: ${file}`);
    }
  }

  // 3. 获取公开 URL 并更新数据库
  console.log("[3] 更新数据库 image_key...");
  for (let id = 1; id <= 20; id++) {
    const imgNum = cricketImageMap[id];
    const padded = String(imgNum).padStart(3, "0");
    const imageKey = `crickets/cricket-${padded}.png`;

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(imageKey);

    const publicUrl = urlData.publicUrl;
    console.log(`  id=${id}: ${publicUrl}`);

    // 更新数据库
    const { error } = await supabase
      .from("cricket_templates")
      .update({ image_key: publicUrl })
      .eq("id", id);

    if (error) {
      console.error(`  更新失败: id=${id} → ${error.message}`);
    } else {
      console.log(`  更新成功: id=${id}`);
    }
  }

  console.log("\n完成！所有蛐蛐图片已上传到云端，数据库 image_key 已更新为公开 URL");
}

main().catch(err => {
  console.error("脚本执行失败:", err);
  process.exit(1);
});