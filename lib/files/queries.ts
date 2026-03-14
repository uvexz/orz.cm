import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { userFiles, users } from "@/lib/db/schema";
import { bytesToStorageValue, storageValueToBytes } from "@/lib/utils";

import type {
  CreateUserFileInput,
  QueryUserFileOptions,
  UpdateUserFileInput,
  UserFileData,
  UserFileRow,
} from "./types";

type UserFileColumnsRow = UserFileRow & {
  userName: string | null;
  userEmail: string | null;
};
type NormalizedQueryUserFileOptions = QueryUserFileOptions & {
  page: number;
  limit: number;
  orderBy: "createdAt" | "lastModified" | "size";
  order: "asc" | "desc";
};

const userFileColumns = getTableColumns(userFiles);

function generateId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function mapUserFileRow(row: UserFileColumnsRow): UserFileData {
  const { userName, userEmail, ...file } = row;
  return {
    ...file,
    user: {
      name: userName ?? "",
      email: userEmail ?? "",
    },
  };
}

function buildUserFileConditions(options: QueryUserFileOptions): SQL[] {
  const conditions: SQL[] = [];

  if (options.bucket) {
    conditions.push(eq(userFiles.bucket, options.bucket));
  }
  if (options.userId) {
    conditions.push(eq(userFiles.userId, options.userId));
  }
  if (options.providerName) {
    conditions.push(eq(userFiles.providerName, options.providerName));
  }
  if (options.status !== undefined) {
    conditions.push(eq(userFiles.status, options.status));
  }
  if (options.channel) {
    conditions.push(eq(userFiles.channel, options.channel));
  }
  if (options.platform) {
    conditions.push(eq(userFiles.platform, options.platform));
  }
  if (options.shortUrlId) {
    conditions.push(eq(userFiles.shortUrlId, options.shortUrlId));
  }
  if (options.name) {
    conditions.push(ilike(userFiles.name, `%${options.name}%`));
  }
  if (options.size) {
    conditions.push(gte(userFiles.size, bytesToStorageValue(options.size)));
  }
  if (options.mimeType) {
    conditions.push(ilike(userFiles.mimeType, `%${options.mimeType}%`));
  }

  return conditions;
}

