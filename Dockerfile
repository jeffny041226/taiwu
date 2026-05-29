# ============================================================
# 斗蛐蛐 — Dockerfile
# 前后端合一（monorepo + pnpm workspaces）
# ============================================================

# ---- Build stage ----
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依赖安装（利用 layer 缓存）
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/backend/package.json ./packages/
RUN pnpm install --frozen-lockfile --ignore-scripts

# 源代码
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY src ./src
COPY public ./public
COPY packages ./packages

# 构建 Next.js 前端
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- Runtime stage ----
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制构建产物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# 后端源码（tsx 直接运行，无需 tsc build）
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/tsconfig.json ./packages/backend/

EXPOSE 3000 4000

# 同时启动后端 (Express+WS, port 4000) 和前端 (Next.js, port 3000)
CMD ["sh", "-c", "\
  cd /app && \
  pnpm --filter @taiwu/backend exec tsx src/index.ts & \
  next start -p 3000 \
"]
