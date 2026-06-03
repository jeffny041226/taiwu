# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目状态

古风蛐蛐实时对战游戏，pnpm workspace monorepo: Next.js 16 前端 + Express/WebSocket 合并后端(port 4000) + shared 共享包 + MySQL 8 + Drizzle ORM + MinIO S3 存储。素材通过脚本自动生成占位图，蛐蛐图片已上传 MinIO (S3 兼容) 由 API 下发。鉴权使用山海 Passport（手机号+短信验证码），支付接入微信支付 H5 服务商模式。

## 命令

```bash
pnpm install                              # 安装全部依赖 (workspace)
pnpm dev                                  # 同时启动前端+后端 (前端 port 3000, 后端 port 4000)
pnpm dev:frontend                         # 仅启动前端 (port 3000)
pnpm dev:backend                          # 仅启动后端 (port 4000, 等同于 cd packages/backend && pnpm dev)
pnpm build                                # 生产构建 (前端)
pnpm lint                                 # ESLint 检查
pnpm test                                 # Vitest 单元测试 (watch 模式, 暂无测试用例)
pnpm test:run                             # 单次运行测试
npx tsx scripts/gen-all.ts                # 重新生成本地素材占位图

# 素材生成脚本 (scripts/)
npx tsx scripts/generate-assets.ts        # 生成背景/UI 占位图
npx tsx scripts/generate-lottie.ts        # 生成 Lottie 动画
npx tsx scripts/generate-audio.ts         # 生成音频文件
npx tsx scripts/gen-crickets.ts           # 生成蛐蛐图片
npx tsx scripts/gen-avatar.ts             # 生成头像
```

## 架构要点

- **pnpm workspace monorepo** — 3 个包: 根(Next.js 前端)、`packages/backend`(Express+WS)、`packages/shared`(类型+逻辑)
- **合并 HTTP+WS 后端** — 单进程 port 4000，Express 处理 REST `/api/*`，原生 `ws` 库 `noServer` 模式处理 `/ws/battle` 升级。Passport Token 验证在 WS 升级时通过 query param `token` 完成
- **鉴权系统 — 山海 Passport** — 4 个端点: `POST /api/auth/send-code`(发短信)、`POST /api/auth/login`(验证码登录)、`POST /api/auth/verify`(Token验证)。万能验证码 `666666` 测试环境跳过 Passport。Token 有 15 分钟内存缓存。前端 `ensureAuth()` 返回 null 时受保护页面跳 `/auth`。localStorage 存 `passport_token` / `uid` / `nickName`
- **微信支付（服务商模式 H5）** — Mock/Real 双模式：配置占位符时自动走 mock（`confirmPay` 直接加次数），填入真实证书后走微信 V3 API（下单/回调/查单）。Mock 模式前端有支付确认弹窗
- **MySQL + Drizzle ORM** — 后端直连 MySQL 8，Drizzle ORM 编译时类型安全，客户端在启动时创建连接池 (`packages/backend/src/db/client.ts`)。`packages/backend/src/db/schema.ts` 是数据库唯一权威定义（不再有 `db/*.sql`）
- **MinIO S3 图片存储** — 图片上传到 MinIO (S3 兼容)，`image_key` 列存公开 URL，通过 `/api/crickets/templates` 接口下发。前端用 API 返回的 `imageKey`，不再依赖硬编码本地路径
- **前端页面路由** — `/`(大厅) `/auth`(登录) `/market`(虫市) `/backpack`(背包) `/room/[roomId]`(房间) `/battle/[roomId]`(战斗) `/matchmake`(匹配对战)。全部 `use client`
- **战斗引擎共享** — 纯函数在 `packages/shared/src/lib/battle-calc.ts`，前后端统一调用
- **游戏配置集中化** — 所有魔法数字在 `packages/shared/src/config/game.ts`，含 BATTLE_MODE(env 可覆盖: tag_team/best_of_3)
- **CORS** — 开发环境允许所有 origin，支持 DELETE 方法和 Authorization 头
- **素材路径集中管理** — `src/config/assets.ts` 是所有背景/UI/动画/音频/字体路径的唯一来源

