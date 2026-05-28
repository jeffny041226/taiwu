/**
 * 全素材生成 (透明底版)
 * UI 元素 → SVG (原生透明) + PNG fallback
 * 运行: npx tsx scripts/gen-all.ts
 */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const OUT = path.resolve("public/assets");
const G = "#c5a059";
const GOLD = "rgba(197,160,89,";

function mkdir(p: string) { fs.mkdirSync(p, { recursive: true }); }

/** 写 SVG 文件 */
function svgFile(file: string, content: string) {
  mkdir(path.dirname(path.join(OUT, file)));
  fs.writeFileSync(path.join(OUT, file), content);
}

/** 写 PNG (sharp SVG → PNG with alpha) */
async function pngFromSvg(svg: string, file: string) {
  mkdir(path.dirname(path.join(OUT, file)));
  // 用 composite 方式保留透明度: 先创建透明底图, 再 composite SVG in-memory
  const base = sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const overlay = sharp(Buffer.from(svg)).ensureAlpha();
  const meta = await overlay.metadata();
  await base
    .resize(meta.width!, meta.height!, { fit: "fill" })
    .composite([{ input: await overlay.png().toBuffer(), top: 0, left: 0 }])
    .png()
    .toFile(path.join(OUT, file));
}

async function main() {
  console.log("生成透明底素材...\n");

  // ====== 背景 (全屏) ======
  for (const [f, c, l] of [["bg-home.webp","#3a2a1a","大厅"],["bg-market.webp","#2a3a3a","虫市"],["bg-backpack.webp","#2a1a10","背包"],["bg-battle.webp","#0a0807","战斗"],["bg-room.webp","#2a1a20","房间"]]) {
    await sharp(Buffer.from(`<svg width="390" height="844" xmlns="http://www.w3.org/2000/svg"><rect width="390" height="844" fill="${c}"/><circle cx="195" cy="500" r="300" fill="${G}" opacity="0.03"/><text x="195" y="422" text-anchor="middle" font-family="serif" font-size="22" fill="${G}" opacity="0.2">${l}</text></svg>`)).resize(390,844).webp().toFile(path.join(OUT, "backgrounds", f));
  }

  // ====== 按钮 SVG ======
  for (const [f, l] of [["btn-primary-bg.png","主按钮"],["btn-action-bg.png","动作"],["btn-action-heavy.png","猛击"],["btn-action-feint.png","虚晃"],["btn-action-block.png","格挡"],["btn-action-chirp.png","鸣叫"],["btn-gacha-bg.png","抽笼"]]) {
    const w = f.includes("gacha")?175:f.includes("primary")?342:175;
    const h = f.includes("gacha")?42:f.includes("primary")?50:66;
    svgFile(`ui/buttons/${f}`, `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" rx="8" fill="none" stroke="${GOLD}0.3)" stroke-width="1"/><text x="${w/2}" y="${h*0.6}" text-anchor="middle" font-family="serif" font-size="${Math.min(h*0.35,18)}" fill="${GOLD}0.6)">${l}</text></svg>`);
  }

  // ====== 边框 & 卡片 SVG ======
  for (const [f, w, h, l] of [["frame-golden.png",177,194,""],["card-bg-backpack.png",173,215,""],["card-bg-room.png",173,190,""],["room-code-bg.png",140,36,""],["display-plate.png",300,220,"展示"]]) {
    svgFile(`ui/frames/${f}`, `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${w-2}" height="${h-2}" rx="12" fill="none" stroke="${GOLD}0.15)" stroke-width="1"/>${l?`<text x="${w/2}" y="${h*0.55}" text-anchor="middle" font-family="serif" font-size="12" fill="${GOLD}0.3)">${l}</text>`:""}</svg>`);
  }

  // ====== 品质徽章 SVG ======
  for (const [f, l, c] of [["badge-common.png","普通","#a0a0a0"],["badge-rare.png","稀有","#4a90d9"],["badge-epic.png","史诗","#8b5cf6"],["badge-legendary.png","传说",G]]) {
    svgFile(`ui/badges/${f}`, `<svg width="62" height="22" xmlns="http://www.w3.org/2000/svg"><rect width="62" height="22" rx="4" fill="${c}" opacity="0.15"/><text x="31" y="16" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${c}">${l}</text></svg>`);
  }

  // ====== 编号 SVG ======
  for (const n of [1,2,3]) {
    svgFile(`ui/numbers/num-${n}.png`, `<svg width="26" height="26" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="13" r="12.5" fill="${G}"/><text x="13" y="18" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0a0807">${n}</text></svg>`);
  }

  // ====== 图标 SVG ======
  for (const [f, w, h, l] of [["icon-backpack.png",40,40,"囊"],["icon-avatar-default.png",40,40,"?"],["icon-versus.png",80,40,"VS"],["icon-release.png",22,22,"✕"],["icon-back-arrow.png",36,36,"←"],["icon-copy.png",18,18,"📋"],["icon-toggle-on.png",40,22,"I"],["icon-toggle-off.png",40,22,"O"]]) {
    svgFile(`ui/icons/${f}`, `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="${w/2}" y="${h*0.72}" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(w,h)*0.55}" fill="${GOLD}0.7)">${l}</text></svg>`);
  }

  // ====== 竞技场 SVG ======
  svgFile("ui/arena/arena-circle.png", `<svg width="280" height="280" xmlns="http://www.w3.org/2000/svg"><circle cx="140" cy="140" r="139" fill="none" stroke="#6b5040" stroke-width="2" opacity="0.5"/></svg>`);
  svgFile("ui/arena/arena-ring.png", `<svg width="296" height="296" xmlns="http://www.w3.org/2000/svg"><circle cx="148" cy="148" r="140" fill="none" stroke="${G}" stroke-width="8" opacity="0.4"/></svg>`);
  svgFile("ui/arena/arena-dou.png", `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><text x="30" y="44" text-anchor="middle" font-family="serif" font-size="42" fill="${GOLD}0.4)">斗</text></svg>`);

  // ====== 血条 (1px repeat-x PNG 有色底) ======
  for (const [f, r, g, b] of [["hp-bar-bg.png",90,34,24],["stamina-bar-bg.png",58,80,104]]) {
    await sharp({create:{width:280,height:12,channels:4,background:{r,g,b,alpha:1}}}).png().toFile(path.join(OUT,"ui/bars",f));
  }
  for (const [f, r, g, b] of [["hp-bar-fill.png",160,80,64],["hp-bar-fill-low.png",197,112,48],["stamina-bar-fill.png",90,120,144]]) {
    await sharp({create:{width:1,height:12,channels:4,background:{r,g,b,alpha:1}}}).png().toFile(path.join(OUT,"ui/bars",f));
  }

  // ====== 杂项 SVG ======
  svgFile("ui/misc/logo-text.png", `<svg width="260" height="70" xmlns="http://www.w3.org/2000/svg"><text x="130" y="46" text-anchor="middle" font-family="serif" font-size="38" font-weight="bold" fill="${GOLD}0.85)">斗蛐蛐</text></svg>`);
  svgFile("ui/misc/cage-closed.png", `<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="15" width="90" height="90" rx="8" fill="none" stroke="${GOLD}0.4)" stroke-width="2"/><line x1="30" y1="25" x2="30" y2="95" stroke="${GOLD}0.3)" stroke-width="1.5"/><line x1="90" y1="25" x2="90" y2="95" stroke="${GOLD}0.3)" stroke-width="1.5"/><line x1="20" y1="45" x2="100" y2="45" stroke="${GOLD}0.3)" stroke-width="1.5"/><line x1="20" y1="65" x2="100" y2="65" stroke="${GOLD}0.3)" stroke-width="1.5"/></svg>`);
  svgFile("ui/misc/modal-bg.png", `<svg width="342" height="320" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="342" height="320" rx="16" fill="#0a0807"/><rect x="1" y="1" width="340" height="318" rx="16" fill="none" stroke="${GOLD}0.4)" stroke-width="1"/></svg>`);
  svgFile("ui/misc/marquee-bg.png", `<svg width="390" height="36" xmlns="http://www.w3.org/2000/svg"><rect width="390" height="36" fill="#0a0807" opacity="0.7"/><line x1="0" y1="0" x2="390" y2="0" stroke="${GOLD}0.15)" stroke-width="0.5"/></svg>`);
  svgFile("ui/particles/particle-maple.png", `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><polygon points="20,2 24,15 38,18 28,26 30,40 20,32 10,40 12,26 2,18 16,15" fill="#8b3a3a" opacity="0.7"/></svg>`);

  // ====== 蛐蛐 SVG (透明底) ======
  const cc: [string,string][] = [["#8b3a1a","#3a1a0a"],["#4a6040","#2a3a20"],["#6b5080","#3a2850"],["#6a4a30","#3a2a1a"],["#8a6a20","#4a3a10"],["#4a5050","#2a3030"]];
  for (let i = 0; i < 6; i++) {
    const [body, dark] = cc[i], cx = 200, cy = 200;
    const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <!-- 触须 -->
      <path d="M${cx} ${cy-55} Q${cx-50} ${cy-120} ${cx-75} ${cy-140}" fill="none" stroke="${G}" stroke-width="2" opacity="0.35" stroke-linecap="round"/>
      <path d="M${cx} ${cy-55} Q${cx+50} ${cy-120} ${cx+75} ${cy-140}" fill="none" stroke="${G}" stroke-width="2" opacity="0.35" stroke-linecap="round"/>
      <!-- 后腿 -->
      <path d="M${cx-20} ${cy+20} L${cx-85} ${cy+60} L${cx-75} ${cy+70}" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      <path d="M${cx+20} ${cy+20} L${cx+85} ${cy+60} L${cx+75} ${cy+70}" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      <!-- 中腿 -->
      <path d="M${cx-15} ${cy+5} L${cx-60} ${cy+25} L${cx-55} ${cy+35}" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <path d="M${cx+15} ${cy+5} L${cx+60} ${cy+25} L${cx+55} ${cy+35}" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <!-- 前腿 -->
      <path d="M${cx-20} ${cy-15} L${cx-55} ${cy-5} L${cx-50} ${cy+5}" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <path d="M${cx+20} ${cy-15} L${cx+55} ${cy-5} L${cx+50} ${cy+5}" fill="none" stroke="${dark}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <!-- 身体 -->
      <ellipse cx="${cx}" cy="${cy+5}" rx="45" ry="70" fill="${body}" opacity="0.65"/>
      <!-- 头 -->
      <ellipse cx="${cx}" cy="${cy-50}" rx="22" ry="18" fill="${dark}" opacity="0.6"/>
      <!-- 眼睛 -->
      <circle cx="${cx-10}" cy="${cy-55}" r="5" fill="${G}" opacity="0.4"/>
      <circle cx="${cx+10}" cy="${cy-55}" r="5" fill="${G}" opacity="0.4"/>
      <!-- 翅膀纹 -->
      <ellipse cx="${cx}" cy="${cy+5}" rx="38" ry="62" fill="none" stroke="${dark}" stroke-width="1" opacity="0.25" stroke-dasharray="6 4"/>
    </svg>`;
    svgFile(`crickets/cricket-00${i+1}.svg`, svg);
    await sharp(Buffer.from(svg)).resize(400, 400).png().toFile(path.join(OUT, `crickets/cricket-00${i+1}.png`));
    await sharp(Buffer.from(svg)).resize(200, 200).png().toFile(path.join(OUT, `crickets/cricket-00${i+1}-thumb.png`));
  }

  // ====== 头像 SVG ======
  svgFile("avatars/avatar-default.png", `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="23" fill="none" stroke="${G}" stroke-width="1.5" opacity="0.4"/><text x="24" y="31" text-anchor="middle" font-family="sans-serif" font-size="18" fill="${G}" opacity="0.6">?</text></svg>`);
  svgFile("avatars/avatar-ai.png", `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="23" fill="none" stroke="${G}" stroke-width="1.5" opacity="0.4"/><text x="24" y="31" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${G}" opacity="0.6">AI</text></svg>`);

  // ====== Lottie ======
  for (const [f, w, h, frames, nm] of [["logo-breathing.json",260,80,84,"Logo"],["cricket-chirp.json",200,200,48,"鸣叫"],["spirit-wave.json",200,200,48,"声波"],["battle-intro.json",390,500,48,"开战"],["damage-float.json",100,50,20,"伤害"],["cricket-defeated.json",90,90,22,"败阵"],["gacha-open.json",320,320,36,"开笼"],["gacha-reveal-common.json",180,240,24,"普通"],["gacha-reveal-rare.json",180,240,29,"稀有"],["gacha-reveal-epic.json",180,240,34,"史诗"],["gacha-reveal-legendary.json",220,280,43,"传说"],["round-win.json",390,280,48,"局胜"],["game-over.json",390,360,60,"终局"],["hp-low-pulse.json",280,12,36,"低血"],["golden-pulse.json",296,296,48,"金环"],["loading-spinner.json",60,60,36,"加载"],["transition-page.json",390,844,20,"转场"]]) {
    fs.writeFileSync(path.join(OUT,"animations",f), JSON.stringify({v:"5.9.0",fr:24,ip:0,op:frames,w,h,nm,ddd:0,assets:[],layers:[{ddd:0,ind:1,ty:4,nm,sr:1,ip:0,op:frames,st:0,ks:{o:{a:1,k:[{t:0,s:[60]},{t:Math.floor(frames/2),s:[100]},{t:frames,s:[60]}]},r:{a:0,k:0},p:{a:0,k:[w/2,h/2,0]},a:{a:0,k:[0,0,0]},s:{a:1,k:[{t:0,s:[100,100,100]},{t:Math.floor(frames/2),s:[102,102,100]},{t:frames,s:[100,100,100]}]}},shapes:[{ty:"rc",d:1,s:{a:0,k:[w*0.5,h*0.5]},p:{a:0,k:[0,0]},r:{a:0,k:8}},{ty:"fl",c:{a:0,k:[0.773,0.627,0.349,0.15]},o:{a:0,k:100}},{ty:"st",c:{a:0,k:[0.773,0.627,0.349,0.4]},o:{a:0,k:100},w:{a:0,k:1}}]}]}));
  }

  // ====== 音频 ======
  const mp3 = (d: number) => { const n = Math.max(1, Math.ceil(d/26.12)); return Buffer.concat(Array.from({length:n},()=>Buffer.concat([Buffer.from([0xFF,0xFB,0x90,0x00]),Buffer.alloc(32,0),Buffer.alloc(381,0)]))); };
  for (const [f,d] of [["bgm-home.mp3",60000],["bgm-market.mp3",60000],["bgm-battle.mp3",90000],["bgm-victory.mp3",15000],["bgm-room.mp3",60000]]) fs.writeFileSync(path.join(OUT,"audio/bgm",f), mp3(d));
  for (const [f,d] of [["sfx-heavy-hit.mp3",400],["sfx-feint.mp3",300],["sfx-block.mp3",400],["sfx-chirp.mp3",650],["sfx-damage-taken.mp3",250],["sfx-cricket-defeat.mp3",650],["sfx-round-win.mp3",1200],["sfx-round-lose.mp3",1200],["sfx-game-win.mp3",2500],["sfx-game-lose.mp3",2500],["sfx-button-click.mp3",150],["sfx-gacha-open.mp3",650],["sfx-gacha-reveal.mp3",400],["sfx-gacha-legendary.mp3",1200],["sfx-room-join.mp3",400],["sfx-ready.mp3",250],["sfx-countdown.mp3",150],["sfx-ui-panel.mp3",250],["sfx-cricket-chirp.mp3",800]]) fs.writeFileSync(path.join(OUT,"audio/sfx",f), mp3(d));

  console.log("全部素材生成完毕 (SVG 透明底 + PNG 占位)");
}

main().catch(console.error);
