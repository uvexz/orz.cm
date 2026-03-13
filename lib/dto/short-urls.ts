import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  inArray,
  like,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { urlMetas, userUrls, users } from "@/lib/db/schema";

import { EXPIRATION_ENUMS } from "../enums";
import { getStartDate } from "../utils";

type UserRole = "ADMIN" | "USER";
type UrlMetaRow = typeof urlMetas.$inferSelect;
type UserUrlRow = typeof userUrls.$inferSelect;

const generateId = () => crypto.randomUUID().replace(/-/g, "");

function buildUserShortUrlWhere(
  userId: string,
  role: UserRole,
  userName: string,
  url: string,
  target: string,
) {
  const conditions: SQL[] = [];

  if (role === "USER") {
    conditions.push(eq(userUrls.userId, userId));
  }
  if (userName) {
    conditions.push(like(userUrls.userName, `%${userName}%`));
  }
  if (url) {
    conditions.push(like(userUrls.url, `%${url}%`));
  }
  if (target) {
    conditions.push(like(userUrls.target, `%${target}%`));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export interface ShortUrlFormData {
  id?: string;
  userId: string;
  userName: string;
  target: string;
  url: string;
  prefix: string;
  visible: number;
  active: number;
  expiration: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
  user?: {
    name: string;
    email: string;
  };
}

export interface UserShortUrlInfo extends ShortUrlFormData {
  meta?: UrlMetaRow;
}

export async function getUserShortUrls(
  userId: string,
  active: number = 1,
  page: number,
  size: number,
  role: UserRole = "USER",
  userName: string = "",
  url: string = "",
  target: string = "",
) {
  const whereClause = buildUserShortUrlWhere(userId, role, userName, url, target);

  let totalQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(userUrls)
    .$dynamic();
  let listQuery = db
    .select({
      userUrl: userUrls,
      name: users.name,
      email: users.email,
    })
    .from(userUrls)
    .leftJoin(users, eq(userUrls.userId, users.id))
    .orderBy(desc(userUrls.updatedAt))
    .limit(size)
    .offset((page - 1) * size)
    .$dynamic();

  if (whereClause) {
    totalQuery = totalQuery.where(whereClause);
    listQuery = listQuery.where(whereClause);
  }

  const [[totalResult], rows] = await Promise.all([totalQuery, listQuery]);

  return {
    total: Number(totalResult?.count ?? 0),
    list: rows.map((row) => ({
      ...row.userUrl,
      user: {
        name: row.name ?? "",
        email: row.email ?? "",
      },
    })),
  };
}

export async function getUserShortUrlCount(
  userId: string,
  active: number = 1,
  role: UserRole = "USER",
) {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const baseWhere = role === "USER" ? eq(userUrls.userId, userId) : undefined;

    const [totalRows, monthRows] = await Promise.all([
      baseWhere
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(userUrls)
            .where(baseWhere)
        : db.select({ count: sql<number>`count(*)` }).from(userUrls),
      baseWhere
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(userUrls)
            .where(
              and(
                baseWhere,
                gte(userUrls.createdAt, start),
                lte(userUrls.createdAt, end),
              ),
            )
        : db
            .select({ count: sql<number>`count(*)` })
            .from(userUrls)
            .where(
              and(
                gte(userUrls.createdAt, start),
                lte(userUrls.createdAt, end),
              ),
            ),
    ]);

    return {
      total: Number(totalRows[0]?.count ?? 0),
      month_total: Number(monthRows[0]?.count ?? 0),
    };
  } catch (error) {
    return { total: -1, month_total: -1 };
  }
}

export async function getUserShortLinksByIds(ids: string[], userId?: string) {
  try {
    if (ids.length === 0) {
      return [];
    }

    const conditions: SQL[] = [inArray(userUrls.id, ids)];
    if (userId) {
      conditions.push(eq(userUrls.userId, userId));
    }

    return await db
      .select()
      .from(userUrls)
      .where(and(...conditions));
  } catch (error) {
    return [];
  }
}

export async function getUrlClicksByIds(
  ids: string[],
  userId: string,
  role: UserRole,
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  try {
    const conditions: SQL[] = [inArray(urlMetas.urlId, ids)];

    if (role === "USER") {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(userUrls)
            .where(and(eq(userUrls.id, urlMetas.urlId), eq(userUrls.userId, userId))),
        ),
      );
    }

    const clicksData = await db
      .select({
        urlId: urlMetas.urlId,
        click: sql<number>`coalesce(sum(${urlMetas.click}), 0)`,
      })
      .from(urlMetas)
      .where(and(...conditions))
      .groupBy(urlMetas.urlId);

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

export async function getUrlStatus(userId: string, role: UserRole = "USER") {
  try {
  } catch (error) {
    return { status: error };
  }
}

export interface UrlStatusStats {
  total: number;
  actived: number;
  disabled: number;
  expired: number;
  passwordprotected: number;
}

function isValidExpirationValue(expiration: string): boolean {
  return EXPIRATION_ENUMS.some((item) => item.value === expiration);
}

export async function getUrlStatusOptimized(
  userId: string,
  role: UserRole = "USER",
): Promise<UrlStatusStats | { status: unknown }> {
  try {
    const urlRecords =
      role === "USER"
        ? await db
            .select({
              id: userUrls.id,
              userId: userUrls.userId,
              active: userUrls.active,
              expiration: userUrls.expiration,
              password: userUrls.password,
              createdAt: userUrls.createdAt,
              updatedAt: userUrls.updatedAt,
            })
            .from(userUrls)
            .where(eq(userUrls.userId, userId))
        : await db
            .select({
              id: userUrls.id,
              userId: userUrls.userId,
              active: userUrls.active,
              expiration: userUrls.expiration,
              password: userUrls.password,
              createdAt: userUrls.createdAt,
              updatedAt: userUrls.updatedAt,
            })
            .from(userUrls);

    const now = Date.now();
    const stats: UrlStatusStats = {
      total: urlRecords.length,
      actived: 0,
      disabled: 0,
      expired: 0,
      passwordprotected: 0,
    };

    urlRecords.forEach((record) => {
      const updatedAt = new Date(record.updatedAt || record.createdAt).getTime();

      let isExpired = false;
      if (
        record.expiration !== "-1" &&
        isValidExpirationValue(record.expiration)
      ) {
        const expirationMilliseconds = Number(record.expiration) * 1000;
        isExpired = now > updatedAt + expirationMilliseconds;
      }

      const isDisabled = record.active === 0;
      const hasPassword = Boolean(record.password && record.password.trim());

      if (isExpired) {
        stats.expired++;
      } else if (isDisabled) {
        stats.disabled++;
      } else if (hasPassword) {
        stats.passwordprotected++;
      } else {
        stats.actived++;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error getting URL status (optimized):", error);
    return { status: error };
  }
}

export async function createUserShortUrl(data: ShortUrlFormData) {
  try {
    const [shortUrl] = await db
      .insert(userUrls)
      .values({
        id: generateId(),
        userId: data.userId,
        userName: data.userName || "Anonymous",
        target: data.target,
        url: data.url,
        prefix: data.prefix,
        visible: data.visible,
        active: data.active,
        expiration: data.expiration,
        password: data.password,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrl(data: ShortUrlFormData) {
  try {
    const [shortUrl] = await db
      .update(userUrls)
      .set({
        target: data.target,
        url: data.url,
        visible: data.visible,
        prefix: data.prefix,
        expiration: data.expiration,
        password: data.password,
        updatedAt: new Date(),
      })
      .where(and(eq(userUrls.id, data.id!), eq(userUrls.userId, data.userId)))
      .returning();

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
    const [shortUrl] = await db
      .update(userUrls)
      .set({
        userId: newUserId,
        target: data.target,
        url: data.url,
        visible: data.visible,
        prefix: data.prefix,
        expiration: data.expiration,
        password: data.password,
        updatedAt: new Date(),
      })
      .where(and(eq(userUrls.id, data.id!), eq(userUrls.userId, data.userId)))
      .returning();

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
  active: number = 1,
  role: UserRole = "USER",
) {
  try {
    const [shortUrl] = await db
      .update(userUrls)
      .set({
        active,
        updatedAt: new Date(),
      })
      .where(
        role === "USER"
          ? and(eq(userUrls.id, id), eq(userUrls.userId, userId))
          : eq(userUrls.id, id),
      )
      .returning();

    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserShortUrlVisibility(
  id: string,
  visible: number,
) {
  try {
    const [shortUrl] = await db
      .update(userUrls)
      .set({
        visible,
        updatedAt: new Date(),
      })
      .where(eq(userUrls.id, id))
      .returning();

    if (!shortUrl) {
      throw new Error("Short URL not found");
    }

    return { status: "success", data: shortUrl };
  } catch (error) {
    return { status: error };
  }
}

export async function deleteUserShortUrl(userId: string, urlId: string) {
  const [shortUrl] = await db
    .delete(userUrls)
    .where(and(eq(userUrls.id, urlId), eq(userUrls.userId, userId)))
    .returning();

  return shortUrl ?? null;
}

export async function getUserUrlMetaInfo(
  urlId: string,
  dateRange: string = "",
) {
  const startDate = getStartDate(dateRange);
  const conditions: SQL[] = [eq(urlMetas.urlId, urlId)];

  if (startDate) {
    conditions.push(gte(urlMetas.createdAt, startDate));
  }

  return db
    .select()
    .from(urlMetas)
    .where(and(...conditions))
    .orderBy(asc(urlMetas.updatedAt));
}

export async function getUrlBySuffix(suffix: string) {
  const [shortUrl] = await db
    .select({
      id: userUrls.id,
      target: userUrls.target,
      active: userUrls.active,
      prefix: userUrls.prefix,
      expiration: userUrls.expiration,
      password: userUrls.password,
      updatedAt: userUrls.updatedAt,
    })
    .from(userUrls)
    .where(eq(userUrls.url, suffix))
    .limit(1);

  return shortUrl ?? null;
}

type ShortUrlMetaInput = Omit<UrlMetaRow, "id" | "createdAt" | "updatedAt">;

export async function createUserShortUrlMeta(data: ShortUrlMetaInput) {
  try {
    const meta = await findOrCreateUrlMeta(data);
    return { status: "success", data: meta };
  } catch (error) {
    console.error("create meta error", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function findOrCreateUrlMeta(data: ShortUrlMetaInput) {
  const [meta] = await db
    .select()
    .from(urlMetas)
    .where(and(eq(urlMetas.ip, data.ip), eq(urlMetas.urlId, data.urlId)))
    .limit(1);

  if (meta) {
    return incrementClick(meta.id);
  }

  const [createdMeta] = await db
    .insert(urlMetas)
    .values({
      id: generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return createdMeta;
}

async function incrementClick(id: string) {
  const [meta] = await db
    .update(urlMetas)
    .set({
      click: sql`${urlMetas.click} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(urlMetas.id, id))
    .returning();

  return meta;
}

export async function getUrlMetaLiveLog(userId?: string) {
  let query = db
    .select({
      ip: urlMetas.ip,
      click: urlMetas.click,
      updatedAt: urlMetas.updatedAt,
      createdAt: urlMetas.createdAt,
      city: urlMetas.city,
      country: urlMetas.country,
      os: urlMetas.os,
      cpu: urlMetas.cpu,
      engine: urlMetas.engine,
      slug: userUrls.url,
      target: userUrls.target,
    })
    .from(urlMetas)
    .innerJoin(userUrls, eq(urlMetas.urlId, userUrls.id))
    .orderBy(desc(urlMetas.updatedAt))
    .limit(10)
    .$dynamic();

  if (userId) {
    query = query.where(eq(userUrls.userId, userId));
  }

  const logs = await query;

  return logs.map((log) => ({
    ...log,
    slug: log.slug || "",
    target: log.target || "",
  }));
}
