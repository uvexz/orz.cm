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
import { getStartDate } from "@/lib/utils";

import { shouldRestrictShortUrlsToUser } from "./policies";
import type {
  ShortUrlFormData,
  ShortUrlMetaInput,
  ShortUrlStatusRecord,
  UserRole,
} from "./types";

const generateId = () => crypto.randomUUID().replace(/-/g, "");

function isUniqueViolation(error: unknown): error is { code: string } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

function toUniqueConstraintError() {
  const error = new Error("Unique constraint failed");
  (error as Error & { code?: string }).code = "UNIQUE_CONSTRAINT";
  return error;
}

function buildUserShortUrlWhere(
  userId: string,
  role: UserRole,
  userName: string,
  url: string,
  target: string,
) {
  const conditions: SQL[] = [];

  if (shouldRestrictShortUrlsToUser(role)) {
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

export async function listUserShortUrls(
  userId: string,
  page: number,
  size: number,
  role: UserRole,
  userName: string,
  url: string,
  target: string,
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

export async function countUserShortUrls(userId: string, role: UserRole) {
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
  const baseWhere = shouldRestrictShortUrlsToUser(role)
    ? eq(userUrls.userId, userId)
    : undefined;

  const [totalRows, monthRows] = await Promise.all([
    baseWhere
      ? db.select({ count: sql<number>`count(*)` }).from(userUrls).where(baseWhere)
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
            and(gte(userUrls.createdAt, start), lte(userUrls.createdAt, end)),
          ),
  ]);

  return {
    total: Number(totalRows[0]?.count ?? 0),
    month_total: Number(monthRows[0]?.count ?? 0),
  };
}

export async function findUserShortLinksByIds(ids: string[], userId?: string) {
  if (ids.length === 0) {
    return [];
  }

  const conditions: SQL[] = [inArray(userUrls.id, ids)];
  if (userId) {
    conditions.push(eq(userUrls.userId, userId));
  }

  return db
    .select()
    .from(userUrls)
    .where(and(...conditions));
}

export async function aggregateUrlClicksByIds(
  ids: string[],
  userId: string,
  role: UserRole,
) {
  if (ids.length === 0) {
    return [];
  }

  const conditions: SQL[] = [inArray(urlMetas.urlId, ids)];

  if (shouldRestrictShortUrlsToUser(role)) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(userUrls)
          .where(and(eq(userUrls.id, urlMetas.urlId), eq(userUrls.userId, userId))),
      ),
    );
  }

  return db
    .select({
      urlId: urlMetas.urlId,
      click: sql<number>`coalesce(sum(${urlMetas.click}), 0)`,
    })
    .from(urlMetas)
    .where(and(...conditions))
    .groupBy(urlMetas.urlId);
}

export async function listUrlStatusRecords(
  userId: string,
  role: UserRole,
): Promise<ShortUrlStatusRecord[]> {
  return shouldRestrictShortUrlsToUser(role)
    ? db
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
    : db
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
}

export async function insertUserShortUrl(data: ShortUrlFormData) {
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

    return shortUrl;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw toUniqueConstraintError();
    }

    throw error;
  }
}

export async function updateUserShortUrlByOwner(data: ShortUrlFormData) {
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

    return shortUrl ?? null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw toUniqueConstraintError();
    }

    throw error;
  }
}

export async function updateUserShortUrlByAdmin(
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

    return shortUrl ?? null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw toUniqueConstraintError();
    }

    throw error;
  }
}

export async function updateShortUrlActiveState(
  userId: string,
  id: string,
  active: number,
  role: UserRole,
) {
  const [shortUrl] = await db
    .update(userUrls)
    .set({
      active,
      updatedAt: new Date(),
    })
    .where(
      shouldRestrictShortUrlsToUser(role)
        ? and(eq(userUrls.id, id), eq(userUrls.userId, userId))
        : eq(userUrls.id, id),
    )
    .returning();

  return shortUrl ?? null;
}

export async function updateShortUrlVisibilityState(id: string, visible: number) {
  const [shortUrl] = await db
    .update(userUrls)
    .set({
      visible,
      updatedAt: new Date(),
    })
    .where(eq(userUrls.id, id))
    .returning();

  return shortUrl ?? null;
}

export async function removeUserShortUrl(userId: string, urlId: string) {
  const [shortUrl] = await db
    .delete(userUrls)
    .where(and(eq(userUrls.id, urlId), eq(userUrls.userId, userId)))
    .returning();

  return shortUrl ?? null;
}

export async function listUserUrlMetaInfo(urlId: string, dateRange = "") {
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

export async function findShortUrlBySuffix(suffix: string) {
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

export async function findShortUrlIdBySuffix(suffix: string) {
  const [shortUrl] = await db
    .select({ id: userUrls.id })
    .from(userUrls)
    .where(eq(userUrls.url, suffix))
    .limit(1);

  return shortUrl ?? null;
}

export async function findUrlMetaByIp(urlId: string, ip: string) {
  const [meta] = await db
    .select()
    .from(urlMetas)
    .where(and(eq(urlMetas.ip, ip), eq(urlMetas.urlId, urlId)))
    .limit(1);

  return meta ?? null;
}

export async function insertShortUrlMeta(data: ShortUrlMetaInput) {
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

export async function incrementUrlMetaClick(id: string) {
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

export async function listUrlMetaLiveLog(userId?: string) {
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

  return query;
}
