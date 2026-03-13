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

import { db } from "../db";
import { userFiles, users } from "../db/schema";
import { bytesToStorageValue, storageValueToBytes } from "../utils";

type UserFileRow = typeof userFiles.$inferSelect;
type UserFileColumnsRow = UserFileRow & {
  userName: string | null;
  userEmail: string | null;
};

const userFileColumns = getTableColumns(userFiles);

export interface UserFileData extends UserFileRow {
  user: {
    name: string;
    email: string;
  };
}

export interface CreateUserFileInput {
  userId: string;
  name: string;
  originalName?: string;
  mimeType: string;
  size: number;
  path: string;
  etag?: string;
  storageClass?: string;
  channel: string;
  platform: string;
  providerName: string;
  bucket: string;
  shortUrlId?: string;
  lastModified: Date;
}

export interface UpdateUserFileInput {
  name?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  etag?: string;
  storageClass?: string;
  channel?: string;
  platform?: string;
  providerName?: string;
  bucket?: string;
  shortUrlId?: string;
  status?: number;
  lastModified?: Date;
}

export interface QueryUserFileOptions {
  bucket?: string;
  userId?: string;
  providerName?: string;
  status?: number;
  channel?: string;
  platform?: string;
  shortUrlId?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  page?: number;
  limit?: number;
  orderBy?: "createdAt" | "lastModified" | "size";
  order?: "asc" | "desc";
}

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

async function getJoinedUserFileById(id: string) {
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

// 创建文件记录
export async function createUserFile(data: CreateUserFileInput) {
  try {
    const [created] = await db
      .insert(userFiles)
      .values({
        id: generateId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: userFiles.id });

    const userFile = created ? await getJoinedUserFileById(created.id) : null;
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Failed to create file record:", error);
    return { success: false, error: "Failed to create file record" };
  }
}

// 根据ID查询文件记录
export async function getUserFileById(id: string) {
  try {
    const userFile = await getJoinedUserFileById(id);
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Failed to query file record:", error);
    return { success: false, error: "Failed to query file record" };
  }
}

// 条件查询文件记录
export async function getUserFiles(options: QueryUserFileOptions = {}) {
  try {
    const {
      bucket,
      userId,
      providerName,
      page = 1,
      limit = 20,
      orderBy = "createdAt",
      order = "desc",
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
  } catch (error) {
    console.error("[GetUserFiles Error]", error);
    return { success: false, error: "[GetUserFiles Error]" };
  }
}

// 更新文件记录
export async function updateUserFile(id: string, data: UpdateUserFileInput) {
  try {
    const [updated] = await db
      .update(userFiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userFiles.id, id))
      .returning({ id: userFiles.id });

    const userFile = updated ? await getJoinedUserFileById(updated.id) : null;
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Failed to update file record:", error);
    return { success: false, error: "Failed to update file record" };
  }
}

// 软删除文件记录
export async function softDeleteUserFile(id: string) {
  try {
    const [userFile] = await db
      .update(userFiles)
      .set({
        status: 0,
        updatedAt: new Date(),
      })
      .where(eq(userFiles.id, id))
      .returning();

    return { success: true, data: userFile ?? null };
  } catch (error) {
    console.error("Delete file record failed:", error);
    return { success: false, error: "Delete file record failed" };
  }
}

// 批量软删除
export async function softDeleteUserFiles(ids: string[]) {
  try {
    const result = await db
      .update(userFiles)
      .set({
        status: 0,
        updatedAt: new Date(),
      })
      .where(inArray(userFiles.id, ids))
      .returning({ id: userFiles.id });

    return { success: true, data: { count: result.length } };
  } catch (error) {
    console.error("Delete file records failed:", error);
    return { success: false, error: "Delete file records failed" };
  }
}

// 物理删除文件记录
export async function deleteUserFile(id: string) {
  try {
    const [userFile] = await db
      .delete(userFiles)
      .where(eq(userFiles.id, id))
      .returning();

    return { success: true, data: userFile ?? null };
  } catch (error) {
    console.error("Delete file record failed:", error);
    return { success: false, error: "Delete file record failed" };
  }
}

// 获取用户文件统计
export async function getUserFileStats(userId: string) {
  try {
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
      success: true,
      data: {
        totalFiles: Number(totalFilesRows[0]?.count ?? 0),
        totalSize: storageValueToBytes(Number(totalSizeRows[0]?.totalSize ?? 0)),
        filesByProvider: filesByProviderRows.map((row) => ({
          providerName: row.providerName,
          _count: { id: Number(row.count ?? 0) },
          _sum: { size: Number(row.totalSize ?? 0) },
        })),
      },
    };
  } catch (error) {
    console.error("Failed to get file statistics:", error);
    return { success: false, error: "Failed to get file statistics" };
  }
}

// 根据路径查找文件
export async function getUserFileByPath(path: string, providerName?: string) {
  try {
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

    return { success: true, data: row ? mapUserFileRow(row) : null };
  } catch (error) {
    console.error("Failed to query file record:", error);
    return { success: false, error: "Failed to query file record" };
  }
}

// 根据短链接ID查询文件
export async function getUserFileByShortUrlId(shortUrlId: string) {
  try {
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

    return { success: true, data: row ? mapUserFileRow(row) : null };
  } catch (error) {
    console.error("Failed to query file record:", error);
    return { success: false, error: "Failed to query file record" };
  }
}

// 清理过期文件记录
export async function cleanupExpiredFiles(days: number = 30) {
  try {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - days);

    const result = await db
      .delete(userFiles)
      .where(and(eq(userFiles.status, 0), lt(userFiles.updatedAt, expiredDate)))
      .returning({ id: userFiles.id });

    return { success: true, data: { count: result.length } };
  } catch (error) {
    console.error("Failed to clean up expired files:", error);
    return { success: false, error: "Failed to clean up expired files" };
  }
}

// 获取特定存储桶的使用量统计
export async function getBucketStorageUsage(
  bucket: string,
  providerName: string,
  userId?: string,
): Promise<
  | { success: true; data: { totalSize: number; totalFiles: number } }
  | { success: false; error: string }
> {
  try {
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
      success: true,
      data: {
        totalSize: storageValueToBytes(Number(result?.totalSize ?? 0)),
        totalFiles: Number(result?.totalFiles ?? 0),
      },
    };
  } catch (error) {
    console.error("Failed to get bucket storage usage:", error);
    return { success: false, error: "Failed to get bucket storage usage" };
  }
}
