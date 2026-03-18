# Redis adaptation decisions and execution order

## Completed

- Unified domain config reads behind shared cached readers.
- Added cached system-config bulk reads with matching invalidation behavior.
- Wired `REDIS_URL` through Docker deployment files.
- Updated project documentation to position Redis as an optional cache layer.
- Removed `lib/domainConfig.ts` and cleaned up related inconsistency.
- Simplified cache fallback logging semantics.
- Cleaned up short-link negative-cache behavior.

## Recommended to implement

1. Harden cache key naming / namespace rules
   - Use explicit namespaces for new short-link cache families:
     - `short-url:slug:*`
     - `short-url:list:*`
     - `short-url:status:*`
   - Keep existing DTO/config cache namespaces unchanged unless there is a compelling migration reason.
   - Keep Redis scoped to shared low-cardinality reads, short-TTL derived summaries, and exact-key lookups with explicit invalidation.

2. Add Redis fallback/boundary tests
   - Cover Redis-enabled and no-Redis/fail-open behavior.
   - Cover hit, miss, negative cache, and invalidation behavior.
   - Confirm session/auth helpers such as `getCurrentUser()` remain uncached.

3. Cache short-link status summary
   - Cache `getUrlStatusOptimized(userId, role)` with a short TTL.
   - Invalidate on:
     - `createUserShortUrl`
     - `updateUserShortUrl`
     - `updateUserShortUrlAdmin`
     - `updateUserShortUrlActive`
     - `updateUserShortUrlVisibility`
     - `deleteUserShortUrl`

4. Cache short-link management list
   - Cache `getUserShortUrls(userId, _active, page, size, role, userName, url, target)` with a short TTL.
   - Include key dimensions:
     - `userId`
     - `role`
     - `page`
     - `size`
     - `userName`
     - `url`
     - `target`
   - Prefer coarse namespace invalidation for list-family keys on short-link mutations.

## Explicitly do not cache

- Temporary email mailbox/inbox/trash/sent reads
- User settings / session / current-user reads
- Admin paginated domain list
- Admin paginated plan list
- Full system-config list / stats / search
- Admin aggregate dashboards
- Short-link click aggregation / write-path Redis coordination for now

### Reasoning

- Temporary email flows are privacy-sensitive, highly mutable, and have complex unread/count invalidation.
- Session and identity reads require strong freshness and authorization correctness.
- Admin list/search surfaces are pagination-heavy, variable, and low traffic.
- Dashboard aggregates and live analytics have stronger freshness expectations than this cache layer should provide.
- Short-link write-path coordination, aggregation, and queue-like behavior should not be introduced in this pass.

## Deferred / re-evaluate later

- Any Redis-based write coordination, rate limiting, aggregation, or queue-like behavior

## Verification checklist

### Automated

- `bun test /mnt/e/Dev/orz.cm/tests/lib/short-urls/services.test.ts`
- `bun test /mnt/e/Dev/orz.cm/tests/lib/dto/system-config.test.ts`
- `bun test /mnt/e/Dev/orz.cm/tests/app/api/domain.route.test.ts`
- If stable:
  - `bun run test`
  - `bun run typecheck`

### Assertions to keep covered

- Short-link list cache hits on repeated identical queries
- Short-link list cache key isolation across page/filter inputs
- Short-link status cache hits on repeated identical queries
- Mutations invalidate slug + status + list caches
- USER and ADMIN scopes do not share cached list/status results
- No-Redis / fallback behavior still returns correct values

### Manual verification

- Repeat short-link list filters and confirm results stay correct.
- Create, edit, disable, and delete short links; confirm list and status summary refresh correctly.
- Confirm temporary email mailbox/inbox/trash/sent behavior is unchanged.
- Confirm dashboard settings and session-backed views remain direct and fresh.
- Confirm admin config reads still benefit from existing `getMultipleConfigs()` caching while admin domain/plan lists remain uncached.
