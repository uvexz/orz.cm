import "server-only";

import { getRedisClient } from "@/lib/redis";

const CACHE_PREFIX = "orzcm";
const SHORT_URL_TTL_SECONDS = 60 * 10;
const SHORT_URL_NEGATIVE_TTL_SECONDS = 60;
const SHORT_URL_LIST_TTL_SECONDS = 60;
const SHORT_URL_STATUS_TTL_SECONDS = 60;
const DTO_TTL_SECONDS = 60 * 60;

// Redis is intentionally limited to shared low-cardinality reads, short-TTL
// derived summaries, and exact-key lookups with explicit invalidation.
export const CACHE_KEY_NAMESPACE = {
  shortUrlSlug: "short-url:slug",
  shortUrlList: "short-url:list",
  shortUrlStatus: "short-url:status",
} as const;

export const CACHE_TTL = {
  shortUrl: SHORT_URL_TTL_SECONDS,
  shortUrlNegative: SHORT_URL_NEGATIVE_TTL_SECONDS,
  shortUrlList: SHORT_URL_LIST_TTL_SECONDS,
  shortUrlStatus: SHORT_URL_STATUS_TTL_SECONDS,
  dto: DTO_TTL_SECONDS,
} as const;

function withPrefix(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

function logCacheFallback(key: string, error?: unknown) {
  if (!error) {
    return;
  }

  console.error(`[cache] fallback ${key}`, error);
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logCacheFallback(key);
      return null;
    }

    const rawValue = await redis.get(withPrefix(key));
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch (error) {
    logCacheFallback(key, error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logCacheFallback(key);
      return;
    }

    await redis.set(withPrefix(key), JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    logCacheFallback(key, error);
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logCacheFallback(key);
      return;
    }

    await redis.del(withPrefix(key));
  } catch (error) {
    logCacheFallback(key, error);
  }
}

export async function delCacheMany(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => delCache(key)));
}

export async function delCacheByPrefix(prefix: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logCacheFallback(prefix);
      return;
    }

    const keys: string[] = [];
    for await (const key of redis.scanIterator({
      MATCH: `${withPrefix(prefix)}*`,
      COUNT: 100,
    })) {
      if (typeof key === "string") {
        keys.push(key);
      }
    }

    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (error) {
    logCacheFallback(prefix, error);
  }
}

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cachedValue = await getCache<T>(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const value = await loader();
  await setCache(key, value, ttlSeconds);
  return value;
}