export async function getJoinedUserFileById(id: string) {
  const [row] = await db
    .select({
      ...userFileColumns,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userFiles)
    .leftJoin(users, eq(userFiles.userId, users.id))
    .where(eq(userFiles.id, id))
    .limit(1);

  return row ? mapUserFileRow(row) : null;
}

export async function insertUserFile(data: CreateUserFileInput) {
  const [created] = await db
    .insert(userFiles)
    .values({
      id: generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: userFiles.id });

  return created ?? null;
}

export async function listUserFiles(options: NormalizedQueryUserFileOptions) {
  const {
    bucket,
    userId,
    providerName,
    page,
    limit,
    orderBy,
    order,
  } = options;

  const whereConditions = buildUserFileConditions(options);
  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;
  const orderColumn =
    orderBy === "size"
      ? userFiles.size
      : orderBy === "lastModified"
        ? userFiles.lastModified
        : userFiles.createdAt;
  const orderExpr = order === "asc" ? asc(orderColumn) : desc(orderColumn);

  let listQuery = db
    .select({
      ...userFileColumns,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userFiles)
    .leftJoin(users, eq(userFiles.userId, users.id))
    .orderBy(orderExpr)
    .limit(limit)
    .offset((page - 1) * limit)
    .$dynamic();

  let totalQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(userFiles)
    .$dynamic();

  if (whereClause) {
    listQuery = listQuery.where(whereClause);
    totalQuery = totalQuery.where(whereClause);
  }

  const [files, [totalResult], [totalSizeResult]] = await Promise.all([
    listQuery,
    totalQuery,
    db
      .select({
        totalSize: sql<number>`coalesce(sum(${userFiles.size}), 0)`,
        totalFiles: sql<number>`count(${userFiles.id})`,
      })
      .from(userFiles)
      .where(
        and(
          eq(userFiles.bucket, bucket ?? ""),
          eq(userFiles.providerName, providerName ?? ""),
          eq(userFiles.status, 1),
          ...(userId ? [eq(userFiles.userId, userId)] : []),
        ),
      ),
  ]);

  return {
    total: Number(totalResult?.count ?? 0),
    totalSize: storageValueToBytes(Number(totalSizeResult?.totalSize ?? 0)),
    totalFiles: Number(totalSizeResult?.totalFiles ?? 0),
    list: files.map((file) => mapUserFileRow(file)),
  };
}

export async function updateUserFileRecord(id: string, data: UpdateUserFileInput) {
  const [updated] = await db
    .update(userFiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(userFiles.id, id))
    .returning({ id: userFiles.id });

  return updated ?? null;
}

export async function softDeleteUserFileRecord(id: string) {
  const [userFile] = await db
    .update(userFiles)
    .set({
      status: 0,
      updatedAt: new Date(),
    })
    .where(eq(userFiles.id, id))
    .returning();

  return userFile ?? null;
}

export async function softDeleteUserFileRecords(ids: string[]) {
  const result = await db
    .update(userFiles)
    .set({
      status: 0,
      updatedAt: new Date(),
    })
    .where(inArray(userFiles.id, ids))
    .returning({ id: userFiles.id });

  return { count: result.length };
}

export async function deleteUserFileRecord(id: string) {
  const [userFile] = await db
    .delete(userFiles)
    .where(eq(userFiles.id, id))
    .returning();

  return userFile ?? null;
}

export async function getUserFileStatsData(userId: string) {
  const [totalFilesRows, totalSizeRows, filesByProviderRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(userFiles)
      .where(and(eq(userFiles.userId, userId), eq(userFiles.status, 1))),
    db
      .select({ totalSize: sql<number>`coalesce(sum(${userFiles.size}), 0)` })
      .from(userFiles)
      .where(and(eq(userFiles.userId, userId), eq(userFiles.status, 1))),
    db
      .select({
        providerName: userFiles.providerName,
        count: sql<number>`count(${userFiles.id})`,
        totalSize: sql<number>`coalesce(sum(${userFiles.size}), 0)`,
      })
      .from(userFiles)
      .where(and(eq(userFiles.userId, userId), eq(userFiles.status, 1)))
      .groupBy(userFiles.providerName),
  ]);

  return {
    totalFiles: Number(totalFilesRows[0]?.count ?? 0),
    totalSize: storageValueToBytes(Number(totalSizeRows[0]?.totalSize ?? 0)),
    filesByProvider: filesByProviderRows.map((row) => ({
      providerName: row.providerName,
      _count: { id: Number(row.count ?? 0) },
      _sum: { size: Number(row.totalSize ?? 0) },
    })),
  };
}

export async function getUserFileByPathData(path: string, providerName?: string) {
  const conditions: SQL[] = [eq(userFiles.path, path), eq(userFiles.status, 1)];
  if (providerName) {
    conditions.push(eq(userFiles.providerName, providerName));
  }

  const [row] = await db
    .select({
      ...userFileColumns,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userFiles)
    .leftJoin(users, eq(userFiles.userId, users.id))
    .where(and(...conditions))
    .limit(1);

  return row ? mapUserFileRow(row) : null;
}

export async function getUserFileByShortUrlIdData(shortUrlId: string) {
  const [row] = await db
    .select({
      ...userFileColumns,
      userName: users.name,
      userEmail: users.email,
    })
    .from(userFiles)
    .leftJoin(users, eq(userFiles.userId, users.id))
    .where(and(eq(userFiles.shortUrlId, shortUrlId), eq(userFiles.status, 1)))
    .limit(1);

  return row ? mapUserFileRow(row) : null;
}

export async function deleteExpiredSoftDeletedFiles(days: number) {
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - days);

  const result = await db
    .delete(userFiles)
    .where(and(eq(userFiles.status, 0), lt(userFiles.updatedAt, expiredDate)))
    .returning({ id: userFiles.id });

  return { count: result.length };
}

export async function getBucketStorageUsageData(
  bucket: string,
  providerName: string,
  userId?: string,
) {
  const [result] = await db
    .select({
      totalSize: sql<number>`coalesce(sum(${userFiles.size}), 0)`,
      totalFiles: sql<number>`count(${userFiles.id})`,
    })
    .from(userFiles)
    .where(
      and(
        eq(userFiles.bucket, bucket),
        eq(userFiles.providerName, providerName),
        eq(userFiles.status, 1),
        ...(userId ? [eq(userFiles.userId, userId)] : []),
      ),
    );

  return {
    totalSize: storageValueToBytes(Number(result?.totalSize ?? 0)),
    totalFiles: Number(result?.totalFiles ?? 0),
  };
}
