# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目状态

古风蛐蛐实时对战游戏，pnpm workspace monorepo: Next.js 16 前端 + Express/WebSocket 合并后端(port 4000) + shared 共享包 + Supabase。素材通过脚本自动生成占位图，蛐蛐图片已上传 Supabase Storage 由 API 下发。

## 命令

```bash
pnpm install                              # 安装全部依赖 (workspace)
pnpm dev                                  # 同时启动前端+后端 (前端 port 3000, 后端 port 4000)
cd packages/backend && pnpm dev            # 仅启动后端
pnpm build                                # 生产构建 (前端)
pnpm lint                                 # ESLint 检查
pnpm test                                 # Vitest 单元测试
pnpm test -- --run                        # 单次运行测试 (非 watch)
npx tsx scripts/upload-cricket-images.ts  # 上传蛐蛐图片到 Supabase Storage + 更新 DB image_key
npx tsx scripts/gen-all.ts                # 重新生成本地素材占位图
```

后端单独启动注意：必须从 **项目根目录** 运行 `npx tsx packages/backend/src/index.ts`，因为 dotenv 路径相对于 cwd 解析。

## 架构要点

- **pnpm workspace monorepo** — 3 个包: 根(Next.js 前端)、`packages/backend`(Express+WS)、`packages/shared`(类型+逻辑)
- **合并 HTTP+WS 后端** — 单进程 port 4000，Express 处理 REST `/api/*`，原生 `ws` 库 `noServer` 模式处理 `/ws/battle` 升级。JWT 验证在 WS 升级时通过 query param `token` 完成
- **鉴权系统** — 4 个端点: `POST /api/auth/register`(用户名+密码)、`POST /api/auth/guest`(游客)、`POST /api/auth/login`(用户名+密码)、`POST /api/auth/login-token`(JWT验证)。密码用 bcryptjs hash，JWT 7天有效。前端 `ensureAuth()` 不再自动注册——无 JWT 时返回 null，受保护页面跳 `/auth`
- **Supabase 懒加载** — `getSupabase()` 返回 `SupabaseClient | null`；无 DB 时各路由走内存 fallback (`memory-store.ts`)。`requireSupabase()` 抛异常，仅 login 端点用（用户名登录需要 DB）
- **蛐蛐图片云端下发** — 图片上传到 Supabase Storage 公开 bucket `cricket-images`，`image_key` 列存公开 URL，通过 `/api/crickets/templates` 接口下发。前端不再依赖 `getCricketThumb()` 硬编码本地路径
- **前端 7 个页面路由** — `/`(大厅) `/auth`(登录注册) `/market`(虫市) `/backpack`(背包) `/room/[roomId]`(房间) `/battle/[roomId]`(战斗) `/matchmake`(匹配对战)。全部 `use client`
- **战斗引擎共享** — 纯函数在 `packages/shared/src/lib/battle-calc.ts`，前后端统一调用
- **游戏配置集中化** — 所有魔法数字在 `packages/shared/src/config/game.ts`，含 BATTLE_MODE(env 可覆盖: tag_team/best_of_3)
- **dotenv** — 后端通过 `packages/backend/src/config/env.ts` 加载 `.env`，不在 index.ts 入口处调用

### 项目结构

```
packages/backend/src/
  index.ts              # 合并 HTTP+WS 入口 (port 4000)
  config/env.ts         # dotenv 加载 + 环境变量导出
  db/supabase.ts        # 懒加载 Supabase 客户端 (getSupabase/requireSupabase)
  lib/memory-store.ts   # 无 DB 时的内存蛐蛐存储 (重启丢失)
  middleware/auth.ts    # JWT Bearer 验证 → req.user
  middleware/cors.ts    # CORS 中间件
  middleware/error-handler.ts  # 统一错误处理
  routes/auth.ts        # 4 个鉴权端点 (register/guest/login/login-token)
  routes/crickets.ts    # GET /, GET /templates, POST /release
  routes/gacha.ts       # POST /pull (1/5/10连)
  routes/user.ts        # GET /profile, GET /stats
  routes/room.ts        # GET /:roomId
  ws/handler.ts         # 12 种 WS 消息路由 (含心跳、匹配、超时)
  ws/room-manager.ts    # 房间 CRUD + 状态机
  ws/battle-resolver.ts # 回合结算 (调用 shared battle-calc)
  ws/ai-opponent.ts     # AI 加权反制出招

packages/shared/src/
  types/                # CricketTemplate, Tier, Trait, battle, ws-message
  config/game.ts        # 全部游戏常量 + BATTLE_MODE(env)
  lib/battle-calc.ts    # calcRoundResult 纯函数 (前后端共享)
  lib/gacha-engine.ts   # pullOne/pullMultiple/simulateDistribution
  lib/room-code.ts      # generateRoomCode/validateRoomCode
  lib/cricket-utils.ts  # 品质/特性/属性显示工具
  data/cricket-templates.ts  # 20只蛐蛐硬编码数据 + getCricketThumb(仅无DB时用)

src/app/                # Next.js 前端页面 (7个路由)
src/lib/
  auth.ts               # ensureAuth(返回null若无JWT)/register/login/guestRegister/logout/clearAuth
  api.ts                # HTTP API 客户端 (4 auth + gacha/crickets/user/room)
  ws-client.ts          # WSClient 类 (心跳+重连+事件派发)
src/hooks/
  useWebSocket.ts       # React hook: send/on/off 事件模式
  useCountdown.ts       # 倒计时 hook
src/components/         # UI + layout + game 组件

db/
  schema.sql            # 3表DDL (users 含 username/password_hash, cricket_templates, user_crickets)
  seed.sql              # 20只蛐蛐种子数据
scripts/
  upload-cricket-images.ts  # 上传图片到 Supabase Storage + 更新DB
  gen-all.ts            # 一键生成全部本地占位素材
```

