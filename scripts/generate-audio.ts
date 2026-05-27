/**
 * 音频素材生成 — 用 ffmpeg 合成真实音调，不再生成静音占位。
 * 运行: npx tsx scripts/generate-audio.ts
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const AUDIO_DIR = path.resolve("public/assets/audio");

function quiet(cmd: string): void {
  execSync(cmd, { stdio: "pipe" });
}

/** 正弦波音 */
function tone(freq: number, durSec: number, opts?: { vol?: number; fadeIn?: number; fadeOut?: number }): string {
  const v = opts?.vol ?? 0.5;
  let expr = `sine=frequency=${freq}:duration=${durSec},afade=t=in:d=${opts?.fadeIn ?? 0},afade=t=out:st=${durSec - (opts?.fadeOut ?? 0)}:d=${opts?.fadeOut ?? 0},volume=${v}`;
  return expr;
}

/** 多正弦波混音 */
function tones(freqs: number[], durSec: number, opts?: { vol?: number; fadeIn?: number; fadeOut?: number }): string {
  const v = (opts?.vol ?? 0.5) / freqs.length;
  const inputs = freqs.map((f, i) => `sine=frequency=${f}:duration=${durSec}[a${i}];`);
  const labels = freqs.map((_, i) => `[a${i}]`);
  let expr = inputs.join("") + labels.join("") + `amix=inputs=${freqs.length}:duration=longest:dropout_transition=0,volume=${v}`;
  if (opts?.fadeIn || opts?.fadeOut) {
    expr += `,afade=t=in:d=${opts?.fadeIn ?? 0},afade=t=out:st=${durSec - (opts?.fadeOut ?? 0)}:d=${opts?.fadeOut ?? 0}`;
  }
  return expr;
}

/** 噪声 (用 aevalsrc 生成随机采样) */
function noise(durSec: number, vol = 0.3): string {
  return `aevalsrc=exprs='random(0)*2-1':sample_rate=44100:duration=${durSec},highpass=f=200,lowpass=f=4000,volume=${vol}`;
}

/** 生成短促音符序列 */
function notes(seq: number[], noteLen: number, opts?: { vol?: number; wave?: string; fadeOut?: number }): string {
  const v = opts?.vol ?? 0.4;
  const fout = opts?.fadeOut ?? 0.05;
  const totalDur = seq.length * noteLen;
  const parts: string[] = [];
  seq.forEach((f, i) => {
    const start = i * noteLen;
    parts.push(`sine=frequency=${f}:duration=${totalDur},afade=t=in:st=${start}:d=0.005,afade=t=out:st=${start + noteLen - fout}:d=${fout},volume=${v}`);
  });
  const labels = parts.map((_, i) => `[n${i}]`);
  let expr = parts.map((p, i) => `${p}[n${i}]`).join(";") + ";" + labels.join("") + `amix=inputs=${seq.length}:duration=longest:dropout_transition=0`;
  return expr;
}

// ═══════════════════════════════════════════
// BGM 生成
// ═══════════════════════════════════════════

function genBgm(): void {
  console.log("Generating BGM...");

  // bgm-home: 舒缓氛围 — 低频和弦 + 缓慢调制, 60s
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=110:duration=60[a];sine=frequency=165:duration=60[b];sine=frequency=220:duration=60[c];` +
    `[a][b][c]amix=inputs=3:duration=longest:dropout_transition=0,volume=0.3,lowpass=f=800,afade=t=in:d=3,afade=t=out:st=55:d=5` +
    `" -q:a 5 "${AUDIO_DIR}/bgm/bgm-home.mp3"`
  );

  // bgm-market: 稍活泼 — 五声音阶缓慢轮转, 60s
  const marketNotes = [262, 294, 330, 392, 440, 392, 330, 294];
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    notes(marketNotes, 7.5, { vol: 0.12, fadeOut: 1 }) +
    `,lowpass=f=1500,afade=t=in:d=3,afade=t=out:st=55:d=5` +
    `" -q:a 5 "${AUDIO_DIR}/bgm/bgm-market.mp3"`
  );

  // bgm-battle: 紧张 — 低音脉冲 + 高频 perc, 90s
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=82:duration=90[a];sine=frequency=165:duration=90[b];sine=frequency=247:duration=90[c];` +
    `[a][b][c]amix=inputs=3:duration=longest:dropout_transition=0,volume=0.3,lowpass=f=1200,afade=t=in:d=2,afade=t=out:st=85:d=5` +
    `" -q:a 5 "${AUDIO_DIR}/bgm/bgm-battle.mp3"`
  );

  // bgm-victory: 胜利 — 上行琶音, 15s
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    notes([262, 330, 392, 523, 659, 784, 1047], 1.8, { vol: 0.15, fadeOut: 0.3 }) +
    `,afade=t=in:d=0.5,afade=t=out:st=12:d=3` +
    `" -q:a 5 "${AUDIO_DIR}/bgm/bgm-victory.mp3"`
  );

  console.log("  BGM done.");
}

