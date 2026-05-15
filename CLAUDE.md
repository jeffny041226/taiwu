# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目状态

古风蛐蛐实时对战游戏，Next.js 16 + WebSocket 独立服务 + Supabase。代码已实现，素材通过脚本自动生成占位图。

## 命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动 Next.js 开发服务器 (port 3000)
pnpm dev:ws           # 启动 WebSocket 服务器 (port 3001)
pnpm build            # 生产构建
pnpm lint             # ESLint 检查
pnpm test             # Vitest 单元测试
pnpm test -- --run    # 单次运行测试 (非 watch)
```

## 架构要点

- **Next.js 16 App Router** — 5 个页面路由: `/`(大厅) `/market`(虫市) `/backpack`(背包) `/room/[roomId]`(房间) `/battle/[roomId]`(战斗)。当前所有页面均为 `use client`
- **WebSocket 独立进程** — `server/` 目录 6 个文件，监听 3001 端口，与 Next.js 分离部署。不含第三方框架，原生 `ws` 库
- **战斗引擎共享** — `src/lib/battle-calc.ts` 纯函数模块，`server/battle-resolver.ts` 调用它完成前后端统一的伤害计算
- **素材体系** — `public/assets/` 目录约定 + `src/config/assets.ts` 映射管理。素材占位图通过 `scripts/gen-all.ts` 用 sharp 自动生成（SVG → PNG）
- **游戏配置集中化** — 所有魔法数字在 `src/config/game.ts`，包括伤害参数、克制倍率、耐力消耗、斗性/品质/特性常量
- **数据库** — Supabase PostgreSQL，3 张表 (`db/schema.sql`): `users`, `cricket_templates`(20条种子的模板, `db/seed.sql`), `user_crickets`
- **品质分级** — 4 级: common(权重100) → rare(65) → epic(30) → legendary(15)，通过 `src/lib/gacha-engine.ts` 加权随机抽笼
- **竖屏画布** — 390×844 (iPhone 14/15)，Tailwind CSS v4 自定义主题色通过 `@theme` 指令定义在 `globals.css`

### 项目结构

```
src/
  app/                         # Next.js 页面 & API routes
    page.tsx                   # 大厅: 创建/加入房间、训练入口
    market/page.tsx            # 虫市: 抽笼(1/5/10连)
    backpack/page.tsx          # 背包: 蛐蛐列表(现为mock数据)
    room/[roomId]/page.tsx     # 房间: 等待对手加入
    battle/[roomId]/page.tsx   # 战斗: 含本地训练模式自动战斗
    api/                       # API routes (部分为 TODO stub)
  config/
    assets.ts                  # 素材路径集中管理 (禁止硬编码)
    game.ts                    # 游戏数值常量 (禁止魔法数字)
  lib/
    battle-calc.ts             # 战斗计算纯函数 (前后端共享)
    gacha-engine.ts            # 加权随机抽笼引擎
    ws-client.ts               # WebSocket 客户端 (心跳+重连)
    audio-manager.ts           # Howler.js 音频封装
    cricket-utils.ts           # 品质/特性显示工具
    room-code.ts               # 房间号生成/校验
    image-loader.ts            # S3 图片 URL 生成
    api.ts                     # HTTP API 客户端
    supabase.ts                # Supabase 客户端
  components/
    ui/TierBadge.tsx            # 品质标签
    ui/TraitTag.tsx             # 特性标签
    layout/TopBar.tsx           # 顶部导航栏
    layout/PageContainer.tsx    # 竖屏容器
    game/LoadingOverlay.tsx     # 加载遮罩
    game/TransitionOverlay.tsx  # 转场动画
    game/MapleLeaves.tsx        # Canvas 枫叶粒子
    game/LottiePlayer.tsx       # Lottie 动画播放器
    game/ErrorPage.tsx          # 错误页
  hooks/
    useWebSocket.ts             # WS 连接管理
    useAudio.ts                 # 音频控制
    useCountdown.ts             # 倒计时
    useMapleLeaves.ts           # Canvas 粒子动画
  types/
    cricket.ts                  # CricketTemplate / UserCricket
    battle.ts                   # Player / RoomState / RoundResult
    ws-message.ts               # 全部 C→S / S→C 消息类型
