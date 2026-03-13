"use server";

import {
  and,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { userRecords, users } from "@/lib/db/schema";
import {
  createUserRecordSchema,
  updateUserRecordSchema,
} from "@/lib/validations/record";

type UserRole = "ADMIN" | "USER";
type UserInfo = {
  name: string | null;
  email: string | null;
};

export type UserRecordFormData = {
  id?: string;
  userId?: string;
  record_id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  proxied: boolean;
  proxiable: boolean;
  comment: string;
  tags: string;
  created_on?: string;
  modified_on?: string;
  active: number;
  user: UserInfo;
};

const generateId = () => crypto.randomUUID().replace(/-/g, "");

const toDate = (value?: string) => (value ? new Date(value) : null);

export async function createUserRecord(
  userId: string,
  data: Omit<UserRecordFormData, "user">,
) {
  try {
    const {
      record_id,
      zone_id,
      zone_name,
      name,
      type,
      content,
      ttl,
      proxied,
      proxiable,
      comment,
      tags,
      created_on,
      modified_on,
      active,
    } = createUserRecordSchema.parse(data);

    const [record] = await db
      .insert(userRecords)
      .values({
        id: generateId(),
        userId,
        record_id,
        zone_id,
        zone_name,
        name,
        type,
        content,
        ttl,
        proxied,
        proxiable,
        comment,
        tags,
        created_on: toDate(created_on),
        modified_on: toDate(modified_on),
        active,
      })
      .returning();

    return { status: "success", data: record };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserRecordReview(
  userId: string,
  id: string,
  data: Omit<UserRecordFormData, "user">,
) {
  try {
    const {
      record_id,
      zone_id,
      zone_name,
      name,
      type,
      content,
      ttl,
      proxied,
      proxiable,
      comment,
      tags,
      created_on,
      modified_on,
      active,
    } = createUserRecordSchema.parse(data);

    const [record] = await db
      .update(userRecords)
      .set({
        userId,
        record_id,
        zone_id,
        zone_name,
        name,
        type,
        content,
        ttl,
        proxied,
        proxiable,
        comment,
        tags,
        created_on: toDate(created_on),
        modified_on: toDate(modified_on),
        active,
      })
      .where(eq(userRecords.id, id))
      .returning();

    return { status: "success", data: record };
  } catch (error) {
    console.log(error);
    return { status: error };
  }
}

export async function getUserRecords(
  userId: string,
  active: number = 1,
  page: number,
  size: number,
  role: UserRole = "USER",
) {
  const whereClause = role === "USER" ? eq(userRecords.userId, userId) : undefined;

  let totalQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(userRecords)
    .$dynamic();
  let listQuery = db
    .select({
      id: userRecords.id,
      record_id: userRecords.record_id,
      zone_id: userRecords.zone_id,
      zone_name: userRecords.zone_name,
      name: userRecords.name,
      type: userRecords.type,
      content: userRecords.content,
      ttl: userRecords.ttl,
      proxied: userRecords.proxied,
      proxiable: userRecords.proxiable,
      comment: userRecords.comment,
      tags: userRecords.tags,
      created_on: userRecords.created_on,
      modified_on: userRecords.modified_on,
      active: userRecords.active,
      userId: userRecords.userId,
      user: {
        name: users.name,
        email: users.email,
      },
    })
    .from(userRecords)
    .leftJoin(users, eq(userRecords.userId, users.id))
    .orderBy(desc(userRecords.modified_on))
    .limit(size)
    .offset((page - 1) * size)
    .$dynamic();

  if (whereClause) {
    totalQuery = totalQuery.where(whereClause);
    listQuery = listQuery.where(whereClause);
  }

  const [[totalResult], list] = await Promise.all([totalQuery, listQuery]);

  return {
    total: Number(totalResult?.count ?? 0),
    list,
  };
}

export async function getUserRecordCount(
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

    const baseWhere = role === "USER" ? eq(userRecords.userId, userId) : undefined;

    const [totalRows, monthRows] = await Promise.all([
      baseWhere
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(userRecords)
            .where(baseWhere)
        : db.select({ count: sql<number>`count(*)` }).from(userRecords),
      baseWhere
        ? db
            .select({ count: sql<number>`count(*)` })
            .from(userRecords)
            .where(
              and(
                baseWhere,
                gte(userRecords.created_on, start),
                lte(userRecords.created_on, end),
              ),
            )
        : db
            .select({ count: sql<number>`count(*)` })
            .from(userRecords)
            .where(
              and(
                gte(userRecords.created_on, start),
                lte(userRecords.created_on, end),
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

export async function getUserRecordStatus(
  userId: string,
  role: UserRole = "USER",
) {
  const whereClause = role === "USER" ? eq(userRecords.userId, userId) : undefined;

  const [statusCounts, totalRows] = await Promise.all([
    whereClause
      ? db
          .select({
            active: userRecords.active,
            count: sql<number>`count(*)`,
          })
          .from(userRecords)
          .where(whereClause)
          .groupBy(userRecords.active)
      : db
          .select({
            active: userRecords.active,
            count: sql<number>`count(*)`,
          })
          .from(userRecords)
          .groupBy(userRecords.active),
    whereClause
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(userRecords)
          .where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(userRecords),
  ]);

  const counts = statusCounts.reduce(
    (acc, item) => {
      acc[item.active ?? 0] = Number(item.count ?? 0);
      return acc;
    },
    {} as Record<number, number>,
  );

  return {
    total: Number(totalRows[0]?.count ?? 0),
    inactive: counts[0] || 0,
    active: counts[1] || 0,
    pending: counts[2] || 0,
    rejected: counts[3] || 0,
  };
}

export async function getUserRecordByTypeNameContent(
  userId: string,
  type: string,
  name: string,
  content: string,
  zone_name: string,
  active: number = 1,
) {
  const conditions: SQL[] = [
    eq(userRecords.type, type),
    eq(userRecords.name, name),
    eq(userRecords.zone_name, zone_name),
    ne(userRecords.active, 3),
  ];

  return await db.select().from(userRecords).where(and(...conditions));
}

export async function deleteUserRecord(
  userId: string,
  record_id: string,
  zone_id: string,
  active: number = 1,
) {
  const [record] = await db
    .delete(userRecords)
    .where(
      and(
        eq(userRecords.userId, userId),
        eq(userRecords.record_id, record_id),
        eq(userRecords.zone_id, zone_id),
      ),
    )
    .returning();

  return record ?? null;
}

export async function updateUserRecord(
  userId: string,
  data: Omit<UserRecordFormData, "user">,
) {
  try {
    const {
      record_id,
      zone_id,
      zone_name,
      name,
      type,
      content,
      ttl,
      proxied,
      comment,
      tags,
      active,
    } = updateUserRecordSchema.parse(data);

    const [record] = await db
      .update(userRecords)
      .set({
        type,
        name,
        content,
        ttl,
        comment,
        tags,
        proxied,
        modified_on: toDate(data.modified_on),
      })
      .where(
        and(
          eq(userRecords.userId, userId),
          eq(userRecords.record_id, record_id),
          eq(userRecords.zone_id, zone_id),
          eq(userRecords.zone_name, zone_name),
        ),
      )
      .returning();

    return { status: "success", data: record };
  } catch (error) {
    return { status: error };
  }
}

export async function updateUserRecordState(
  userId: string,
  record_id: string,
  zone_id: string,
  active: number,
) {
  const [record] = await db
    .update(userRecords)
    .set({
      active,
    })
    .where(
      and(eq(userRecords.record_id, record_id), eq(userRecords.zone_id, zone_id)),
    )
    .returning();

  return record ?? null;
}