// ═══════════════════════════════════════════
// SFX 生成
// ═══════════════════════════════════════════

function genSfx(): void {
  console.log("Generating SFX...");

  // heavy-hit: 低频 thump + 噪声 (400ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=120:duration=0.4,afade=t=out:st=0.2:d=0.2,volume=0.6[a];` +
    `aevalsrc=exprs='random(0)*2-1':sample_rate=44100:duration=0.4,highpass=f=300,lowpass=f=3000,afade=t=out:st=0.2:d=0.2,volume=0.3[b];` +
    `[a][b]amix=inputs=2:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-heavy-hit.mp3"`
  );

  // feint: 快速划空音 (300ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=800:duration=0.3,afade=t=in:d=0.005,afade=t=out:st=0.2:d=0.1,volume=0.4` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-feint.mp3"`
  );

  // block: 金属碰撞 (400ms) — 双频短促
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=900:duration=0.4,afade=t=out:st=0.2:d=0.2,volume=0.5[a];` +
    `sine=frequency=1350:duration=0.4,afade=t=out:st=0.2:d=0.2,volume=0.3[b];` +
    `[a][b]amix=inputs=2:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-block.mp3"`
  );

  // chirp: 蛐蛐鸣叫 — 高频颤音 (650ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=2200:duration=0.65,afade=t=in:d=0.01,afade=t=out:st=0.3:d=0.35,volume=0.5` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-chirp.mp3"`
  );

  // damage-taken: 短噪声冲击 (250ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `aevalsrc=exprs='random(0)*2-1':sample_rate=44100:duration=0.25,highpass=f=100,lowpass=f=6000,afade=t=in:d=0.01,afade=t=out:st=0.15:d=0.1,volume=0.5` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-damage-taken.mp3"`
  );

  // cricket-defeat: 下行悲音 (650ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=400:duration=0.65,afade=t=out:st=0.3:d=0.35,volume=0.5` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-cricket-defeat.mp3"`
  );

  // round-win: 上行三音 (1.2s)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=523:duration=0.4,afade=t=out:d=0.2,volume=0.4[a];` +
    `sine=frequency=659:duration=0.4,afade=t=in:st=0.4:d=0.01,afade=t=out:st=0.8:d=0.2,volume=0.4[b];` +
    `sine=frequency=784:duration=0.4,afade=t=in:st=0.8:d=0.01,afade=t=out:st=1.2:d=0.4,volume=0.4[c];` +
    `[a][b][c]amix=inputs=3:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-round-win.mp3"`
  );

  // round-lose: 下行三音 (1.2s)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=392:duration=0.4,afade=t=out:d=0.2,volume=0.4[a];` +
    `sine=frequency=330:duration=0.4,afade=t=in:st=0.4:d=0.01,afade=t=out:st=0.8:d=0.2,volume=0.4[b];` +
    `sine=frequency=262:duration=0.4,afade=t=in:st=0.8:d=0.01,afade=t=out:st=1.2:d=0.4,volume=0.4[c];` +
    `[a][b][c]amix=inputs=3:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-round-lose.mp3"`
  );

  // game-win: 胜利号角 (2.5s)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=523:duration=0.5,afade=t=out:d=0.3,volume=0.4[a];` +
    `sine=frequency=659:duration=0.5,afade=t=in:st=0.5:d=0.01,afade=t=out:st=1:d=0.3,volume=0.4[b];` +
    `sine=frequency=784:duration=0.5,afade=t=in:st=1:d=0.01,afade=t=out:st=1.5:d=0.3,volume=0.4[c];` +
    `sine=frequency=1047:duration=1,afade=t=in:st=1.5:d=0.01,afade=t=out:st=2:d=0.5,volume=0.4[d];` +
    `[a][b][c][d]amix=inputs=4:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-game-win.mp3"`
  );

  // game-lose: 失败悲音 (2.5s)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=330:duration=0.5,afade=t=out:d=0.3,volume=0.4[a];` +
    `sine=frequency=262:duration=0.5,afade=t=in:st=0.5:d=0.01,afade=t=out:st=1:d=0.3,volume=0.4[b];` +
    `sine=frequency=220:duration=0.5,afade=t=in:st=1:d=0.01,afade=t=out:st=1.5:d=0.3,volume=0.4[c];` +
    `sine=frequency=196:duration=1,afade=t=in:st=1.5:d=0.01,afade=t=out:st=2:d=0.5,volume=0.3[d];` +
    `[a][b][c][d]amix=inputs=4:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-game-lose.mp3"`
  );

  // button-click: 短促点击 (150ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=1500:duration=0.15,afade=t=out:st=0.05:d=0.1,volume=0.4` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-button-click.mp3"`
  );

  // gacha-open: 开笼 — 低频隆隆 + 嘎吱 (650ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=80:duration=0.65,afade=t=in:d=0.02,afade=t=out:st=0.4:d=0.25,volume=0.4[a];` +
    `sine=frequency=200:duration=0.55,afade=t=in:d=0.05,afade=t=out:st=0.3:d=0.25,volume=0.25[b];` +
    `[a][b]amix=inputs=2:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-gacha-open.mp3"`
  );

  // gacha-reveal: 闪光揭示 (400ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=1000:duration=0.4,afade=t=in:d=0.01,afade=t=out:st=0.2:d=0.2,volume=0.4[a];` +
    `sine=frequency=1600:duration=0.4,afade=t=in:d=0.01,afade=t=out:st=0.2:d=0.2,volume=0.2[b];` +
    `[a][b]amix=inputs=2:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-gacha-reveal.mp3"`
  );

  // gacha-legendary: 传说揭示 — 更辉煌的琶音 (1.2s)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=1200:duration=0.2,afade=t=out:d=0.1,volume=0.3[a];` +
    `sine=frequency=1600:duration=0.2,afade=t=in:st=0.2:d=0.01,afade=t=out:st=0.4:d=0.1,volume=0.3[b];` +
    `sine=frequency=2000:duration=0.2,afade=t=in:st=0.4:d=0.01,afade=t=out:st=0.6:d=0.1,volume=0.3[c];` +
    `sine=frequency=2400:duration=0.2,afade=t=in:st=0.6:d=0.01,afade=t=out:st=0.8:d=0.1,volume=0.3[d];` +
    `sine=frequency=3000:duration=0.4,afade=t=in:st=0.8:d=0.01,afade=t=out:st=1.2:d=0.4,volume=0.3[e];` +
    `[a][b][c][d][e]amix=inputs=5:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-gacha-legendary.mp3"`
  );

  // room-join: 门铃 chime (400ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=587:duration=0.2,afade=t=out:d=0.1,volume=0.4[a];` +
    `sine=frequency=784:duration=0.2,afade=t=in:st=0.2:d=0.01,afade=t=out:st=0.4:d=0.2,volume=0.4[b];` +
    `[a][b]amix=inputs=2:duration=longest:dropout_transition=0` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-room-join.mp3"`
  );

  // ready: 确认音 beep (250ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=880:duration=0.25,afade=t=in:d=0.01,afade=t=out:st=0.15:d=0.1,volume=0.4` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-ready.mp3"`
  );

  // countdown: 倒计时滴答 (150ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=1000:duration=0.15,afade=t=out:st=0.05:d=0.1,volume=0.4` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-countdown.mp3"`
  );

  // ui-panel: 柔和 panel 音 (250ms)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=600:duration=0.25,afade=t=in:d=0.01,afade=t=out:st=0.15:d=0.1,volume=0.3` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-ui-panel.mp3"`
  );

  // cricket-ambient: 蛐蛐环境音 (800ms, 带间隔感的颤音)
  quiet(
    `ffmpeg -y -f lavfi -i "` +
    `sine=frequency=2800:duration=0.8,afade=t=in:d=0.05,afade=t=out:st=0.5:d=0.3,volume=0.4` +
    `" -q:a 5 "${AUDIO_DIR}/sfx/sfx-cricket-chirp.mp3"`
  );

  console.log("  SFX done.");
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

console.log("开始生成音频素材...\n");

fs.mkdirSync(path.join(AUDIO_DIR, "bgm"), { recursive: true });
fs.mkdirSync(path.join(AUDIO_DIR, "sfx"), { recursive: true });

genBgm();
genSfx();

console.log("\n音频素材生成完毕！");