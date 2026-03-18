# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Use `bun` for installs and scripts in the root app.
- Initial local setup:
  ```bash
  cp .env.example .env
  bun install
  bun run db:push
  bun run dev
  ```
- Minimum local env to get the app running is driven by `.env.example`, especially `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`.
- Redis is an optional cache layer enabled via `REDIS_URL`. If unset, the app falls back to direct database reads. The current Redis client is for Node runtime only.
- Fresh database bootstrap: create the first account at `/login`, then finish `/setup` to promote that user to admin.
- Production build check used by deployment: `bun run check-db && bun run build`

### Root app

- `bun run dev` — start Next.js dev server
- `bun run turbo` — start Next.js dev server with Turbopack
- `bun run build` — production build
- `bun run preview` — build and start locally
- `bun run start` — production server
- `bun run lint` — ESLint
- `bun run typecheck` — TypeScript no-emit check
- `bun run test` — Bun test runner
- `bun test <path-to-test-file>` — run a single Bun test file
- `bun run db:generate` — generate Drizzle migrations from `lib/db/schema.ts`
- `bun run db:push` — normalize user emails, then push schema with Drizzle
- `bun run check-db` — deployment DB/version check

### Telegram worker (`.tgbot`)

- `cd .tgbot && bun run dev` — Wrangler local dev
- `cd .tgbot && bun run deploy` — deploy the worker
- `cd .tgbot && bunx vitest run` — run worker tests
- `cd .tgbot && bunx vitest run test/index.spec.ts` — run the checked-in worker test directly
- `cd .tgbot && bunx wrangler types` — regenerate Worker types after changing `wrangler.jsonc` bindings

### Validation and hooks

- Standard validation set: `bun run test`, `bun run lint`, `bun run typecheck`, `bun run build`
- Husky pre-commit runs `npx pretty-quick --staged`
- Commit messages are checked by Commitlint with conventional commits

## Architecture overview

- This is a Next.js 16 App Router monolith for several product areas: short links, temporary email / outbound mail, S3-compatible file storage, public utility APIs, and an admin/configuration surface that controls quotas and feature flags.
- `app/layout.tsx` wires the global shell: fonts, `next-intl`, `next-themes`, modal provider, Sonner toasts, analytics, and view transitions.
- Route groups under `app/`:
  - `(marketing)` — public landing/content shell
  - `(auth)` — login/register flows
  - `(protected)` — authenticated dashboard, admin, and setup flows
  - `(standalone)` — full-screen product views such as mailbox and link status/password flows
  - `api/**` — internal, admin, and public route handlers

## Auth and request lifecycle

- Auth is Better Auth + Drizzle in `auth.ts`.
- `lib/auth/server.ts` is the key bridge between Better Auth tables (`user`, `session`, `account`, `verification`) and the app-specific `users` table. It enriches sessions with `role`, `team`, `active`, `apiKey`, and `emailVerified`, and keeps auth users synced into app users.
- `lib/session.ts` exposes the normal server-side access path via `getCurrentUser()`.
- Protected/admin APIs should use the wrappers in `lib/api/route.ts` (`createAuthedApiRoute`, `createAdminApiRoute`) instead of reimplementing session and error handling.
- `app/(protected)/layout.tsx` is the authenticated shell and filters dashboard navigation from `config/dashboard.ts` by user role.
- First-user bootstrap/admin promotion is handled by `app/api/setup/route.ts`.

## Data layer and business logic

- Database client: `lib/db.ts`
  - Important detail: production builds use a recursive proxy instead of a live DB client, so imports during `next build` do not open a Postgres connection.
