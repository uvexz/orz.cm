import { and, desc, eq, getTableColumns, gte, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { scrapeMetas, users } from "@/lib/db/schema";

import { getStartDate } from "../utils";

type ScrapeMetaRow = typeof scrapeMetas.$inferSelect;
type ScrapeLogRow = ScrapeMetaRow & {
  userName: string | null;
  userEmail: string | null;
};

const scrapeColumns = getTableColumns(scrapeMetas);

function generateId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function mapScrapeLogRow(row: ScrapeLogRow) {
  const { userName, userEmail, ...log } = row;
  return {
    ...log,
    user: {
      name: userName,
      email: userEmail,
    },
  };
}

export async function createScrapeMeta(
  data: Omit<ScrapeMetaRow, "id" | "createdAt" | "updatedAt">,
) {
  try {
    const meta = await findOrCreateScrapeMeta(data);
    return { status: "success", data: meta };
  } catch (error) {
    console.error("create meta error", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "create meta error",
    };
  }
}

async function findOrCreateScrapeMeta(
  data: Omit<ScrapeMetaRow, "id" | "createdAt" | "updatedAt">,
) {
  const [meta] = await db
    .select()
    .from(scrapeMetas)
    .where(
      and(
        eq(scrapeMetas.ip, data.ip),
        eq(scrapeMetas.type, data.type),
        eq(scrapeMetas.link, data.link),
      ),
    )
    .limit(1);

  if (meta) {
    return incrementClick(meta.id);
  }

  const [created] = await db
    .insert(scrapeMetas)
    .values({
      id: generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created ?? null;
}

async function incrementClick(id: string) {
  const [updated] = await db
    .update(scrapeMetas)
    .set({
      click: sql`${scrapeMetas.click} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(scrapeMetas.id, id))
    .returning();

  return updated ?? null;
}

export async function getScrapeStatsByType(
  type: string,
  dateRange: string = "",
) {
  const startDate = getStartDate(dateRange);
  const conditions = [eq(scrapeMetas.type, type)];

  if (startDate) {
    conditions.push(gte(scrapeMetas.createdAt, startDate));
  }

  return db
    .select()
    .from(scrapeMetas)
    .where(and(...conditions));
}

export async function getScrapeStatsByTypeAndUserId(type: string, id: string) {
  return db
    .select()
    .from(scrapeMetas)
    .where(and(eq(scrapeMetas.type, type), eq(scrapeMetas.userId, id)));
}

export async function getScrapeStatsByUserId({
  userId,
  page = 1,
  limit = 20,
  type,
  ip,
}: {
  userId: string;
  page?: number;
  limit?: number;
  type?: string;
  ip?: string;
}) {
  const skip = (page - 1) * limit;
  const conditions = [eq(scrapeMetas.userId, userId)];

  if (type) {
    conditions.push(eq(scrapeMetas.type, type));
  }
  if (ip) {
    conditions.push(eq(scrapeMetas.ip, ip));
  }

  const [countRows, logs] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(scrapeMetas)
      .where(and(...conditions)),
    db
      .select({
        ...scrapeColumns,
        userName: users.name,
        userEmail: users.email,
      })
      .from(scrapeMetas)
      .leftJoin(users, eq(scrapeMetas.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(scrapeMetas.createdAt))
      .limit(limit)
      .offset(skip),
  ]);

  const total = Number(countRows[0]?.count ?? 0);
  const mappedLogs = logs.map((log) => mapScrapeLogRow(log));

  return {
    logs: mappedLogs,
    total,
    hasMore: total > skip + mappedLogs.length,
  };
}

export async function getScrapeStatsByUserId1(userId: string) {
  return db
    .select()
    .from(scrapeMetas)
    .where(eq(scrapeMetas.userId, userId))
    .orderBy(scrapeMetas.updatedAt);
}

export async function getScrapeStats({
  page = 1,
  limit = 20,
  type,
  ip,
  name,
  email,
}: {
  page?: number;
  limit?: number;
  type?: string;
  ip?: string;
  name?: string;
  email?: string;
}) {
  const skip = (page - 1) * limit;
  const conditions: SQL[] = [];

  if (type) {
    conditions.push(eq(scrapeMetas.type, type));
  }
  if (ip) {
    conditions.push(eq(scrapeMetas.ip, ip));
  }
  if (name) {
    conditions.push(eq(users.name, name));
  }
  if (email) {
    conditions.push(eq(users.email, email));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  let countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(scrapeMetas)
    .leftJoin(users, eq(scrapeMetas.userId, users.id))
    .$dynamic();
  let listQuery = db
    .select({
      ...scrapeColumns,
      userName: users.name,
      userEmail: users.email,
    })
    .from(scrapeMetas)
    .leftJoin(users, eq(scrapeMetas.userId, users.id))
    .orderBy(desc(scrapeMetas.createdAt))
    .limit(limit)
    .offset(skip)
    .$dynamic();

  if (whereClause) {
    countQuery = countQuery.where(whereClause);
    listQuery = listQuery.where(whereClause);
  }

  const [[countResult], logs] = await Promise.all([countQuery, listQuery]);
  const total = Number(countResult?.count ?? 0);
  const mappedLogs = logs.map((log) => mapScrapeLogRow(log));

  return {
    logs: mappedLogs,
    total,
    hasMore: total > skip + mappedLogs.length,
  };
}
