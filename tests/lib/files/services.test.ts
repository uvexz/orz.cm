import { beforeEach, describe, expect, it, mock } from "bun:test";
import { forbidden, unauthorized } from "@/lib/api/errors";

import type { QueryUserFileOptions } from "@/lib/files/types";
import type { NextRequest } from "next/server";

const queryState: {
  listResult: unknown;
  listError: unknown;
  pathResult: unknown;
  deleteResult: unknown;
  softDeleteManyResult: unknown;
  lastListArg: QueryUserFileOptions | null;
  lastDeleteId: string | null;
  lastSoftDeleteIds: string[] | null;
} = {
  listResult: { success: true, list: [] },
  listError: null,
  pathResult: { id: "file_1", path: "2026/03/demo.png" },
  deleteResult: { id: "file_1", deletedAt: new Date("2026-03-14T00:00:00.000Z") },
  softDeleteManyResult: { count: 2 },
  lastListArg: null,
  lastDeleteId: null,
  lastSoftDeleteIds: null,
};

const authState: {
  currentUser:
    | {
        id: string;
        role: "ADMIN" | "USER";
        team: string;
        active: number;
        name: string;
      }
    | null;
  signedUrl: string;
  deletedKeys: Array<{ key: string; bucket: string }>;
  lastSignedUrlArgs: unknown[];
} = {
  currentUser: {
    id: "user_1",
    role: "USER",
    team: "free",
    active: 1,
    name: "Test User",
  },
  signedUrl: "https://download.example.com/demo.png",
  deletedKeys: [],
  lastSignedUrlArgs: [],
};

const providerConfig = {
  channel: "r2",
  platform: "cloudflare",
  provider_name: "main-r2",
  endpoint: "https://r2.example.com",
  access_key_id: "access-key",
  secret_access_key: "secret-key",
  buckets: ["assets"],
};

mock.module("@/lib/files/queries", () => ({
  deleteExpiredSoftDeletedFiles: async () => ({ count: 0 }),
  deleteUserFileRecord: async (id: string) => {
    queryState.lastDeleteId = id;
    return queryState.deleteResult;
  },
  getBucketStorageUsageData: async () => ({ totalSize: 0, totalFiles: 0 }),
  getJoinedUserFileById: async () => null,
  getUserFileByPathData: async () => queryState.pathResult,
  getUserFileByShortUrlIdData: async () => null,
  getUserFileStatsData: async () => ({ totalSize: 0, totalFiles: 0 }),
  insertUserFile: async () => null,
  listUserFiles: async (options: QueryUserFileOptions) => {
    queryState.lastListArg = options;

    if (queryState.listError) {
      throw queryState.listError;
    }

    return queryState.listResult;
  },
  softDeleteUserFileRecord: async () => null,
  softDeleteUserFileRecords: async (ids: string[]) => {
    queryState.lastSoftDeleteIds = ids;
    return queryState.softDeleteManyResult;
  },
  updateUserFileRecord: async () => null,
}));

mock.module("@/lib/session", () => ({
  getCurrentUser: async () => authState.currentUser,
}));

mock.module("@/lib/dto/user", () => ({
  checkUserStatus: (
    user:
      | {
          id: string;
          role: "ADMIN" | "USER";
          team: string;
          active: number;
          name: string;
        }
      | null
      | undefined,
  ) => {
    if (!user?.id) {
      throw unauthorized("Unauthorized");
    }

    if (user.active === 0) {
      throw forbidden("Forbidden");
    }

    return user;
  },
}));

mock.module("@/lib/api/storage", () => ({
  getS3ConfigListOrThrow: async () => [providerConfig],
  getS3ProviderConfigOrThrow: () => providerConfig,
  assertS3BucketExists: () => undefined,
}));

mock.module("@/lib/s3", () => ({
  createS3Client: () => ({ id: "mock-s3-client" }),
  deleteFile: async (key: string, _client: unknown, bucket: string) => {
    authState.deletedKeys.push({ key, bucket });
  },
  getSignedUrlForDownload: async (...args: unknown[]) => {
    authState.lastSignedUrlArgs = args;
    return authState.signedUrl;
  },
}));

