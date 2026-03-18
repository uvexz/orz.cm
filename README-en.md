# orz.cm

`orz.cm` is a multi-product platform built with Next.js 16. The current product surface focuses on short URLs, email, file storage, public APIs, and admin operations.

## Current Features

- Short URLs
  - Custom slugs, expiration, and password protection
  - Analytics, live logs, geo, and device insights
  - Public endpoint: `POST /api/v1/short`
- Email
  - Temporary / domain mailbox inboxes
  - Sending mail, reading inbox messages, deleting messages
  - Public endpoints such as `POST /api/v1/email` and `GET /api/v1/email/inbox`
- File Storage
  - S3-compatible storage integration
  - Upload, manage, delete, and share files
  - Admin-managed providers, buckets, and limits
- Public APIs
  - Screenshot
  - Metadata scraping
  - URL to Markdown
  - URL to Text
  - QR code generation
  - SVG icon API
- Admin
  - User, plan, domain, and system configuration management
  - API keys, storage config, auth provider toggles
  - Usage and operational dashboards

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Bun
- Drizzle ORM + PostgreSQL
- Better Auth
- Tailwind CSS
- next-intl

## Project Layout

- `app/`: pages and API routes
- `app/(marketing)`: landing and static content pages
- `app/(auth)`: login and registration
- `app/(protected)`: dashboard, admin, and setup
- `app/(standalone)`: standalone email, link status, and password flows
- `lib/short-urls/*`: short URL domain logic
- `lib/email/*`: email domain logic
- `lib/files/*`: file domain logic
- `proxy.ts`: short-link resolution, domain behavior, and request preprocessing

## Local Development

```bash
cp .env.example .env
bun install
bun run db:push
bun run dev
```

The default local app URL is `http://localhost:3000`.

For a fresh database, create the first account on `/login`, then visit `/setup` to complete initial admin setup.

### Redis Cache (Optional)

The project supports Redis via `REDIS_URL` as an optional cache layer.

- If `REDIS_URL` is not configured, the app automatically falls back to direct database reads
- The current Redis integration is Node-runtime only and is not intended for Edge runtime routes
- The main cached reads currently include short-link resolution, domain configuration, plan quotas, and system-config reads
- If you deploy with Docker, provide `REDIS_URL` in the runtime environment when you want Redis enabled

## Common Commands

```bash
bun run dev
bun run turbo
bun run lint
bun run typecheck
bun run test
bun run build
```

## Deployment

Recommended build command:

```bash
bun run check-db && bun run build
```

You can also deploy with the repository's `docker-compose.yml` or `docker-compose-localdb.yml`.

To enable Redis caching in deployment, provide `REDIS_URL` to the app container. If it is omitted, the app still works, but the affected read paths fall back to database queries.

## Validation

The standard validation set is:

```bash
bun run test
bun run lint
bun run typecheck
bun run build
```

## Acknowledgement

This project was rewritten from [oiov/wr.do](https://github.com/oiov/wr.do). Thanks to the original author and contributors for their work, open-source sharing, and engineering foundation.