server/                         # WebSocket 独立服务
  index.ts                      # 入口 (wss 监听 3001)
  types.ts                      # Player / BattleCricket / Room
  room-manager.ts               # 房间 CRUD + 状态机 (waiting→ready→battling→roundEnd→finished)
  ws-handler.ts                 # 消息路由 (14 种消息类型)
  battle-resolver.ts            # 回合结算调度 (调用 battle-calc.ts)
  ai-opponent.ts                # AI 加权随机出招策略
db/
  schema.sql                    # 3 表 DDL
  seed.sql                      # 20 只蛐蛐模板种子数据
scripts/
  gen-all.ts                    # 一键生成所有素材占位图 (npx tsx scripts/gen-all.ts)
  gen-crickets.ts               # 仅生成蛐蛐 SVG 占位图
  generate-assets.ts            # 旧版素材生成 (功能重叠)
  generate-audio.ts             # 音频占位生成 (已并入 gen-all.ts)
  generate-lottie.ts            # Lottie 占位生成 (已并入 gen-all.ts)
```

### 战斗系统

动作体系: heavy_strike / feint / block / chirp 四种动作，克制关系：
- heavy_strike 克 chirp (1.2x)、克 feint (1.1x)
- feint 克 block (1.5x)、克 chirp (1.15x)
- block 减伤 heavy_strike 60%、feint 40%
- chirp 恢复斗性 (+10)，不影响伤害

特性系统: 6 种特性 (fierce/swift/cunning/steadfast/tenacious/resonant)，每种有独立加成逻辑。全部在 `TRAIT_EFFECTS` 中声明，`calcRoundResult` 中应用。

战斗流程: 双方同时出招 → 斗性差 → 怯场判定 → 克制倍率 → 格挡减伤 → 特性加成 → 伤害上限裁剪 → 应用 HP/耐力/斗性变化 → 判局胜 (先赢2局者胜)

AI 对手: 基于玩家上回合动作做加权反制选择 (低耐力倾向防御、低血量保守)，定义在 `server/ai-opponent.ts`。训练模式在 `battle/page.tsx` 有客户端简化版 AI (纯随机)。

### 数据流

伪代码示意:
```
[抽笼] gacha-engine.pullOne(cricket_templates) → user_crickets
[组队] user → 选3只出战 → 生成为 BattleCricket[]
[对战] 玩家选动作 → WS → server 收到 action → bothActionsReady
     → resolveRound (调用 calcRoundResult) → 应用伤害/状态
     → broadcast(roundResult) → 广播 roundWin/gameOver
[分步] battle:action(双方出招) → battle:roundResult(回合详情)
     → battle:roundWin(局胜) → battle:gameOver(终局结算)
```

### WebSocket 消息协议

| 方向 | 类型 | 说明 |
|------|------|------|
| C→S | room:create | 创建房间 |
| C→S | room:join | 加入房间 |
| C→S | room:practice | 创建训练对局 |
| C→S | battle:ready | 出战准备 (传 cricketIds) |
| C→S | battle:action | 出招 (传 action) |
| C→S | battle:nextRound | 下一局准备 |
| C→S | room:leave | 离开房间 |
| S→C | room:created / room:joined / room:state | 房间状态 |
| S→C | battle:roundResult / battle:roundWin / battle:gameOver | 战斗结算 |

WebSocket 客户端 (`WSClient` 类) 内置 30s 心跳 + 3 次自动重连。

### 素材生成

所有素材通过脚本自动生成占位图，无需手动准备图片文件:
```bash
npx tsx scripts/gen-all.ts   # 一键生成全部素材 (SVG + PNG + Lottie + 音频)
```
各脚本独立可运行:
- `scripts/gen-crickets.ts` — 6 只蛐蛐占位图 (400×400 + 200×200 thumb)
- `scripts/generate-lottie.ts` — 17 个 Lottie JSON 占位
- `scripts/generate-audio.ts` — 23 个 MP3 占位

API routes 中部分为 TODO stub (`/api/gacha/pull` `/api/crickets` `/api/user/profile`)，需要对接 Supabase 时补全。

### CSS 与颜色体系

Tailwind CSS v4，所有自定义颜色通过 `@theme` 指令定义在 `src/app/globals.css`。关键动画 keyframes (战斗冲刺、待机浮动、摇晃、呼吸等) 也定义在 `globals.css`。

可用 CSS 变量: `--color-bg-base`, `--color-gold`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-hp-fill`, `--color-hp-bg`, `--color-hp-low`, `--color-stamina-fill`, `--color-stamina-bg`, `--color-tier-{common,rare,epic,legendary}`, `--color-stat-{atk,def,spd}`

