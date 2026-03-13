FROM oven/bun:1.3.9-alpine AS base

FROM base AS deps

RUN apk add --no-cache openssl
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

FROM base AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV IS_DOCKER=true

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

# Check db
COPY scripts/check-db.js /app/scripts/check-db.js

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["bun", "run", "start-docker"]
