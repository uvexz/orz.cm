import "server-only";

import { getRedisClient } from "@/lib/redis";

const CACHE_PREFIX = "orzcm";
const SHORT_URL_TTL_SECONDS = 60 * 10;
const SHORT_URL_NEGATIVE_TTL_SECONDS = 60;
const DTO_TTL_SECONDS = 60 * 60;

export const CACHE_TTL = {
  shortUrl: SHORT_URL_TTL_SECONDS,
  shortUrlNegative: SHORT_URL_NEGATIVE_TTL_SECONDS,
  dto: DTO_TTL_SECONDS,
} as const;

function withPrefix(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

function logCacheEvent(
  action: "hit" | "miss" | "set" | "del" | "fallback",
  key: string,
  error?: unknown,
) {
  if (!error) {
    return;
  }

  console.error(`[cache] ${action} ${key}`, error);
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logCacheEvent("fallback", key);
      return null;
    }

    const rawValue = await redis.get(withPrefix(key));
    if (!rawValue) {
      logCacheEvent("miss", key);
      return null;
    }

    logCacheEvent("hit", key);
    return JSON.parse(rawValue) as T;
  } catch (error) {
    logCacheEvent("fallback", key, error);
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
      logCacheEvent("fallback", key);
      return;
    }

    await redis.set(withPrefix(key), JSON.stringify(value), {
      EX: ttlSeconds,
    });
    logCacheEvent("set", key);
  } catch (error) {
    logCacheEvent("fallback", key, error);
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      logCacheEvent("fallback", key);
      return;
    }

    await redis.del(withPrefix(key));
    logCacheEvent("del", key);
  } catch (error) {
    logCacheEvent("fallback", key, error);
  }
}

export async function delCacheMany(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => delCache(key)));
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
