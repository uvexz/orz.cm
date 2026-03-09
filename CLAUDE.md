# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Install dependencies: `pnpm install`
- Create a local env file: `cp .env.example .env`
- Generate the Prisma client: `pnpm postinstall`
- Apply database migrations: `pnpm db:push`
  - Note: despite the script name, this runs `prisma migrate deploy`, not `prisma db push`.
- Start the local dev server: `pnpm dev`
- Start the local dev server with Turbopack: `pnpm turbo`
- Build for production: `pnpm build`
- Preview the production build locally: `pnpm preview`
- Start the production server: `pnpm start`
- Lint: `pnpm lint`
- Run the database health/version check and optional migration step used by deployment: `pnpm check-db`
- Run the Docker stack against an external database: `docker compose up -d`
- Run the Docker stack with the bundled local Postgres service: `docker compose -f docker-compose-localdb.yml up -d`
- Vercel build command: `pnpm check-db && pnpm build`

### Testing and formatting

- There is currently no `test` script and no Jest/Vitest/Playwright/Cypress config in the repository.
- There is currently no single-test command available.
- There is no repo `format` script; pre-commit formatting is handled by Husky with `npx pretty-quick --staged`.
- Commit messages are checked by Husky + Commitlint and should follow conventional commit style.

## High-level architecture

- This is a Next.js 14 App Router application in TypeScript.
- The app is split into route groups under `app/`:
  - `(marketing)` for public/marketing pages
  - `(docs)` for the documentation site
  - `(auth)` for login/register flows
  - `(protected)` for dashboard/admin/setup pages
- Root application composition lives in `app/layout.tsx`, which wires up global styles/fonts, `next-intl`, `next-auth` session state, `next-themes`, modals, Sonner toasts, Google Analytics, Umami, and view transitions.
- `next.config.mjs` composes `next-intl`, `next-contentlayer2`, and `next-pwa`, and builds with `output: "standalone"`.
- Runtime environment access is centralized in `env.mjs` via `@t3-oss/env-nextjs`.

## Routing and domain behavior

- `middleware.ts` is one of the most important files in the repo. It is not only auth middleware.
- It handles:
  - short-link resolution for non-system routes
  - legacy `/s/:slug` redirects
  - portal-domain vs business/custom-domain behavior
  - redirecting business-domain root requests back to the portal with `?redirect=...`
  - collecting IP, geo, language, and user-agent data before posting to `/api/s`
- If a change touches routing, domains, or short-link behavior, inspect `middleware.ts` first.

## Auth and access control

- Auth is built on Auth.js / NextAuth v5 beta with PrismaAdapter and JWT sessions.
- Main auth files:
  - `auth.ts`
  - `auth.config.ts`
  - `app/api/auth/[...nextauth]/route.ts`
  - `app/api/auth/credentials/route.ts`
- Providers currently include Google, GitHub, LinuxDo OAuth, and Credentials.
- Session fields such as `role`, `team`, `active`, `apiKey`, and `emailVerified` are hydrated from Prisma in the `auth.ts` callbacks.
- The usual server-side access pattern is:
  - `getCurrentUser()` from `lib/session.ts`
  - `checkUserStatus()` from `lib/dto/user.ts`
- `app/(protected)/layout.tsx` is the shared authenticated shell and filters navigation items using `authorizeOnly` metadata from `config/dashboard.ts`.
- First-user bootstrap/admin promotion is handled through `app/api/setup/route.ts`.

## Data layer and business logic

- Persistence is Prisma + PostgreSQL.
- Shared Prisma client: `lib/db.ts`
- Schema: `prisma/schema.prisma`
- The main domain boundary is the DTO/service layer in `lib/dto/*`. Route handlers and pages usually call these modules rather than embedding raw Prisma logic everywhere.
- Important schema areas:
  - auth/users: `User`, `Account`, `Session`, `VerificationToken`
  - short links + analytics: `UserUrl`, `UrlMeta`
  - DNS/domain management: `Domain`, `UserRecord`
  - email: `UserEmail`, `ForwardEmail`, `UserSendEmail`
  - file storage: `UserFile`
  - open API usage: `ScrapeMeta`
  - system configuration and quotas: `SystemConfig`, `Plan`
- Quotas and usage limits are core product concepts. Check `lib/dto/plan.ts` and `lib/team.ts` before changing product limits or creation flows.

## API surface and product modules

- This repository is a multi-product SaaS portal, not a single-feature app.
- Main product areas are:
  - short URLs
  - DNS record management
  - temporary email / outbound email
  - S3-compatible file storage
  - public scraping/open APIs
  - peer-to-peer chat (`app/chat/page.tsx`)
- The API surface under `app/api` mirrors those product areas. Major route families include `auth`, `url`, `record`, `email`, `storage`, `admin`, `plan`, `configs`, `setup`, and public `v1/*` endpoints.

## Content and documentation system

- The repo uses Contentlayer for MDX-backed docs and content pages.
- Content sources:
  - `content/docs/**/*.mdx`
  - `content/pages/**/*.mdx`
- Rendering entry points:
  - docs: `app/(docs)/docs/[[...slug]]/page.tsx`
  - content pages: `app/(marketing)/[slug]/page.tsx`
- `contentlayer.config.ts` defines computed slugs, MDX image extraction, GitHub-flavored markdown, heading anchors, and pretty-code rendering.
- Docs navigation is config-driven in `config/docs.ts`; sidebar structure does not come only from the filesystem.

## UI, config, and localization structure

- Shared UI is organized by shell/feature under `components/`, especially `layout`, `shared`, `docs`, `dashboard`, `email`, `file`, `charts`, and `chat`.
- Navigation and other cross-app structure are centralized in `config/`, especially:
  - `config/dashboard.ts`
  - `config/docs.ts`
  - `config/marketing.ts`
  - `config/site.ts`
- Internationalization uses `next-intl`; locale messages live under `locales/`.

## External integrations

- Cloudflare is used for domain onboarding and DNS operations.
- Email sending can use Resend or Brevo depending on domain configuration.
- File storage uses S3-compatible backends such as Cloudflare R2/AWS-style APIs.
- Public scraping APIs live under `app/api/v1/*`; screenshot generation depends on `SCREENSHOTONE_BASE_URL`.
- Analytics is split between client-side integrations and server-side tracking/redirect logging.

## Working notes for future agents

- If a change affects routing or custom domains, start with `middleware.ts`.
- If a change affects business rules, validation, or quotas, inspect the relevant `lib/dto/*` module before editing route handlers.
- If a change affects docs navigation or docs rendering, check both `content/` and `config/docs.ts`.
- If auth/session fields seem wrong, trace the `auth.ts` callbacks before changing UI code.
- If a feature appears env-sensitive, confirm the required variables in `env.mjs` and the deployment expectations in `docker-compose.yml`, `docker-compose-localdb.yml`, and `vercel.json`.
