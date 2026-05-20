# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目状态

古风蛐蛐实时对战游戏，pnpm workspace monorepo: Next.js 16 前端 + Express/WebSocket 合并后端(port 4000) + shared 共享包 + Supabase。素材通过脚本自动生成占位图，蛐蛐图片已上传 Supabase Storage 由 API 下发。鉴权使用山海 Passport（手机号+短信验证码），支付接入微信支付 H5 服务商模式。

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
- **合并 HTTP+WS 后端** — 单进程 port 4000，Express 处理 REST `/api/*`，原生 `ws` 库 `noServer` 模式处理 `/ws/battle` 升级。Passport Token 验证在 WS 升级时通过 query param `token` 完成
- **鉴权系统 — 山海 Passport** — 4 个端点: `POST /api/auth/send-code`(发短信)、`POST /api/auth/login`(验证码登录)、`POST /api/auth/verify`(Token验证)。万能验证码 `666666` 测试环境跳过 Passport。Token 有 5 分钟内存缓存。前端 `ensureAuth()` 返回 null 时受保护页面跳 `/auth`。localStorage 存 `passport_token` / `uid` / `nickName`
- **微信支付（服务商模式 H5）** — Mock/Real 双模式：配置占位符时自动走 mock（`confirmPay` 直接加次数），填入真实证书后走微信 V3 API（下单/回调/查单）。Mock 模式前端有支付确认弹窗
- **Supabase 懒加载** — `getSupabase()` 返回 `SupabaseClient | null`；无 DB 时各路由走内存 fallback (`memory-store.ts`)。`requireSupabase()` 抛异常，仅需 DB 的端点用
- **蛐蛐图片云端下发** — 图片上传到 Supabase Storage 公开 bucket `cricket-images`，`image_key` 列存公开 URL，通过 `/api/crickets/templates` 接口下发。前端用 API 返回的 `imageKey`，不再依赖硬编码本地路径
- **前端页面路由** — `/`(大厅) `/auth`(登录) `/market`(虫市) `/backpack`(背包) `/room/[roomId]`(房间) `/battle/[roomId]`(战斗) `/matchmake`(匹配对战)。全部 `use client`
- **战斗引擎共享** — 纯函数在 `packages/shared/src/lib/battle-calc.ts`，前后端统一调用
- **游戏配置集中化** — 所有魔法数字在 `packages/shared/src/config/game.ts`，含 BATTLE_MODE(env 可覆盖: tag_team/best_of_3)

### 项目结构

```
packages/backend/src/
  index.ts              # 合并 HTTP+WS 入口 (port 4000)
  config/env.ts         # dotenv 加载 + 环境变量导出
  db/supabase.ts        # 懒加载 Supabase 客户端 (getSupabase/requireSupabase)
  lib/memory-store.ts   # 无 DB 时的内存蛐蛐/次数存储 (重启丢失)
  middleware/auth.ts    # Passport Token Bearer 验证 → req.user (5min内存缓存)
  middleware/cors.ts    # CORS 中间件
  middleware/error-handler.ts  # 统一错误处理
  services/passport.ts  # 山海 Passport API 客户端 (验证码/登录/校验)
  services/wechat-pay.ts  # 微信支付 V3 API 客户端 (签名/下单/回调解密/查单)
  routes/auth.ts        # POST send-code / login / verify
  routes/crickets.ts    # GET /, GET /templates, POST /release
  routes/gacha.ts       # POST /pull (1/5/10连), GET /chances
  routes/pay.ts         # POST create/confirm/notify, GET status/chances
  routes/user.ts        # GET /profile, GET /stats
  routes/room.ts        # GET /:roomId
  ws/handler.ts         # 12 种 WS 消息路由 (含心跳、匹配、超时)
  ws/room-manager.ts    # 房间 CRUD + 状态机 + 匹配队列
  ws/battle-resolver.ts # 回合结算 (调用 shared battle-calc)
  ws/cricket-resolver.ts # 蛐蛐数据解析 (DB → BattleCricket)
  ws/ai-opponent.ts     # AI 加权反制出招

packages/shared/src/
  types/                # CricketTemplate, Tier, Trait, battle, ws-message
  config/game.ts        # 全部游戏常量 + BATTLE_MODE(env)
  lib/battle-calc.ts    # calcRoundResult 纯函数 (前后端共享)
  lib/gacha-engine.ts   # pullOne/pullMultiple/simulateDistribution
  lib/room-code.ts      # generateRoomCode/validateRoomCode
  lib/cricket-utils.ts  # 品质/特性/属性显示工具
  data/cricket-templates.ts  # 20只蛐蛐硬编码数据 (无DB时fallback)

src/app/                # Next.js 前端页面 (7个路由)
src/lib/
  auth.ts               # ensureAuth/sendCode/loginWithCode/logout (passport_token)
  api.ts                # HTTP API 客户端 (auth/gacha/pay/crickets/user/room)
  ws-client.ts          # WSClient 类 (心跳+重连+事件派发)
src/hooks/
  useWebSocket.ts       # React hook: send/on/off 事件模式
  useCountdown.ts       # 倒计时 hook
src/components/         # UI + layout + game 组件

db/
  schema.sql            # 3表DDL (users, cricket_templates, user_crickets)
  seed.sql              # 20只蛐蛐种子数据
scripts/
  upload-cricket-images.ts  # 上传图片到 Supabase Storage + 更新DB
  gen-all.ts            # 一键生成全部本地占位素材
```

