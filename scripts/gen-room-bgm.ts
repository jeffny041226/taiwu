/**
 * 生成选蛐蛐页面 BGM — 紧张对战前氛围
 * 运行: npx tsx scripts/gen-room-bgm.ts
 */
const API_KEY = "sk-cp-tVcwbJ1GRPm3pLSDXul-oqJjDncx3wmoy49XVv4GeT0F2-yO3hCuwxlvjea-T6LFj4UbDovbbnzwsSNNWwOazV7ADorlcejQuAQRhBvYC7SXed8Ew1vTAzQ";
import fs from "node:fs";
import path from "node:path";

async function main() {
  console.log("[MiniMax] Generating tense battle-preparation BGM...");

  const res = await fetch("https://api.minimax.chat/v1/music_generation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "music-2.6",
      prompt: "紧张,紧凑,中国传统战场气氛,渐进鼓点,笛子高亢,蓄势待发,屏息凝神,即将开战的紧张感,古代中国对战前奏,激烈,扣人心弦",
      lyrics: "",
      is_instrumental: true,
    }),
  });

  const data = await res.json();

  if (data?.data?.audio) {
    const buf = Buffer.from(data.data.audio, "hex");
    const outPath = path.resolve("public/assets/audio/bgm/bgm-room.mp3");
    fs.writeFileSync(outPath, buf);
    console.log(`[MiniMax] Done! ${(buf.length / 1024).toFixed(1)} KB`);
  } else {
    console.error("[MiniMax] Unexpected response:", JSON.stringify(data).slice(0, 500));
  }
}

main().catch(console.error);
