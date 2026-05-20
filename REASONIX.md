# REASONIX.md — 斗蛐蛐 (Cricket Battle / Taiwu)

## Stack

- **Next.js 16** App Router + React 19, all pages `'use client'`
- **Express 4** + ws at `packages/backend/` (port **4000**)
- **pnpm** monorepo: `packages/shared/`, `packages/backend/`, `src/`
- **Tailwind CSS v4** via `@tailwindcss/postcss` + inline `style` properties
- **Supabase** PostgreSQL (auth + DB); fallback to in-memory store when not configured
- **Passport** login (phone + SMS code); 万能验证码 `666666` for dev
- **TypeScript** strict; path alias `@/` → `./src/`

## Layout

| Path | Contents |
|------|----------|
| `src/app/` | Next.js pages: hall, market, backpack, room, battle, auth, matchmake |
| `src/components/` | Game (`MapleLeaves`, `LoadingOverlay`), layout (`TopBar`), UI |
| `src/hooks/` | `useWebSocket`, `useAudio`, `useCountdown` |
| `src/lib/` | `api.ts` client, `ws-client.ts`, `auth.ts`, `image-loader.ts` |
| `packages/shared/src/` | Types (`cricket`, `battle`, `ws-message`), game config, battle calc, gacha engine |
| `packages/backend/src/` | Express REST routes + WS handler + battle resolver |
| `packages/backend/src/routes/` | `auth`, `crickets`, `gacha`, `pay`, `room`, `user` |
| `packages/backend/src/ws/` | Room manager, battle resolver, AI opponent, cricket resolver, WS message handler |
| `packages/backend/src/services/` | `passport.ts` (山海 Passport), `wechat-pay.ts` |
| `scripts/` | Asset gen (sharp); run with `npx tsx scripts/foo.ts` |
| `db/` | SQL schema + migrations (users, cricket_templates, user_crickets, variant stats, gacha_chances) |
| `public/assets/` | Backgrounds, icons, cricket images, audio, arena UI elements |
| `temp/` | Raw user-provided images (PNGs for conversion) |

## Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Start both frontend (3000) + backend (4000) |
| `pnpm dev:frontend` | Next.js dev (3000) |
| `pnpm dev:backend` | Express + WS via tsx watch (4000) |
| `pnpm build` | Next.js production build |
| `pnpm test:run` | Vitest single run |
| `pnpm lint` | ESLint via next lint |

## Conventions

- **Named exports only** — no `export default` in source modules
- **`@/`** maps to `./src/`; **`@taiwu/shared`** imports from `packages/shared/src/`
- **Magic numbers forbidden** — use `@taiwu/shared/config/game.ts`
- **Battle calc** is pure functions in `packages/shared/src/lib/battle-calc.ts` consumed by both ends
- **WS message protocol** — typed message types in `packages/shared/types/ws-message.ts`
- **Tiers** — common → rare → epic → legendary; sorting uses `TIER_ORDER` map in crickets route
- **Background images** — CSS `backgroundImage` with `linear-gradient` overlay, not `<Image fill>`

## Watch out for

- **Two servers required** — Next.js (3000) + Express/WS (4000); run `pnpm dev` for both
- **`scripts/` excluded from tsconfig** — run with `npx tsx scripts/foo.ts`
- **`@taiwu/shared` consumed directly** via TS path resolution, not built
- **Backend uses `tsx` for dev, `tsc` for build**
- **Auth** — Passport-based (phone+SMS); token stored as `passport_token` in localStorage
- **Gacha chances** — tracked per-user; new users get 3 free; persisted in DB or memory store
- **Payment** — WeChat H5 pay scaffold; `WX_PAY_MOCK=true` by default (auto-enabled when merchant ID is placeholder)
- **`sharp`** listed as `onlyBuiltDependencies` in `pnpm-workspace.yaml`