安全区: `--safe-area-top: 47px`, `--safe-area-bottom: 34px`

## 设计基准

- 画布: **390 × 844** (iPhone 14/15 竖屏)，仅竖屏
- 顶部安全区: 47px，底部: 34px，侧边距: 16px，可用宽度: 358px
- 背景基色: `#0a0807`，强调金: `#c5a059`
- 字体: Noto Serif SC (400/700) + Ma Shan Zheng (400)，通过 `next/font/google` 加载

## 素材规格速查

所有素材存放于 `public/assets/`。替换时用**同名同尺寸同格式**文件覆盖即可，无需改代码。

### 视觉素材尺寸索引

| 类别 | 路径前缀 | 关键尺寸 |
|------|---------|---------|
| 背景图 | `backgrounds/` | 全部 **390×844** WebP |
| 主按钮 | `ui/buttons/btn-primary-bg.png` | **342×50** (9-slice) |
| 动作按钮 | `ui/buttons/btn-action-*.png` | **175×66** (9-slice)，按暗红/紫/蓝/绿区分动作 |
| 抽笼按钮 | `ui/buttons/btn-gacha-bg.png` | **175×42** (9-slice) |
| 背包卡片 | `ui/frames/card-bg-backpack.png` | **173×215** |
| 房间卡片 | `ui/frames/card-bg-room.png` | **173×190** |
| 选中金框 | `ui/frames/frame-golden.png` | **177×194** (9-slice) |
| 首页展示衬底 | `ui/frames/display-plate.png` | **300×220** |
| 品质徽章 | `ui/badges/badge-*.png` | **62×22** |
| 编号标记 | `ui/numbers/num-{1,2,3}.png` | **26×26** |
| 头像图标 | `ui/icons/icon-avatar-default.png` | **40×40** (圆形裁切) |
| 背包图标 | `ui/icons/icon-backpack.png` | **40×40** |
| 竞技场圆底 | `ui/arena/arena-circle.png` | **280×280** |
| 竞技场金环 | `ui/arena/arena-ring.png` | **296×296** |
| 竞技场"斗"字 | `ui/arena/arena-dou.png` | **60×60** |
| HP 条 | `ui/bars/hp-bar-*.png` | 底/填充 **280×12**，低血量填充 1×12 repeat-x |
| 耐力条 | `ui/bars/stamina-bar-*.png` | 底/填充 **280×8**，填充 1×8 repeat-x |
| Logo 静态图 | `ui/misc/logo-text.png` | **260×70** |
| 弹窗背景 | `ui/misc/modal-bg.png` | **342×320** (9-slice) |
| 蛐蛐笼(关闭) | `ui/misc/cage-closed.png` | **120×120** |
| 跑马灯底条 | `ui/misc/marquee-bg.png` | **390×36** |
| 枫叶粒子 | `ui/particles/particle-maple.png` | **40×40** PNG (带透明度) |

### 蛐蛐图片 (S3 + 本地占位)

| 展示场景 | 显示尺寸 | 源图尺寸 |
|---------|---------|---------|
| 首页展示 | 180×160 | 400×400 |
| 卡片内 | 120×80 | 200×200 |
| 战斗竞技场 | 85×75 | 200×200 |
| 头像裁剪 | 48×48 圆形 | 200×200 |

### Lottie 动画 (17 个)

