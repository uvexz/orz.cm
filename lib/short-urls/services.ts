import {
  CACHE_TTL,
  delCache,
  getOrSetCache,
  setCache,
} from "@/lib/cache";

import { calculateUrlStatusStats, normalizeShortUrlFormData } from "./policies";
import {
  aggregateUrlClicksByIds,
  countUserShortUrls,
  findShortUrlBySuffix,
  findShortUrlIdBySuffix,
  findShortUrlSlugById,
  findUrlMetaByIp,
  findUserShortLinksByIds,
  incrementUrlMetaClick,
  insertShortUrlMeta,
  insertUserShortUrl,
  listUrlMetaLiveLog,
  listUrlStatusRecords,
  listUserShortUrls,
  listUserUrlMetaInfo,
  removeUserShortUrl,
  updateShortUrlActiveState,
  updateShortUrlVisibilityState,
  updateUserShortUrlByAdmin,
  updateUserShortUrlByOwner,
} from "./queries";
import type { ShortUrlFormData, ShortUrlMetaInput, UrlStatusStats, UserRole } from "./types";

type ShortUrlCacheValue = NonNullable<
  Awaited<ReturnType<typeof findShortUrlBySuffix>>
>;
type NegativeShortUrlCacheValue = { missing: true };

function createUniqueConstraintError() {
  const error = new Error("Unique constraint failed") as Error & { code?: string };
  error.code = "UNIQUE_CONSTRAINT";
  return error;
}

function getShortUrlCacheKey(slug: string) {
  return `short-url:${slug}`;
}

async function invalidateShortUrlCache(...slugs: Array<string | null | undefined>) {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))] as string[];
  await Promise.all(uniqueSlugs.map((slug) => delCache(getShortUrlCacheKey(slug))));
}

async function readShortUrlFromCache(
  slug: string,
): Promise<ShortUrlCacheValue | null> {
  const cachedValue = await getOrSetCache<ShortUrlCacheValue | NegativeShortUrlCacheValue>(
    getShortUrlCacheKey(slug),
    CACHE_TTL.shortUrl,
    async () => {
      const shortUrl = await findShortUrlBySuffix(slug);
      if (!shortUrl) {
        return { missing: true } satisfies NegativeShortUrlCacheValue;
      }

      return shortUrl;
    },
  );

  if ("missing" in cachedValue) {
    await setCache(
      getShortUrlCacheKey(slug),
      cachedValue,
      CACHE_TTL.shortUrlNegative,
    );
    return null;
  }

  return cachedValue;
}

async function assertShortUrlSlugAvailable(url: string, currentId?: string) {
  const existingShortUrl = await findShortUrlIdBySuffix(url);
  if (existingShortUrl && existingShortUrl.id !== currentId) {
    throw createUniqueConstraintError();
  }
}

export async function getUserShortUrls(
  userId: string,
  _active = 1,
  page: number,
  size: number,
  role: UserRole = "USER",
  userName = "",
  url = "",
  target = "",
) {
  return listUserShortUrls(userId, page, size, role, userName, url, target);
}

export async function getUserShortUrlCount(
  userId: string,
  _active = 1,
  role: UserRole = "USER",
) {
  try {
    return await countUserShortUrls(userId, role);
  } catch (_error) {
    return { total: -1, month_total: -1 };
  }
}

export async function getUserShortLinksByIds(ids: string[], userId?: string) {
  try {
    return await findUserShortLinksByIds(ids, userId);
  } catch (_error) {
    return [];
  }
}

export async function getUrlClicksByIds(
  ids: string[],
  userId: string,
  role: UserRole,
): Promise<Record<string, number>> {
  if (ids.length === 0) {
    return {};
  }

  try {
    const clicksData = await aggregateUrlClicksByIds(ids, userId, role);
    const clicksMap: Record<string, number> = {};
    ids.forEach((id) => {
      clicksMap[id] = 0;
    });
    clicksData.forEach((item) => {
      clicksMap[item.urlId] = Number(item.click ?? 0);
    });
    return clicksMap;
  } catch (error) {
    console.error("Error fetching clicks:", error);
    return Object.fromEntries(ids.map((id) => [id, 0]));
  }
}

