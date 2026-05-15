/**
 * 音频占位文件生成
 * 生成最小有效静音 MP3 文件
 * 运行: npx tsx scripts/generate-audio.ts
 */
import fs from "node:fs";
import path from "node:path";

const AUDIO_DIR = path.resolve("public/assets/audio");

/**
 * 创建最小的有效 MP3 文件 (0.25s 静音)
 * MPEG1 Layer3, 128kbps, 44100Hz, stereo
 */
function createSilentMp3(durationMs: number): Buffer {
  // 计算需要的帧数
  // MPEG1 Layer3: 每帧 1152 samples, 44100Hz -> ~26.12ms/帧
  const framesNeeded = Math.max(1, Math.ceil(durationMs / 26.12));
  const frameSize = 417; // 128kbps 44100Hz stereo 帧大小（含padding）

  const frames: Buffer[] = [];

  for (let i = 0; i < framesNeeded; i++) {
    // MPEG1 Layer3 帧: sync(12bit) + version(1) + layer(2) + protection(1) +
    // bitrate(4) + sampleRate(2) + padding(1) + private(1) +
    // channel(2) + modeExt(2) + copyright(1) + original(1) + emphasis(2)
    // Header: 0xFFFB9000 for 128kbps 44100Hz stereo
    const header = Buffer.from([0xFF, 0xFB, 0x90, 0x00]);
    // 静音帧数据 (side info + main data for silence)
    const sideInfo = Buffer.alloc(32, 0); // granule info (all zeros = silent)
    const mainData = Buffer.alloc(frameSize - 4 - 32, 0); // rest is silence
    frames.push(Buffer.concat([header, sideInfo, mainData]));
  }

  return Buffer.concat(frames);
}

// BGM: 60s, 128kbps 立体声
const bgmFiles = [
  ["bgm-home.mp3", 60000],
  ["bgm-market.mp3", 60000],
  ["bgm-battle.mp3", 90000],
  ["bgm-victory.mp3", 15000],
];

// SFX: <2s, 64kbps 单声道
const sfxFiles: [string, number][] = [
  ["sfx-heavy-hit.mp3", 400],
  ["sfx-feint.mp3", 300],
  ["sfx-block.mp3", 400],
  ["sfx-chirp.mp3", 650],
  ["sfx-damage-taken.mp3", 250],
  ["sfx-cricket-defeat.mp3", 650],
  ["sfx-round-win.mp3", 1200],
  ["sfx-round-lose.mp3", 1200],
  ["sfx-game-win.mp3", 2500],
  ["sfx-game-lose.mp3", 2500],
  ["sfx-button-click.mp3", 150],
  ["sfx-gacha-open.mp3", 650],
  ["sfx-gacha-reveal.mp3", 400],
  ["sfx-gacha-legendary.mp3", 1200],
  ["sfx-room-join.mp3", 400],
  ["sfx-ready.mp3", 250],
  ["sfx-countdown.mp3", 150],
  ["sfx-ui-panel.mp3", 250],
  ["sfx-cricket-chirp.mp3", 800],
];

console.log("生成音频占位文件...\n");

// BGM
for (const [file, duration] of bgmFiles) {
  const buf = createSilentMp3(duration);
  fs.writeFileSync(path.join(AUDIO_DIR, "bgm", file), buf);
  console.log(`  bgm/${file} (${duration}ms, ${buf.length} bytes)`);
}

// SFX
for (const [file, duration] of sfxFiles) {
  const buf = createSilentMp3(duration);
  fs.writeFileSync(path.join(AUDIO_DIR, "sfx", file), buf);
  console.log(`  sfx/${file} (${duration}ms)`);
}

console.log(`\n${bgmFiles.length + sfxFiles.length} 个音频文件生成完毕！`);
console.log("注意: 这些是静音占位文件，需要替换为实际音频。");