| 文件 | 画布 | 时长 | 循环 | 用途 |
|------|------|------|------|------|
| `logo-breathing.json` | 260×80 | 3.5s | 是 | Logo 呼吸缩放 |
| `cricket-chirp.json` | 200×200 | 2.0s | 是 | 蛐蛐鸣叫+翅膀振 |
| `spirit-wave.json` | 200×200 | 2.0s | 是 | 声波扩散 |
| `battle-intro.json` | 390×500 | 2.0s | 否 | 开战: 金环+VS+开战文字 |
| `damage-float.json` | 100×50 | 0.8s | 否 | 浮动伤害数字 |
| `cricket-defeated.json` | 90×90 | 0.9s | 否 | 蛐蛐败阵旋转消失 |
| `gacha-open.json` | 320×320 | 1.5s | 否 | 开笼: 抖动→光芒→闪光 |
| `gacha-reveal-common.json` | 180×240 | 1.0s | 否 | 普通揭示 |
| `gacha-reveal-rare.json` | 180×240 | 1.2s | 否 | 稀有揭示(蓝粒子) |
| `gacha-reveal-epic.json` | 180×240 | 1.4s | 否 | 史诗揭示(紫螺旋) |
| `gacha-reveal-legendary.json` | 220×280 | 1.8s | 否 | 传说揭示(金光龙纹) |
| `round-win.json` | 390×280 | 2.0s | 否 | 局间比分+胜负 |
| `game-over.json` | 390×360 | 2.5s | 否 | 终局结算 |
| `hp-low-pulse.json` | 280×12 | 1.5s | 是 | 低血量呼吸闪烁 |
| `golden-pulse.json` | 296×296 | 2.0s | 是 | 金环脉动发光 |
| `loading-spinner.json` | 60×60 | 1.5s | 是 | 加载动画 |
| `transition-page.json` | 390×844 | 0.8s | 否 | 页面转场 |

### 音频 (23 个)

**BGM** (MP3 128kbps 立体声, `audio/bgm/`): `bgm-home.mp3`(60-120s 无缝), `bgm-market.mp3`(60-90s 无缝), `bgm-battle.mp3`(90-180s 无缝), `bgm-victory.mp3`(15-30s)

**战斗 SFX** (MP3 64kbps 单声道, `audio/sfx/`): `sfx-heavy-hit.mp3` `sfx-feint.mp3` `sfx-block.mp3` `sfx-chirp.mp3` `sfx-damage-taken.mp3` `sfx-cricket-defeat.mp3` `sfx-round-win.mp3` `sfx-round-lose.mp3` `sfx-game-win.mp3` `sfx-game-lose.mp3`

**UI SFX** (MP3 64kbps 单声道, `audio/sfx/`): `sfx-button-click.mp3` `sfx-gacha-open.mp3` `sfx-gacha-reveal.mp3` `sfx-gacha-legendary.mp3` `sfx-room-join.mp3` `sfx-ready.mp3` `sfx-countdown.mp3` `sfx-ui-panel.mp3` `sfx-cricket-chirp.mp3`

### 色彩体系

| 用途 | 色值 | 用途 | 色值 |
|------|------|------|------|
| 背景基色 | `#0a0807` | 金色强调 | `#c5a059` |
| 正文 | `#e0d8c8` | 辅助文字 | `#8a7040` |
| HP 填充/底 | `#a05040` / `#5a2218` | HP 低血量 | `#c57030` |
| 耐力填充/底 | `#5a7890` / `#3a5068` | 弱文字 | `#6a5840` |
| 品质-普通 | `#a0a0a0` | 品质-稀有 | `#4a90d9` |
| 品质-史诗 | `#8b5cf6` | 品质-传说 | `#c5a059` |

## 素材替换操作

1. 准备新素材，尺寸和格式与目标文件**完全一致**
2. 覆盖到 `public/assets/` 对应路径
3. 9-slice 标注的图需保持相同 border 区域比例
4. Lottie 替换后若画布尺寸变化，需同步更新代码中容器尺寸
5. BGM 替换时保持时长在标注范围内确保无缝循环
6. 蛐蛐图片生产环境通过 S3 `image_key` 管理，本地用 `public/assets/crickets/` 占位

## 关键约定

- 素材引用统一通过 `src/config/assets.ts` 的 `ASSETS` 对象，禁止在组件中硬编码素材路径
- 游戏平衡参数统一通过 `src/config/game.ts` 的导出常量（如 `COUNTER_MULTIPLIER`、`BLOCK_REDUCTION`），禁止魔法数字
- 战斗计算使用 `src/lib/battle-calc.ts` 纯函数，不依赖 React 状态
