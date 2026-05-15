/**
 * Lottie 动画占位文件生成
 * 生成最小但有效的 Lottie JSON 文件（Bodymovin 格式）
 * 运行: npx tsx scripts/generate-lottie.ts
 */
import fs from "node:fs";
import path from "node:path";

const ANIM_DIR = path.resolve("public/assets/animations");

interface LottieSpec {
  file: string;
  w: number;
  h: number;
  fps: number;
  frames: number;
  description: string;
}

/** 创建最小 Lottie JSON */
function createLottie(spec: LottieSpec): string {
  const { w, h, fps, frames } = spec;
  const totalFrames = frames;
  const frameMs = 1000 / fps;

  // 简单的透明度脉动: opacity 0.3 → 0.6 → 0.3
  const keyframes = [];

  // 添加一个基础形状层
  const layer = {
    ddd: 0,
    ind: 1,
    ty: 4, // shape layer
    nm: spec.description,
    sr: 1,
    ks: {
      o: { // opacity
        a: 1, // animated
        k: [
          { t: 0, s: [60] },
          { t: Math.floor(totalFrames / 2), s: [100] },
          { t: totalFrames, s: [60] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [w / 2, h / 2, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: 0, s: [100, 100, 100] },
          { t: Math.floor(totalFrames / 2), s: [104, 104, 100] },
          { t: totalFrames, s: [100, 100, 100] },
        ],
      },
    },
    shapes: [
      {
        ty: "rc", // rectangle
        d: 1,
        s: { a: 0, k: [w * 0.7, h * 0.5] },
        p: { a: 0, k: [0, 0] },
        r: { a: 0, k: 8 },
      },
      {
        ty: "fl", // fill
        c: { a: 0, k: [0.773, 0.627, 0.349, 0.3] }, // gold with alpha
        o: { a: 0, k: 100 },
      },
      {
        ty: "st", // stroke
        c: { a: 0, k: [0.773, 0.627, 0.349, 0.5] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 1 },
      },
    ],
    ip: 0,
    op: totalFrames,
    st: 0,
  };

  return JSON.stringify({
    v: "5.9.0",
    fr: fps,
    ip: 0,
    op: totalFrames,
    w,
    h,
    nm: spec.description,
    ddd: 0,
    assets: [],
    layers: [layer],
  }, null, 2);
}

const specs: LottieSpec[] = [
  { file: "logo-breathing.json",     w: 260, h: 80,  fps: 24, frames: 84,  description: "Logo 呼吸" },
  { file: "cricket-chirp.json",      w: 200, h: 200, fps: 24, frames: 48,  description: "蛐蛐鸣叫" },
  { file: "spirit-wave.json",        w: 200, h: 200, fps: 24, frames: 48,  description: "声波扩散" },
  { file: "battle-intro.json",       w: 390, h: 500, fps: 24, frames: 48,  description: "开战动画" },
  { file: "damage-float.json",       w: 100, h: 50,  fps: 24, frames: 20,  description: "伤害浮动" },
  { file: "cricket-defeated.json",   w: 90,  h: 90,  fps: 24, frames: 22,  description: "蛐蛐战败" },
  { file: "gacha-open.json",         w: 320, h: 320, fps: 24, frames: 36,  description: "开笼" },
  { file: "gacha-reveal-common.json",    w: 180, h: 240, fps: 24, frames: 24,  description: "普通揭示" },
  { file: "gacha-reveal-rare.json",      w: 180, h: 240, fps: 24, frames: 29,  description: "稀有揭示" },
  { file: "gacha-reveal-epic.json",      w: 180, h: 240, fps: 24, frames: 34,  description: "史诗揭示" },
  { file: "gacha-reveal-legendary.json", w: 220, h: 280, fps: 24, frames: 43,  description: "传说揭示" },
  { file: "round-win.json",          w: 390, h: 280, fps: 24, frames: 48,  description: "本局胜利" },
  { file: "game-over.json",          w: 390, h: 360, fps: 24, frames: 60,  description: "最终结算" },
  { file: "hp-low-pulse.json",       w: 280, h: 12,  fps: 24, frames: 36,  description: "低血量呼吸" },
  { file: "golden-pulse.json",       w: 296, h: 296, fps: 24, frames: 48,  description: "金环脉动" },
  { file: "loading-spinner.json",    w: 60,  h: 60,  fps: 24, frames: 36,  description: "加载动画" },
  { file: "transition-page.json",    w: 390, h: 844, fps: 24, frames: 20,  description: "页面转场" },
];

for (const spec of specs) {
  const json = createLottie(spec);
  fs.writeFileSync(path.join(ANIM_DIR, spec.file), json);
  console.log(`  ${spec.file} (${spec.w}×${spec.h}, ${spec.frames}f)`);
}

console.log(`\n${specs.length} 个 Lottie 动画文件生成完毕！`);