- Schema: `lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- SQL migrations: `drizzle/`
- The schema contains both Better Auth tables and app tables. If auth/session behavior looks wrong, inspect both sides.
- Main domain logic is organized as `types` + `queries` + `services` + `policies` modules:
  - `lib/short-urls/*`
  - `lib/email/*`
  - `lib/files/*`
- `lib/dto/*` still holds shared data/config modules such as domains, plans, system config, and some older feature logic.

## Key product flows

### Short links

- Start with `proxy.ts`, `app/api/s/route.ts`, and `lib/short-urls/*`.
- `proxy.ts` is central to routing. It intercepts non-API/non-static requests, treats single-segment paths as candidate slugs, rewrites legacy `/s/:slug`, distinguishes portal vs business/custom domains, and collects IP / geo / user-agent / language data before calling `/api/s`.
- `app/api/s/route.ts` resolves slug status, password protection, expiration, and analytics writes.
- If a task touches routing, custom domains, or redirect behavior, read `proxy.ts` first.

### Email

- Core logic: `lib/email/*`
- Main APIs: `app/api/email/**`
- Public API: `app/api/v1/email/**`
- Standalone mailbox UI: `app/(standalone)/emails/**`
- Domain availability and provider config come from `lib/dto/domains.ts`.
- Quotas come from `lib/dto/plan.ts` plus `restrictByTimeRange()` in `lib/team.ts`.
- Sending is provider-based (Resend/Brevo) and depends on per-domain config.

### File storage

- Core logic: `lib/files/*`
- Shared storage helpers: `lib/s3.ts` and `lib/api/storage.ts`
- API routes: `app/api/storage/**`
- Upload flow uses presigned URLs and stores metadata in `user_files`.
- Storage/provider limits are driven by plan/system config plus admin S3 settings under `app/(protected)/admin/system/**`.

### Plans, quotas, and runtime config

- Plan quotas: `lib/dto/plan.ts`
- Runtime system config: `lib/dto/system-config.ts`
- Domain config/features: `lib/dto/domains.ts`
- Usage enforcement helper: `lib/team.ts`
- These are active runtime controls, not passive admin metadata: they gate registration, API access, feature availability, and monthly creation limits.

## Internationalization and UI structure

- i18n uses `next-intl` via `next.config.mjs` and `i18n/request.ts`.
- Supported locales are `en` and `zh`.
- Locale comes from the `language` cookie first, then `Accept-Language`; routes are not locale-prefixed.
- Shared UI primitives live in `components/ui/*`.
- Higher-level shared UI lives in `components/layout/*` and `components/shared/*`.
- Feature UI is grouped by domain, especially `components/email/*` and `components/file/*`.

## Separate subproject: `.tgbot`

- `.tgbot` is a separate Cloudflare Worker project, not part of the root Next.js runtime.
- It is a Hono-based Telegram bot (`.tgbot/src/index.ts`) that talks to the main app’s public API (`/api/v1`) and stores chat/session state in KV.
- Worker config lives in `.tgbot/wrangler.jsonc`.
- `.tgbot/AGENTS.md` requires checking current Cloudflare Workers docs before changing Worker/KV behavior.
- After changing Worker bindings, rerun `bunx wrangler types` inside `.tgbot`.

## Design Context

### Users
Primary users are people who want to shorten long URLs and generate temporary email addresses quickly. They are usually trying to get a practical task done with minimal friction: make links easier to share, cleaner to present, and create disposable inboxes without extra setup.

### Brand Personality
The brand should feel clean, simple, and minimal. The overall emotional goal is confidence through clarity: fast to understand, lightweight to use, and polished without feeling corporate or heavy.

### Aesthetic Direction
The product should feel like a polished indie hacker product rather than a serious infra console or a playful experiment. Favor crisp layouts, restrained interfaces, and purposeful accents over noisy visuals. Light mode is the primary design target. Existing brand assets, the neutral UI foundation, and the current logo/display typography should be treated as the baseline unless a task explicitly calls for a broader rebrand.

### Design Principles
1. Reduce friction first: optimize every screen for fast completion of core tasks like shortening links and creating temporary mailboxes.
2. Keep the interface minimal: prefer fewer, clearer elements over decorative complexity.
3. Polish the basics: spacing, hierarchy, typography, and states should feel intentional and refined.
4. Use visual emphasis sparingly: accents and motion should guide attention, not dominate the experience.
5. Design light-first: ensure light mode feels complete and premium, with dark mode treated as secondary unless a task says otherwise.
