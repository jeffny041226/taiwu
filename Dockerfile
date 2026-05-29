# ============================================================
# 斗蛐蛐 — Dockerfile
# 前后端合一（monorepo + pnpm workspaces）
# ============================================================

# ---- Build stage ----
FROM node:22-alpine AS builder

# 中国镜像加速（如在海外可去掉这几行）
RUN echo 'registry=https://registry.npmmirror.com' > ~/.npmrc \
  && npm install -g pnpm

WORKDIR /app

# 依赖安装（利用 layer 缓存，使用 npmmirror 避免 DNS 解析失败）
RUN echo 'registry=https://registry.npmmirror.com' > /app/.npmrc
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/backend/package.json ./packages/
RUN pnpm install --frozen-lockfile

# 源代码
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY src ./src
COPY public ./public
COPY packages ./packages

# 构建 Next.js 前端
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ============================================================
# ---- Runtime stage ----
FROM node:22-alpine AS runner
RUN echo 'registry=https://registry.npmmirror.com' > ~/.npmrc \
  && npm install -g pnpm
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制构建产物和运行时依赖
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3000 4000

CMD ["sh", "-c", "\
  cd /app && \
  pnpm --filter @taiwu/backend exec tsx src/index.ts & \
  next start -p 3000 \
"]