### 项目结构

```
packages/backend/src/
  index.ts              # 合并 HTTP+WS 入口 (port 4000)
  config/env.ts         # dotenv 加载 + 环境变量导出 (MySQL/S3/Passport/微信支付)
  db/client.ts          # Drizzle ORM 客户端 (mysql2 连接池)
  db/schema.ts          # Drizzle schema — MySQL 表定义唯一权威 (users/cricket_templates/user_crickets/等)
  lib/proxy-agent.ts    # HTTP 代理支持 (Passport API 调用用 PASSPORT_PROXY/HTTP_PROXY)
  lib/tier-ranges.ts    # 级别区间缓存 (cricket_tier_ranges 表 → 内存,启动时加载)
  middleware/auth.ts    # Passport Token Bearer 验证 → req.user (15min内存缓存)
  middleware/cors.ts    # CORS 中间件
  middleware/error-handler.ts  # 统一错误处理
  services/passport.ts  # 山海 Passport API 客户端 (验证码/登录/校验)
  services/wechat-pay.ts  # 微信支付 V3 API 客户端 (签名/下单/回调解密/查单)
  routes/auth.ts        # POST send-code / login / verify
  routes/crickets.ts    # GET /, GET /templates, POST /release
  routes/gacha.ts       # POST /pull (1/5/10连), GET /chances
  routes/ladder.ts      # GET /top100, GET /position (天梯排行榜)
  routes/pay.ts         # POST create/confirm/notify, GET status/chances
  routes/redeem.ts      # POST /generate, POST /redeem (兑换码)
  routes/room.ts        # GET /:roomId
  routes/user.ts        # GET /profile, GET /stats
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

src/app/                # Next.js 前端页面 (9个路由): hall(/) auth market backpack room/[roomId] battle/[roomId] matchmake handbook ladder
src/app/ladder/defense/ # 天梯防守阵容配置
src/lib/
  auth.ts               # ensureAuth/sendCode/loginWithCode/logout (passport_token)
  api.ts                # HTTP API 客户端 (auth/gacha/pay/crickets/user/room/ladder/redeem)
  ws-client.ts          # WSClient 类 (心跳+重连+事件派发)
  audio-manager.ts      # Howler.js 封装 (BGM/SFX 管理, 缓存+淡入淡出+静音切换)
  image-loader.ts       # MinIO S3 图片 URL 解析 + 本地 fallback (依赖 NEXT_PUBLIC_S3_BASE_URL)
src/config/
  assets.ts             # 素材路径集中配置 (背景/UI/动画/音频/字体)
src/hooks/
  useWebSocket.ts       # React hook: send/on/off 事件模式
  useCountdown.ts       # 倒计时 hook
  useAudio.ts           # audioManager 的 React hook 封装
  useMapleLeaves.ts     # Canvas 2D 枫叶粒子特效
src/components/
  game/                 # ErrorPage, LoadingOverlay, LottiePlayer, MapleLeaves, TransitionOverlay
  layout/               # PageContainer, TopBar
  ui/                   # TierBadge, TraitTag

scripts/
  gen-all.ts            # 一键生成全部本地占位素材
  upload-cricket-images.ts  # 上传图片到 MinIO + 更新 DB image_key
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
| C→S | battle:ready / battle:action / battle:nextRound | 选蛐蛐/出招/下一局 (PvP需双方都发nextRound) |
| C→S | battle:rematch | 训练模式再来一局 |
| C→S | room:leave | 离开房间 |
| C→S | ping | 心跳 |
| S→C | connected | 连接成功确认 `{message: "已连接到斗蛐蛐对战服务器"}` |
| S→C | pong | 心跳响应 |
| S→C | room:created / room:joined / room:state | 房间状态 |
| S→C | room:selectionStart | 选蛐蛐开始 `{timeout: number}` |
| S→C | room:matched / room:matchmake.waiting / room:matchmake.timeout | 匹配结果 |
| S→C | room:matchmake.cancelled | 取消匹配成功 |
| S→C | battle:data / battle:roundResult / battle:roundWin / battle:gameOver | 战斗结算 |
| S→C | battle:cricketChange | 换蛐蛐通知 |

### 战斗系统

动作: heavy_strike / feint / block / chirp，克制关系见 `COUNTER_MULTIPLIER`。
特性: 6种 (fierce/swift/cunning/steadfast/tenacious/resonant)，在 `TRAIT_EFFECTS` 声明。
对战模式: BATTLE_MODE — tag_team(车轮战,默认) / best_of_3(三局两胜)

关键常量 (`packages/shared/src/config/game.ts`):
- `DAMAGE_MULTIPLIER = 2` — 最终伤害倍率
- `DAMAGE_CAP` — 重击上限 35% 最大HP，虚招上限 30%
- `SPIRIT_FEAR_THRESHOLD = 10` — 气势差超过此值触发恐惧
- `AUTO_READY_DELAY = 2500` — 回合间自动就绪延迟 (ms)
- `WS_HEARTBEAT_INTERVAL = 20000` / `WS_PING_TIMEOUT = 10000` — WS 心跳
- `ROOM_CLEANUP_DELAY = 5000` — 房间销毁延迟 (ms)

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

### 环境变量

### 前端 (`.env.local`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_S3_BASE_URL` | S3 图片基础 URL，用于 `image-loader.ts` 解析云端图片 | — |
| `NEXT_PUBLIC_WS_PORT` | WebSocket 连接端口 | `4000` |

