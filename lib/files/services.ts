import { normalizeUserFileQueryOptions } from "./policies";
import {
  deleteExpiredSoftDeletedFiles,
  deleteUserFileRecord,
  getBucketStorageUsageData,
  getJoinedUserFileById,
  getUserFileByPathData,
  getUserFileByShortUrlIdData,
  getUserFileStatsData,
  insertUserFile,
  listUserFiles,
  softDeleteUserFileRecord,
  softDeleteUserFileRecords,
  updateUserFileRecord,
} from "./queries";
import type { CreateUserFileInput, QueryUserFileOptions, UpdateUserFileInput } from "./types";

export async function createUserFile(data: CreateUserFileInput) {
  try {
    const created = await insertUserFile(data);
    const userFile = created ? await getJoinedUserFileById(created.id) : null;
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Failed to create file record:", error);
    return { success: false, error: "Failed to create file record" };
  }
}

export async function getUserFileById(id: string) {
  try {
    const userFile = await getJoinedUserFileById(id);
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Failed to query file record:", error);
    return { success: false, error: "Failed to query file record" };
  }
}

export async function getUserFiles(options: QueryUserFileOptions = {}) {
  try {
    return await listUserFiles(normalizeUserFileQueryOptions(options));
  } catch (error) {
    console.error("[GetUserFiles Error]", error);
    return { success: false, error: "[GetUserFiles Error]" };
  }
}

export async function updateUserFile(id: string, data: UpdateUserFileInput) {
  try {
    const updated = await updateUserFileRecord(id, data);
    const userFile = updated ? await getJoinedUserFileById(updated.id) : null;
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Failed to update file record:", error);
    return { success: false, error: "Failed to update file record" };
  }
}

export async function softDeleteUserFile(id: string) {
  try {
    const userFile = await softDeleteUserFileRecord(id);
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Delete file record failed:", error);
    return { success: false, error: "Delete file record failed" };
  }
}

export async function softDeleteUserFiles(ids: string[]) {
  try {
    const result = await softDeleteUserFileRecords(ids);
    return { success: true, data: result };
  } catch (error) {
    console.error("Delete file records failed:", error);
    return { success: false, error: "Delete file records failed" };
  }
}

export async function deleteUserFile(id: string) {
  try {
    const userFile = await deleteUserFileRecord(id);
    return { success: true, data: userFile };
  } catch (error) {
    console.error("Delete file record failed:", error);
    return { success: false, error: "Delete file record failed" };
  }
}

export async function getUserFileStats(userId: string) {
  try {
    const data = await getUserFileStatsData(userId);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to get file statistics:", error);
    return { success: false, error: "Failed to get file statistics" };
  }
}

export async function getUserFileByPath(path: string, providerName?: string) {
  try {
    const data = await getUserFileByPathData(path, providerName);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to query file record:", error);
    return { success: false, error: "Failed to query file record" };
  }
}

export async function getUserFileByShortUrlId(shortUrlId: string) {
  try {
    const data = await getUserFileByShortUrlIdData(shortUrlId);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to query file record:", error);
    return { success: false, error: "Failed to query file record" };
  }
}

export async function cleanupExpiredFiles(days = 30) {
  try {
    const result = await deleteExpiredSoftDeletedFiles(days);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to clean up expired files:", error);
    return { success: false, error: "Failed to clean up expired files" };
  }
}

export async function getBucketStorageUsage(
  bucket: string,
  providerName: string,
  userId?: string,
): Promise<
  | { success: true; data: { totalSize: number; totalFiles: number } }
  | { success: false; error: string }
> {
  try {
    const data = await getBucketStorageUsageData(bucket, providerName, userId);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to get bucket storage usage:", error);
    return { success: false, error: "Failed to get bucket storage usage" };
  }
}
