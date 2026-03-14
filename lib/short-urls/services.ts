import { calculateUrlStatusStats } from "./policies";
import {
  aggregateUrlClicksByIds,
  countUserShortUrls,
  findShortUrlBySuffix,
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
    const shortUrl = await insertUserShortUrl(data);
    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrl(data: ShortUrlFormData) {
  try {
    const shortUrl = await updateUserShortUrlByOwner(data);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

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
    const shortUrl = await updateUserShortUrlByAdmin(data, newUserId);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

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
    const shortUrl = await updateShortUrlActiveState(userId, id, active, role);
    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

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
  return removeUserShortUrl(userId, urlId);
}

export async function getUserUrlMetaInfo(urlId: string, dateRange = "") {
  return listUserUrlMetaInfo(urlId, dateRange);
}

export async function getUrlBySuffix(suffix: string) {
  return findShortUrlBySuffix(suffix);
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
