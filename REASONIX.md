# REASONIX.md — 斗蛐蛐 (Cricket Battle)

## Stack

- **Next.js 16** (App Router, all pages `'use client'`) + **React 19**
- **TypeScript** strict mode, path alias `@/` → `./src/`
- **Tailwind CSS v4** via `@tailwindcss/postcss`; custom tokens via `@theme` in `globals.css`
- **WebSocket** standalone server (`ws` library, port 3001, `server/` dir)
- **Supabase** PostgreSQL (`db/schema.sql`: `users`, `cricket_templates`, `user_crickets`)
- **pnpm** workspace with `esbuild`/`sharp`/`unrs-resolver` allowed builds
- **Vitest** (`pnpm test` watch, `pnpm test:run` single-run)
- **ESLint** via `next lint`

## Layout

| Path | Contents |
|------|----------|
| `src/app/` | Next.js App Router pages (hall, market, backpack, room, battle) + API routes |
| `src/components/` | React components: `game/`, `layout/`, `ui/` |
| `src/lib/` | Shared pure logic (battle calc, gacha, WS client, audio, cricket utils) |
| `src/config/` | Centralized constants: `game.ts` (balance), `assets.ts` (asset paths) |
| `src/types/` | Shared TS interfaces: `cricket.ts`, `battle.ts`, `ws-message.ts` |
| `src/hooks/` | Custom hooks (`useWebSocket`, `useAudio`, `useCountdown`, etc.) |
| `server/` | Standalone WS server: `index.ts`, `room-manager.ts`, `ws-handler.ts`, `battle-resolver.ts`, `ai-opponent.ts` |
| `scripts/` | Asset generation (sharp SVG→PNG); excluded from tsconfig, run via `tsx` |
| `public/assets/` | Animations (Lottie), audio (BGM/SFX), crickets, UI images |
| `db/` | `schema.sql` (3 tables) + `seed.sql` (20 cricket templates) |
| `minimax-output/` | Generated placeholder images |

## Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Next.js dev server (port 3000) |
| `pnpm dev:ws` | WS server via tsx watch (port 3001) |
| `pnpm build` | Production build |
| `pnpm start` | Production start |
| `pnpm lint` | ESLint (next lint) |
| `pnpm test` | Vitest (watch) |
| `pnpm test:run` | Vitest (single run) |

## Conventions

- **Named exports only** — no `export default` in source modules.
- **`@/` alias** used for all internal imports (`@/config/game`, `@/lib/battle-calc`).
- **Magic numbers forbidden** — balance values in `src/config/game.ts`, asset paths in `src/config/assets.ts`.
- **Battle calc is shared** — `src/lib/battle-calc.ts` is pure functions consumed by both client and `server/battle-resolver.ts`.
- **Quality tiers** — 4 levels: `common` (weight 100) → `rare` (65) → `epic` (30) → `legendary` (15); gacha in `src/lib/gacha-engine.ts`.
- **WebSocket message protocol** — 14 message types, all typed in `src/types/ws-message.ts`.

## Watch out for

- **Two servers to run** — The Next.js server (port 3000) and WebSocket server (port 3001) are separate processes. Both must be running for gameplay.
- **`scripts/` excluded from tsconfig** — Scripts in `scripts/` are not type-checked during `pnpm build`; run them with `tsx scripts/foo.ts`.
- **Native build deps** — `sharp` and `esbuild` require pnpm's `onlyBuiltDependencies` allowlist in `pnpm-workspace.yaml`. If you reinstall from scratch, run `pnpm rebuild` if sharp fails.
