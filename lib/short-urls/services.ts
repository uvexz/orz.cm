import {
  CACHE_KEY_NAMESPACE,
  CACHE_TTL,
  delCache,
  delCacheByPrefix,
  getCache,
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

type UserShortUrlListResult = Awaited<ReturnType<typeof listUserShortUrls>>;
type UrlStatusResult = UrlStatusStats | { status: unknown };

function createUniqueConstraintError() {
  const error = new Error("Unique constraint failed") as Error & { code?: string };
  error.code = "UNIQUE_CONSTRAINT";
  return error;
}

function getShortUrlSlugCacheKey(slug: string) {
  return `${CACHE_KEY_NAMESPACE.shortUrlSlug}:${slug}`;
}

function getShortUrlStatusCacheKey(userId: string, role: UserRole) {
  return `${CACHE_KEY_NAMESPACE.shortUrlStatus}:${role}:${userId}`;
}

function getShortUrlListCacheKey(
  userId: string,
  role: UserRole,
  page: number,
  size: number,
  userName: string,
  url: string,
  target: string,
) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
    userName,
    url,
    target,
  });

  return `${CACHE_KEY_NAMESPACE.shortUrlList}:${role}:${userId}:${query.toString()}`;
}

function getShortUrlListCachePrefix(userId: string, role: UserRole) {
  return `${CACHE_KEY_NAMESPACE.shortUrlList}:${role}:${userId}:`;
}

function getShortUrlStatusCacheInvalidationKeys(
  ownerUserIds: Array<string | null | undefined>,
) {
  const uniqueUserIds = [...new Set(ownerUserIds.filter(Boolean))] as string[];

  return [
    ...uniqueUserIds.map((userId) => getShortUrlStatusCacheKey(userId, "USER")),
    getShortUrlStatusCacheKey("admin", "ADMIN"),
  ];
}

async function invalidateShortUrlCaches({
  slugs = [],
  ownerUserIds = [],
}: {
  slugs?: Array<string | null | undefined>;
  ownerUserIds?: Array<string | null | undefined>;
}) {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))] as string[];
  const uniqueUserIds = [...new Set(ownerUserIds.filter(Boolean))] as string[];

  await Promise.all([
    ...uniqueSlugs.map((slug) => delCache(getShortUrlSlugCacheKey(slug))),
    ...getShortUrlStatusCacheInvalidationKeys(uniqueUserIds).map((key) => delCache(key)),
    ...uniqueUserIds.map((userId) => delCacheByPrefix(getShortUrlListCachePrefix(userId, "USER"))),
    delCacheByPrefix(getShortUrlListCachePrefix("admin", "ADMIN")),
  ]);
}

async function readShortUrlFromCache(
  slug: string,
): Promise<ShortUrlCacheValue | null> {
  const cacheKey = getShortUrlSlugCacheKey(slug);
  const cachedValue = await getCache<
    ShortUrlCacheValue | NegativeShortUrlCacheValue
  >(cacheKey);

  if (cachedValue !== null) {
    return "missing" in cachedValue ? null : cachedValue;
  }

  const shortUrl = await findShortUrlBySuffix(slug);
  if (!shortUrl) {
    await setCache(cacheKey, { missing: true }, CACHE_TTL.shortUrlNegative);
    return null;
  }

  await setCache(cacheKey, shortUrl, CACHE_TTL.shortUrl);
  return shortUrl;
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
  const cacheUserId = role === "ADMIN" ? "admin" : userId;
  const cacheKey = getShortUrlListCacheKey(
    cacheUserId,
    role,
    page,
    size,
    userName,
    url,
    target,
  );

  return getOrSetCache<UserShortUrlListResult>(cacheKey, CACHE_TTL.shortUrlList, () =>
    listUserShortUrls(userId, page, size, role, userName, url, target),
  );
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
): Promise<UrlStatusResult> {
  try {
    const cacheUserId = role === "ADMIN" ? "admin" : userId;
    return getOrSetCache<UrlStatusResult>(
      getShortUrlStatusCacheKey(cacheUserId, role),
      CACHE_TTL.shortUrlStatus,
      async () => {
        const urlRecords = await listUrlStatusRecords(userId, role);
        return calculateUrlStatusStats(urlRecords);
      },
    );
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
    await invalidateShortUrlCaches({
      slugs: [normalizedData.url],
      ownerUserIds: [normalizedData.userId],
    });
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

    await invalidateShortUrlCaches({
      slugs: [existingShortUrl?.url, normalizedData.url],
      ownerUserIds: [normalizedData.userId],
    });
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

    await invalidateShortUrlCaches({
      slugs: [existingShortUrl?.url, normalizedData.url],
      ownerUserIds: [normalizedData.userId, newUserId],
    });
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

    await invalidateShortUrlCaches({
      slugs: [existingShortUrl?.url],
      ownerUserIds: [shortUrl.userId, userId],
    });
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlVisibility(id: string, visible: number) {
  try {
    const existingShortUrl = await findShortUrlSlugById(id);
    const shortUrl = await updateShortUrlVisibilityState(id, visible);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    await invalidateShortUrlCaches({
      slugs: [existingShortUrl?.url],
      ownerUserIds: [shortUrl.userId],
    });
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function deleteUserShortUrl(userId: string, urlId: string) {
  const existingShortUrl = await findShortUrlSlugById(urlId);
  const deletedShortUrl = await removeUserShortUrl(userId, urlId);
  await invalidateShortUrlCaches({
    slugs: [existingShortUrl?.url],
    ownerUserIds: [deletedShortUrl?.userId, userId],
  });
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