### 鉴权流程

```
注册: POST /api/auth/register {username,password,nickName?} → bcrypt.hash → INSERT users → sign JWT → {token,uid,nickName}
游客: POST /api/auth/guest {nickName?} → gen uid → INSERT users(username=null) → sign JWT → {token,uid,nickName}
登录: POST /api/auth/login {username,password} → SELECT users → bcrypt.compare → sign JWT → {token,uid,nickName}
验证: POST /api/auth/login-token {token} → jwt.verify → SELECT users → {uid,nickName}

前端: ensureAuth() → check localStorage JWT → api.authLoginToken验证 → 无效则返回null(跳/auth)
WS:   升级时 ?token=xxx → jwt.verify → ws.uid/ws.nickName
```

### WebSocket 消息协议

| 方向 | 类型 | 说明 |
|------|------|------|
| C→S | room:create / room:join / room:practice | 创建/加入/训练房间 |
| C→S | room:matchmake / room:matchmake.cancel | 匹配/取消匹配 |
| C→S | battle:ready / battle:action / battle:nextRound | 选蛐蛐/出招/下一局 |
| C→S | room:leave | 离开房间 |
| S→C | room:created / room:joined / room:state | 房间状态 |
| S→C | room:matched / room:matchmake.waiting / room:matchmake.timeout | 匹配结果 |
| S→C | battle:roundResult / battle:roundWin / battle:gameOver | 战斗结算 |

### 战斗系统

动作: heavy_strike / feint / block / chirp，克制关系：
- heavy_strike 克 chirp (1.2x)、克 feint (1.1x)
- feint 克 block (1.5x)、克 chirp (1.15x)
- block 减伤 heavy_strike 60%、feint 40%
- chirp 恢复斗性 (+10)

特性: 6种 (fierce/swift/cunning/steadfast/tenacious/resonant)，在 `TRAIT_EFFECTS` 声明，`calcRoundResult` 应用。
对战模式: BATTLE_MODE 环境变量控制 — `tag_team`(车轮战,默认) / `best_of_3`(三局两胜)

### 数据流

```
[抽笼] api.pullGacha → POST /api/gacha/pull → pullMultiple → INSERT user_crickets → 返回带 imageKey 的 template
[背包] api.getCrickets → GET /api/crickets → SELECT user_crickets JOIN cricket_templates → 返回带 imageKey
[模板] api.getTemplates → GET /api/crickets/templates → SELECT cricket_templates → 返回带 imageKey (云端URL)
[组队] 选3只 → battle:ready(cricketIds) → WS → 双方ready → battle:selectionStart → 倒计时
[对战] battle:action → WS → bothActionsReady → resolveRound → broadcast(roundResult/roundWin/gameOver)
```

## 设计基准

- 画布: **390 × 844** (iPhone 14/15 竖屏)，仅竖屏
- 顶部安全区: 47px，底部: 34px，侧边距: 16px，可用宽度: 358px
- 背景基色: `#0a0807`，强调金: `#c5a059`
- 字体: Noto Serif SC (400/700) + Ma Shan Zheng (400)

## 色彩体系

| 用途 | 色值 | 用途 | 色值 |
|------|------|------|------|
| 背景基色 | `#0a0807` | 金色强调 | `#c5a059` |
| 正文 | `#e0d8c8` | 辅助文字 | `#8a7040` |
| HP 填充/底 | `#a05040` / `#5a2218` | HP 低血量 | `#c57030` |
| 耐力填充/底 | `#5a7890` / `#3a5068` | 弱文字 | `#6a5840` |
| 品质-普通/稀有/史诗/传说 | `#a0a0a0` / `#4a90d9` / `#8b5cf6` / `#c5a059` |

CSS 变量: `--color-bg-base`, `--color-gold`, `--color-text-primary/secondary/muted`, `--color-hp-*`, `--color-stamina-*`, `--color-tier-*`, `--color-stat-*`
安全区: `--safe-area-top: 47px`, `--safe-area-bottom: 34px`

## 关键约定

- 蛐蛐图片由 API 下发 `imageKey`(云端URL)，前端不用 `getCricketThumb()` 硬编码本地路径（仅作无DB时fallback）
- 游戏平衡参数通过 `@taiwu/shared/config/game` 导出常量，禁止魔法数字
- 战斗计算用 `@taiwu/shared/lib/battle-calc` 纯函数，不依赖 React 状态
- 后端所有路由检查 `getSupabase()` — null 时走内存 fallback; login 端点用 `requireSupabase()` 需要 DB
- 前端 `ensureAuth()` 返回 null 时受保护页面跳 `/auth`; 游客模式通过 `/auth` 页面的"游客体验"入口