### 鉴权流程

```
发验证码: POST /api/auth/send-code {mobile} → Passport getMobileCode (GET) → {success}
登录:     POST /api/auth/login {mobile,code} → code=666666 生成本地身份 shanhai-{mobile}
           或 Passport mobileCodeLogin (POST) → 查找/创建本地用户 → 缓存 token → {token,uid,nickName}
验证:     POST /api/auth/verify {token} → 内存缓存 → Passport verifyToken (GET) → {uid,nickName}

前端:     ensureAuth() → check localStorage passport_token → api.authVerifyToken → 无效则返回null(跳/auth)
WS:       升级时 ?token=xxx → 本地token? → 内存缓存? → passportService.verifyToken → ws.uid/ws.nickName
```

### WebSocket 消息协议

| 方向 | 类型 | 说明 |
|------|------|------|
| C→S | room:create / room:join / room:practice | 创建/加入/训练房间 |
| C→S | room:matchmake / room:matchmake.cancel | 匹配/取消匹配 |
| C→S | battle:ready / battle:action / battle:nextRound | 选蛐蛐/出招/下一局 |
| C→S | battle:rematch | 训练模式再来一局 |
| C→S | room:leave | 离开房间 |
| S→C | room:created / room:joined / room:state | 房间状态 |
| S→C | room:matched / room:matchmake.waiting / room:matchmake.timeout | 匹配结果 |
| S→C | battle:data / battle:roundResult / battle:roundWin / battle:gameOver | 战斗结算 |
| S→C | battle:cricketChange | 换蛐蛐通知 |

### 战斗系统

动作: heavy_strike / feint / block / chirp，克制关系见 `COUNTER_MULTIPLIER`。
特性: 6种 (fierce/swift/cunning/steadfast/tenacious/resonant)，在 `TRAIT_EFFECTS` 声明。
对战模式: BATTLE_MODE — tag_team(车轮战,默认) / best_of_3(三局两胜)

### 数据流

```
[登录]  sendCode → POST /auth/send-code → loginWithCode → POST /auth/login → 存 passport_token
[抽笼]  api.pullGacha → POST /gacha/pull → pullMultiple → INSERT user_crickets → 返回带 imageKey
[支付]  createPayOrder → POST /pay/create → mock:弹确认窗/real:跳h5_url → confirmPay/轮询payStatus → pullGacha
[背包]  api.getCrickets → GET /crickets → SELECT user_crickets JOIN cricket_templates
[组队]  选3只 → battle:ready(cricketIds) → WS → 双方ready → battle:selectionStart → 倒计时
[对战]  battle:action → WS → bothActionsReady → resolveRound → broadcast(roundResult/roundWin/gameOver)
```

### 支付流程（Mock/Real 双模式）

```
Mock (WX_PAY_MOCK=true — 配置为占位符时自动启用):
  购买 → createPayOrder → 弹出确认窗 → 点击确认 → confirmPay → 加次数 → 自动抽笼

Real (WX_PAY_MOCK=false — 填入真实证书后):
  购买 → createPayOrder → 后端调微信统一下单 → 返回h5_url
  → 前端跳转h5_url → 微信拉起支付 → 支付完成微信回调notify_url
  → 微信跳回/market?pay_order=xxx → 前端轮询payStatus → 成功则自动抽笼
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

- 所有 Passport 接口由后端代理调用，前端不直接调 Passport
- Passport API 不可用时（如外网环境），send-code 返回 `{success:true, mock:true}`，万能验证码 `666666` 可登录
- 后端所有路由检查 `getSupabase()` — null 时走内存 fallback; `requireSupabase()` 抛异常
- 前端 `ensureAuth()` 返回 null 时受保护页面跳 `/auth`
- 蛐蛐图片由 API 下发 `imageKey`(云端URL)，前端不用硬编码本地路径
- 游戏平衡参数通过 `@taiwu/shared/config/game` 导出常量，禁止魔法数字
- 战斗计算用 `@taiwu/shared/lib/battle-calc` 纯函数，不依赖 React 状态
- 新建用户默认赠送 3 只起始蛐蛐（template_id 1/2/3），不赠送抽奖次数