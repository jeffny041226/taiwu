# REASONIX.md — 斗蛐蛐 (Cricket Battle / Taiwu)

## Stack

- **pnpm** monorepo with `packages/shared/`, `packages/backend/`, `src/` (frontend)
- **Next.js 16** App Router + **React 19**, all pages `'use client'`
- **Tailwind CSS v4** via `@tailwindcss/postcss` + custom tokens in `@theme`
- **Express 4** + **ws** server at `packages/backend/` (port 3001)
- **Supabase** PostgreSQL (auth + DB), **JWT** auth (`jsonwebtoken` + `bcryptjs`)
- **TypeScript** strict mode; path alias `@/` → `./src/`
- **Vitest** (`pnpm test:run`), **ESLint** via `next lint`

## Layout

| Path | Contents |
|------|----------|
| `src/app/` | Next.js pages: hall, market, backpack, room, battle, auth, matchmake |
| `src/components/` | React components: `game/`, `layout/`, `ui/` |
| `src/config/` | `assets.ts` (asset path map) |
| `src/hooks/` | Custom hooks (`useWebSocket`, `useAudio`, `useCountdown`) |
| `src/lib/` | Client utilities (api client, audio, auth, image loader, WS client) |
| `packages/shared/src/` | Shared types, game config, battle calc, cricket templates, gacha engine |
| `packages/backend/src/` | Express routes (auth, crickets, gacha, room, user) + WS handler + battle resolver |
| `packages/backend/src/ws/` | WebSocket room manager, battle resolver, AI opponent, message handler |
| `scripts/` | Asset generation (SVG→PNG via sharp); excluded from tsconfig |
| `public/assets/` | Lottie animations, audio, cricket images, UI assets |
| `db/` | SQL schema (4 tables: users, cricket_templates, user_crickets, battle_logs) + seed data |

## Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Start both frontend (port 3000) + backend (port 3001) |
| `pnpm dev:frontend` | Next.js dev server only (port 3000) |
| `pnpm dev:backend` | Express + WS backend via tsx watch (port 3001) |
| `pnpm build` | Next.js production build |
| `pnpm test` | Vitest watch |
| `pnpm test:run` | Vitest single run |

## Conventions

- **Named exports only** — no `export default` in source modules.
- **`@/` alias** maps to `./src/`; `@taiwu/shared` imports from `packages/shared/src/`.
- **Magic numbers forbidden** — balance values in `@taiwu/shared/config/game.ts`.
- **Battle calc** in `packages/shared/src/lib/battle-calc.ts` is pure functions consumed by both frontend and backend.
- **WebSocket message protocol** — 14+ typed message types in `@taiwu/shared/types/ws-message.ts`.
- **Quality tiers** — 4 levels: common (100) → rare (65) → epic (30) → legendary (15).

## Watch out for

- **Two servers** — Next.js (3000) and Express+WS (3001) run as separate processes. Both required for full gameplay.
- **`scripts/` excluded from tsconfig** — Run with `tsx scripts/foo.ts` (e.g. `tsx scripts/gen-crickets.ts`).
- **Native deps** — `sharp`, `esbuild` require pnpm `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
- **Packages build chain** — `@taiwu/shared` is consumed directly via TypeScript path resolution (not built). Backend uses `tsx` for dev, `tsc` for build.
- **Auth** — JWT-based; backend validates on WS upgrade. Frontend stores token via Supabase session.