### 后端 (`packages/backend/.env`)

| 变量 | 说明 |
|------|------|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | MySQL 8 连接参数 |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_FORCE_PATH_STYLE` / `S3_PUBLIC_URL` | MinIO S3 存储配置 |
| `PASSPORT_BASE_URL` | 山海 Passport API 地址 |
| `PASSPORT_PROXY` / `HTTP_PROXY` / `HTTPS_PROXY` | HTTP 代理（内网调用 Passport 用） |
| `WX_SP_APPID` / `WX_SP_MCHID` / `WX_SUB_MCHID` | 微信支付服务商模式商户参数 |
| `WX_API_V3_KEY` | 微信支付 APIv3 密钥 |
| `WX_CERT_SERIAL` / `WX_CERT_PRIVATE_KEY_PATH` | 微信支付证书配置 |
| `WX_PAY_NOTIFY_URL` | 微信支付回调地址 |
| `WX_PAY_MOCK` | 支付 Mock 开关（占位符时自动 true） |
| `BATTLE_MODE` | 对战模式: `tag_team` / `best_of_3` |
| `CORS_ORIGIN` | CORS 允许的 origin |
| `BACKEND_PORT` | HTTP/WS 监听端口 | `4000` |
| `JWT_SECRET` | 本地 JWT 签名密钥 | `dev-secret-change-in-production` |

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

- 后端数据库直连 MySQL 8 (Drizzle ORM)，不再有 getSupabase() 回退机制；MySQL 不可用时后端拒绝启动
- 后端启动时加载 `cricket_tier_ranges` 到内存缓存，加载失败则 process.exit(1)
- `packages/backend/src/db/schema.ts` 是数据库唯一权威定义（drizzle-kit push 管理迁移）
- 所有 Passport 接口由后端代理调用，前端不直接调 Passport
- Passport API 不可用时（如外网环境），send-code 返回 `{success:true, mock:true}`，万能验证码 `666666` 可登录
- 前端 `ensureAuth()` 返回 null 时受保护页面跳 `/auth`
- 蛐蛐图片由 API 下发 `imageKey`(MinIO 公开 URL)，前端不用硬编码本地路径
- 游戏平衡参数通过 `@taiwu/shared/config/game` 导出常量，禁止魔法数字
- 战斗计算用 `@taiwu/shared/lib/battle-calc` 纯函数，不依赖 React 状态
- 新建用户默认赠送 3 只起始蛐蛐（template_id 1/2/3），不赠送抽奖次数