const { deleteUserFile, getUserFileByPath, getUserFiles } = await import(
  "@/lib/files/services"
);
const { DELETE, GET, POST } = await import("@/app/api/storage/s3/files/route");

const routeContext = {
  params: Promise.resolve({}),
};

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as NextRequest;
}

describe("lib/files/services", () => {
  beforeEach(() => {
    queryState.listResult = { success: true, list: [] };
    queryState.listError = null;
    queryState.pathResult = { id: "file_1", path: "2026/03/demo.png" };
    queryState.deleteResult = {
      id: "file_1",
      deletedAt: new Date("2026-03-14T00:00:00.000Z"),
    };
    queryState.softDeleteManyResult = { count: 2 };
    queryState.lastListArg = null;
    queryState.lastDeleteId = null;
    queryState.lastSoftDeleteIds = null;
    authState.currentUser = {
      id: "user_1",
      role: "USER",
      team: "free",
      active: 1,
      name: "Test User",
    };
    authState.signedUrl = "https://download.example.com/demo.png";
    authState.deletedKeys = [];
    authState.lastSignedUrlArgs = [];
  });

  it("normalizes file list queries before hitting the data layer", async () => {
    const result = await getUserFiles({ bucket: "assets", userId: "user_1" });

    expect(result).toEqual(queryState.listResult);
    expect(queryState.lastListArg).toEqual({
      bucket: "assets",
      userId: "user_1",
      page: 1,
      limit: 20,
      orderBy: "createdAt",
      order: "desc",
    });
  });

  it("loads file records by storage path", async () => {
    expect(await getUserFileByPath("2026/03/demo.png", "r2")).toEqual({
      success: true,
      data: queryState.pathResult,
    });
  });

  it("deletes file records", async () => {
    expect(await deleteUserFile("file_1")).toEqual({
      success: true,
      data: queryState.deleteResult,
    });
    expect(queryState.lastDeleteId).toBe("file_1");
  });

  it("lists files through the storage route", async () => {
    queryState.listResult = {
      success: true,
      list: [{ id: "file_1", path: "2026/03/demo.png" }],
    };

    const response = await GET(
      makeRequest(
        "http://localhost/api/storage/s3/files?page=2&pageSize=50&bucket=assets&provider=main-r2&name=demo&mimeType=image/png&fileSize=1024",
      ),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(queryState.listResult);
    expect(queryState.lastListArg).toEqual({
      page: 2,
      limit: 50,
      bucket: "assets",
      userId: "user_1",
      status: 1,
      channel: "r2",
      platform: "cloudflare",
      providerName: "main-r2",
      name: "demo",
      size: 1024,
      mimeType: "image/png",
      orderBy: "createdAt",
      order: "desc",
    });
  });

  it("generates signed download URLs through the storage route", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/storage/s3/files", {
        method: "POST",
        body: JSON.stringify({
          key: "2026/03/demo.png",
          bucket: "assets",
          provider: "main-r2",
        }),
        headers: { "content-type": "application/json" },
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ signedUrl: authState.signedUrl });
    expect(authState.lastSignedUrlArgs[0]).toBe("2026/03/demo.png");
    expect(authState.lastSignedUrlArgs[2]).toBe("assets");
  });

  it("deletes storage objects and soft-deletes their records through the route", async () => {
    const response = await DELETE(
      makeRequest("http://localhost/api/storage/s3/files", {
        method: "DELETE",
        body: JSON.stringify({
          keys: ["2026/03/demo.png", "2026/03/other.png"],
          ids: ["file_1", "file_2"],
          bucket: "assets",
          provider: "main-r2",
        }),
        headers: { "content-type": "application/json" },
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "File deleted successfully",
    });
    expect(authState.deletedKeys).toEqual([
      { key: "2026/03/demo.png", bucket: "assets" },
      { key: "2026/03/other.png", bucket: "assets" },
    ]);
    expect(queryState.lastSoftDeleteIds).toEqual(["file_1", "file_2"]);
  });
});