export async function getUrlStatus(
  userId: string,
  role: UserRole = "USER",
): Promise<UrlStatusStats | { status: unknown }> {
  return getUrlStatusOptimized(userId, role);
}

export async function getUrlStatusOptimized(
  userId: string,
  role: UserRole = "USER",
): Promise<UrlStatusStats | { status: unknown }> {
  try {
    const urlRecords = await listUrlStatusRecords(userId, role);
    return calculateUrlStatusStats(urlRecords);
  } catch (error) {
    console.error("Error getting URL status (optimized):", error);
    return { status: error };
  }
}

export async function createUserShortUrl(data: ShortUrlFormData) {
  try {
    const normalizedData = normalizeShortUrlFormData(data);
    await assertShortUrlSlugAvailable(normalizedData.url);
    const shortUrl = await insertUserShortUrl(normalizedData);
    await invalidateShortUrlCache(normalizedData.url);
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrl(data: ShortUrlFormData) {
  try {
    const normalizedData = normalizeShortUrlFormData(data);
    const existingShortUrl = normalizedData.id
      ? await findShortUrlSlugById(normalizedData.id)
      : null;

    await assertShortUrlSlugAvailable(normalizedData.url, normalizedData.id);
    const shortUrl = await updateUserShortUrlByOwner(normalizedData);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    await invalidateShortUrlCache(existingShortUrl?.url, normalizedData.url);
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlAdmin(
  data: ShortUrlFormData,
  newUserId: string,
) {
  try {
    const normalizedData = normalizeShortUrlFormData(data);
    const existingShortUrl = normalizedData.id
      ? await findShortUrlSlugById(normalizedData.id)
      : null;

    await assertShortUrlSlugAvailable(normalizedData.url, normalizedData.id);
    const shortUrl = await updateUserShortUrlByAdmin(normalizedData, newUserId);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    await invalidateShortUrlCache(existingShortUrl?.url, normalizedData.url);
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlActive(
  userId: string,
  id: string,
  active = 1,
  role: UserRole = "USER",
) {
  try {
    const existingShortUrl = await findShortUrlSlugById(id);
    const shortUrl = await updateShortUrlActiveState(userId, id, active, role);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    await invalidateShortUrlCache(existingShortUrl?.url);
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlVisibility(id: string, visible: number) {
  try {
    const shortUrl = await updateShortUrlVisibilityState(id, visible);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function deleteUserShortUrl(userId: string, urlId: string) {
  const existingShortUrl = await findShortUrlSlugById(urlId);
  const deletedShortUrl = await removeUserShortUrl(userId, urlId);
  await invalidateShortUrlCache(existingShortUrl?.url);
  return deletedShortUrl;
}

export async function getUserUrlMetaInfo(urlId: string, dateRange = "") {
  return listUserUrlMetaInfo(urlId, dateRange);
}

export async function getUrlBySuffix(suffix: string) {
  return readShortUrlFromCache(suffix);
}

export async function createUserShortUrlMeta(data: ShortUrlMetaInput) {
  try {
    const meta = await findUrlMetaByIp(data.urlId, data.ip);
    const createdOrUpdatedMeta = meta
      ? await incrementUrlMetaClick(meta.id)
      : await insertShortUrlMeta(data);

    return { status: "success", data: createdOrUpdatedMeta };
  } catch (error) {
    console.error("create meta error", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getUrlMetaLiveLog(userId?: string) {
  const logs = await listUrlMetaLiveLog(userId);

  return logs.map((log) => ({
    ...log,
    slug: log.slug || "",
    target: log.target || "",
  }));
}
