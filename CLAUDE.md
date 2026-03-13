# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Install dependencies: `bun install`
- Create a local env file: `cp .env.example .env`
- Generate Drizzle SQL migrations: `bun run db:generate`
- Apply database schema changes: `bun run db:push`
  - Note: this runs `drizzle-kit push`.
- Start the local dev server: `bun run dev`
- Start the local dev server with Turbopack: `bun run turbo`
- Build for production: `bun run build`
- Preview the production build locally: `bun run preview`
- Start the production server: `bun run start`
- Lint: `bun run lint`
- Run the database health/version check and optional migration step used by deployment: `bun run check-db`
- Run the Docker stack against an external database: `docker compose up -d`
- Run the Docker stack with the bundled local Postgres service: `docker compose -f docker-compose-localdb.yml up -d`
- Vercel build command: `bun run check-db && bun run build`

### Testing and validation

- There is currently no `test` script and no Jest/Vitest/Playwright/Cypress config in the repository.
- There is currently no single-test command available.
- There is a dedicated `typecheck` script: `bun run typecheck`.
- In practice, `bun run lint` and `bun run build` are still the main regression checks.
- There is no repo `format` script; pre-commit formatting is handled by Husky with `npx pretty-quick --staged`.
- Commit messages are checked by Husky + Commitlint and should follow conventional commit style.

## High-level architecture

- This is a Next.js 16 App Router application in TypeScript.
- The repo is a multi-product SaaS portal rather than a single-feature app. Main product areas are short URLs, DNS record management, temporary email / outbound email, S3-compatible file storage, public scraping/open APIs, and peer-to-peer chat.
- The app is split into route groups under `app/`:
  - `(marketing)` for public landing/content pages
  - `(docs)` for the documentation site
  - `(auth)` for login/register flows
  - `(protected)` for dashboard, admin, and setup pages
- Root application composition lives in `app/layout.tsx`, which wires up global styles/fonts, `next-intl`, auth/session state, `next-themes`, modal providers, Sonner toasts, Google Analytics, Umami, and view transitions.
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

- Auth is built on Better Auth with the Drizzle adapter and cookie-based sessions.
- Main auth files:
  - `auth.ts`
  - `lib/auth/server.ts`
  - `app/api/auth/[...all]/route.ts`
  - `app/api/auth/credentials/route.ts`
- Providers currently include Google, GitHub, LinuxDo OAuth, email/password, and magic link.
- Application session fields such as `role`, `team`, `active`, `apiKey`, and `emailVerified` are synchronized in `lib/auth/server.ts`.
- The usual server-side access pattern is:
  - `getCurrentUser()` from `lib/session.ts`
  - `checkUserStatus()` from `lib/dto/user.ts`
- `app/(protected)/layout.tsx` is the shared authenticated shell and filters navigation items using `authorizeOnly` metadata from `config/dashboard.ts`.
- First-user bootstrap/admin promotion is handled through `app/api/setup/route.ts`.

## Data layer and business logic

- Persistence is Drizzle ORM + PostgreSQL.
- Shared database client: `lib/db.ts`
- Schema: `lib/db/schema.ts`
- The main domain boundary is the DTO/service layer in `lib/dto/*`. Route handlers and pages usually call these modules rather than embedding raw Prisma logic everywhere.
- Important schema areas:
  - auth/users: `User`, `Account`, `Session`, `VerificationToken`
  - short links + analytics: `UserUrl`, `UrlMeta`
  - DNS/domain management: `Domain`, `UserRecord`
  - email: `UserEmail`, `ForwardEmail`, `UserSendEmail`
  - file storage: `UserFile`
  - open API usage: `ScrapeMeta`
  - system configuration and quotas: `SystemConfig`, `Plan`
- Quotas and usage limits are core product concepts. Check `lib/dto/plan.ts` and `lib/team.ts` before changing product limits, creation flows, or API usage behavior.
- A small set of server actions for authenticated mutations lives under `actions/`.

## API surface and product modules

- The API surface under `app/api` mirrors the product areas. Major route families include `auth`, `url`, `record`, `email`, `storage`, `admin`, `plan`, `configs`, `setup`, and public `v1/*` endpoints.
- Public scraping/open API endpoints live under `app/api/v1/*` and usage is tracked in `ScrapeMeta`.
- File storage integrations are centralized in `lib/s3.ts`; storage route handlers call into that shared S3-compatible helper layer.

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
- Public scraping APIs include metadata, screenshot, QR, markdown, and text endpoints; screenshot generation depends on `SCREENSHOTONE_BASE_URL`.
- Analytics is split between client-side integrations and server-side tracking/redirect logging.

## Working notes for future agents

- If a change affects routing or custom domains, start with `middleware.ts`.
- If a change affects business rules, validation, quotas, or persistence, inspect the relevant `lib/dto/*` module before editing route handlers.
- If auth/session fields seem wrong, trace the `auth.ts` callbacks before changing UI code.
- If a change affects docs navigation or docs rendering, check both `content/` and `config/docs.ts`.
- If a change affects file uploads, signed URLs, or storage backends, inspect `lib/s3.ts` and the related `app/api/storage/**` handlers together.
- If a feature appears env-sensitive, confirm the required variables in `env.mjs` and the deployment expectations in `docker-compose.yml`, `docker-compose-localdb.yml`, and `vercel.json`.
