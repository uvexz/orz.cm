import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { forbidden, unauthorized } from "@/lib/api/errors";

import type { ShortUrlFormData, ShortUrlStatusRecord } from "@/lib/short-urls/types";
import type { NextRequest } from "next/server";

const sampleShortUrl: ShortUrlFormData = {
  id: "url_1",
  userId: "user_1",
  userName: "Alice",
  target: "https://example.com",
  url: "demo",
  prefix: "go",
  visible: 1,
  active: 1,
  expiration: "-1",
  password: "",
};

const queryState: {
  insertResult: unknown;
  insertError: unknown;
  existingShortUrl: { id: string } | null;
  existingShortUrlById: { id: string; url: string } | null;
  shortUrlBySuffix: {
    id: string;
    target: string;
    active: number;
    prefix: string;
    expiration: string;
    password: string;
    updatedAt: Date;
  } | null;
  updateOwnerResult: unknown;
  updateAdminResult: unknown;
  updateActiveResult: { id: string; active: number; userId: string } | null;
  updateVisibilityResult: { id: string; visible: number; userId: string } | null;
  removeResult: { success?: boolean; userId?: string } | null;
  listResult: unknown;
  statusRecords: ShortUrlStatusRecord[];
  aggregateClicksResult: Array<{ urlId: string; click: number }>;
  aggregateClicksError: unknown;
  lastInsertArg: ShortUrlFormData | null;
  lastUpdateOwnerArg: ShortUrlFormData | null;
  lastDeleteArgs: [string, string] | null;
  lastListArgs: unknown[];
  lastAggregateArgs: unknown[];
  listCallCount: number;
  statusCallCount: number;
  suffixLookupCount: number;
} = {
  insertResult: { id: "url_1" },
  insertError: null,
  existingShortUrl: null,
  existingShortUrlById: { id: "url_1", url: "demo" },
  shortUrlBySuffix: null,
  updateOwnerResult: { id: "url_1", target: "https://updated.example.com" },
  updateAdminResult: null,
  updateActiveResult: null,
  updateVisibilityResult: null,
  removeResult: { success: true, userId: "user_1" },
  listResult: { list: [{ id: "url_1", url: "demo" }], total: 1 },
  statusRecords: [],
  aggregateClicksResult: [],
  aggregateClicksError: null,
  lastInsertArg: null,
  lastUpdateOwnerArg: null,
  lastDeleteArgs: null,
  lastListArgs: [],
  lastAggregateArgs: [],
  listCallCount: 0,
  statusCallCount: 0,
  suffixLookupCount: 0,
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
} = {
  currentUser: {
    id: "user_1",
    role: "USER",
    team: "free",
    active: 1,
    name: "Test User",
  },
};

mock.module("@/lib/short-urls/queries", () => ({
  aggregateUrlClicksByIds: async (...args: unknown[]) => {
    queryState.lastAggregateArgs = args;

    if (queryState.aggregateClicksError) {
      throw queryState.aggregateClicksError;
    }

    return queryState.aggregateClicksResult;
  },
  countUserShortUrls: async () => ({ total: 0, month_total: 0 }),
  findShortUrlIdBySuffix: async () => queryState.existingShortUrl,
  findShortUrlBySuffix: async () => {
    queryState.suffixLookupCount += 1;
    return queryState.shortUrlBySuffix;
  },
  findShortUrlSlugById: async () => queryState.existingShortUrlById,
  findUrlMetaByIp: async () => null,
  findUserShortLinksByIds: async () => [],
  incrementUrlMetaClick: async () => null,
  insertShortUrlMeta: async () => null,
  insertUserShortUrl: async (data: ShortUrlFormData) => {
    queryState.lastInsertArg = data;

    if (queryState.insertError) {
      throw queryState.insertError;
    }

    return queryState.insertResult;
  },
  listUrlMetaLiveLog: async () => [],
  listUrlStatusRecords: async () => {
    queryState.statusCallCount += 1;
    return queryState.statusRecords;
  },
  listUserShortUrls: async (...args: unknown[]) => {
    queryState.lastListArgs = args;
    queryState.listCallCount += 1;
    return queryState.listResult;
  },
  listUserUrlMetaInfo: async () => [],
  removeUserShortUrl: async (userId: string, urlId: string) => {
    queryState.lastDeleteArgs = [userId, urlId];
    return queryState.removeResult;
  },
  updateShortUrlActiveState: async () => queryState.updateActiveResult,
  updateShortUrlVisibilityState: async () => queryState.updateVisibilityResult,
  updateUserShortUrlByAdmin: async () => queryState.updateAdminResult,
  updateUserShortUrlByOwner: async (data: ShortUrlFormData) => {
    queryState.lastUpdateOwnerArg = data;
    return queryState.updateOwnerResult;
  },
}));

const cacheState: {
  values: Map<string, unknown>;
  ttlByKey: Map<string, number>;
  lastDeletedKeys: string[];
  lastDeletedPrefixes: string[];
  redisAvailable: boolean;
} = {
  values: new Map(),
  ttlByKey: new Map(),
  lastDeletedKeys: [],
  lastDeletedPrefixes: [],
  redisAvailable: true,
};

mock.module("@/lib/cache", () => ({
  CACHE_KEY_NAMESPACE: {
    shortUrlSlug: "short-url:slug",
    shortUrlList: "short-url:list",
    shortUrlStatus: "short-url:status",
  },
  CACHE_TTL: {
    shortUrl: 600,
    shortUrlNegative: 60,
    shortUrlList: 60,
    shortUrlStatus: 60,
    dto: 3600,
  },
  delCache: async (key: string) => {
    cacheState.lastDeletedKeys.push(key);
    cacheState.values.delete(key);
    cacheState.ttlByKey.delete(key);
  },
  delCacheByPrefix: async (prefix: string) => {
    cacheState.lastDeletedPrefixes.push(prefix);
    for (const key of [...cacheState.values.keys()]) {
      if (key.startsWith(prefix)) {
        cacheState.values.delete(key);
        cacheState.ttlByKey.delete(key);
      }
    }
  },
  getCache: async <T>(key: string) => {
    if (!cacheState.redisAvailable) {
      return null;
    }

    if (!cacheState.values.has(key)) {
      return null;
    }

    return cacheState.values.get(key) as T;
  },
  getOrSetCache: async <T>(key: string, ttlSeconds: number, loader: () => Promise<T>) => {
    if (!cacheState.redisAvailable) {
      return loader();
    }

    if (cacheState.values.has(key)) {
      return cacheState.values.get(key) as T;
    }

    const value = await loader();
    cacheState.values.set(key, value);
    cacheState.ttlByKey.set(key, ttlSeconds);
    return value;
  },
  setCache: async <T>(key: string, value: T, ttlSeconds: number) => {
    if (!cacheState.redisAvailable) {
      return;
    }

    cacheState.values.set(key, value);
    cacheState.ttlByKey.set(key, ttlSeconds);
  },
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

const {
  createUserShortUrl,
  deleteUserShortUrl,
  getUrlBySuffix,
  getUrlClicksByIds,
  getUrlStatusOptimized,
  getUserShortUrls,
  updateUserShortUrl,
  updateUserShortUrlActive,
  updateUserShortUrlVisibility,
} = await import("@/lib/short-urls/services");
const { GET, POST } = await import("@/app/api/url/route");

const routeContext = {
  params: Promise.resolve({}),
};

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as NextRequest;
}

const originalConsoleError = console.error;

describe("lib/short-urls/services", () => {
  beforeEach(() => {
    console.error = () => undefined;
    queryState.insertResult = { id: "url_1" };
    queryState.insertError = null;
    queryState.existingShortUrl = null;
    queryState.existingShortUrlById = { id: "url_1", url: "demo" };
    queryState.shortUrlBySuffix = null;
    queryState.updateOwnerResult = {
      id: "url_1",
      target: "https://updated.example.com",
    };
    queryState.updateAdminResult = null;
    queryState.updateActiveResult = null;
    queryState.updateVisibilityResult = null;
    queryState.removeResult = { success: true, userId: "user_1" };
    queryState.listResult = { list: [{ id: "url_1", url: "demo" }], total: 1 };
    queryState.statusRecords = [];
    queryState.aggregateClicksResult = [];
    queryState.aggregateClicksError = null;
    queryState.lastInsertArg = null;
    queryState.lastUpdateOwnerArg = null;
    queryState.lastDeleteArgs = null;
    queryState.lastListArgs = [];
    queryState.lastAggregateArgs = [];
    queryState.listCallCount = 0;
    queryState.statusCallCount = 0;
    queryState.suffixLookupCount = 0;
    cacheState.values.clear();
    cacheState.ttlByKey.clear();
    cacheState.lastDeletedKeys = [];
    cacheState.lastDeletedPrefixes = [];
    cacheState.redisAvailable = true;
    authState.currentUser = {
      id: "user_1",
      role: "USER",
      team: "free",
      active: 1,
      name: "Test User",
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it("creates short URLs successfully", async () => {
    const result = await createUserShortUrl(sampleShortUrl);

    expect(result).toEqual({
      status: "success",
      data: { id: "url_1" },
    });
    expect(queryState.lastInsertArg).toEqual(sampleShortUrl);
    expect(cacheState.lastDeletedKeys).toEqual([
      "short-url:slug:demo",
      "short-url:status:USER:user_1",
      "short-url:status:ADMIN:admin",
    ]);
    expect(cacheState.lastDeletedPrefixes).toEqual([
      "short-url:list:USER:user_1:",
      "short-url:list:ADMIN:admin:",
    ]);
  });

  it("rejects duplicate short URL slugs before insert", async () => {
    queryState.existingShortUrl = { id: "url_existing" };

    const result = await createUserShortUrl(sampleShortUrl);
    const status = result.status as Error & { code?: string };

    expect(status).toBeInstanceOf(Error);
    expect(status.message).toBe("Unique constraint failed");
    expect(status.code).toBe("UNIQUE_CONSTRAINT");
    expect(queryState.lastInsertArg).toBe(null);
  });

  it("updates short URLs and surfaces missing records as errors", async () => {
    const successResult = await updateUserShortUrl(sampleShortUrl);
    expect(successResult).toEqual({
      status: "success",
      data: queryState.updateOwnerResult,
    });
    expect(cacheState.lastDeletedKeys).toEqual([
      "short-url:slug:demo",
      "short-url:status:USER:user_1",
      "short-url:status:ADMIN:admin",
    ]);
    expect(cacheState.lastDeletedPrefixes).toEqual([
      "short-url:list:USER:user_1:",
      "short-url:list:ADMIN:admin:",
    ]);

    queryState.updateOwnerResult = null;
    const failedResult = await updateUserShortUrl(sampleShortUrl);
    expect(failedResult.status).toBeInstanceOf(Error);
  });

  it("allows updating the same short URL without triggering duplicate checks", async () => {
    queryState.existingShortUrl = { id: "url_1" };

    const result = await updateUserShortUrl(sampleShortUrl);

    expect(result).toEqual({
      status: "success",
      data: queryState.updateOwnerResult,
    });
    expect(queryState.lastUpdateOwnerArg).toEqual(sampleShortUrl);
  });

  it("caches status summaries for identical scope requests", async () => {
    const now = Date.now();
    queryState.statusRecords = [
      {
        id: "url_active",
        userId: "user_1",
        active: 1,
        expiration: "-1",
        password: "",
        createdAt: new Date(now - 5_000),
        updatedAt: new Date(now - 5_000),
      },
      {
        id: "url_expired",
        userId: "user_1",
        active: 1,
        expiration: "10",
        password: "",
        createdAt: new Date(now - 20_000),
        updatedAt: new Date(now - 20_000),
      },
    ];

    const first = await getUrlStatusOptimized("user_1", "USER");
    const second = await getUrlStatusOptimized("user_1", "USER");

    expect(first).toEqual({
      total: 2,
      actived: 1,
      disabled: 0,
      expired: 1,
      passwordprotected: 0,
    });
    expect(second).toEqual(first);
    expect(queryState.statusCallCount).toBe(1);
    expect(cacheState.ttlByKey.get("short-url:status:USER:user_1")).toBe(60);
  });

  it("keeps user and admin status caches isolated", async () => {
    queryState.statusRecords = [
      {
        id: "url_user",
        userId: "user_1",
        active: 1,
        expiration: "-1",
        password: "",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];

    const userStatus = await getUrlStatusOptimized("user_1", "USER");

    queryState.statusRecords = [
      ...queryState.statusRecords,
      {
        id: "url_admin_extra",
        userId: "user_2",
        active: 1,
        expiration: "-1",
        password: "secret",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];

    const adminStatus = await getUrlStatusOptimized("user_1", "ADMIN");

    expect(userStatus).toEqual({
      total: 1,
      actived: 1,
      disabled: 0,
      expired: 0,
      passwordprotected: 0,
    });
    expect(adminStatus).toEqual({
      total: 2,
      actived: 1,
      disabled: 0,
      expired: 0,
      passwordprotected: 1,
    });
    expect(queryState.statusCallCount).toBe(2);
  });

  it("caches short URL management lists and isolates keys by filters", async () => {
    const first = await getUserShortUrls("user_1", 1, 1, 10, "USER", "alice", "demo", "example");
    const second = await getUserShortUrls("user_1", 1, 1, 10, "USER", "alice", "demo", "example");

    expect(first).toEqual(queryState.listResult);
    expect(second).toEqual(queryState.listResult);
    expect(queryState.listCallCount).toBe(1);

    queryState.listResult = { list: [{ id: "url_2", url: "demo-2" }], total: 2 };
    const third = await getUserShortUrls("user_1", 1, 2, 10, "USER", "alice", "demo", "example");

    expect(third).toEqual(queryState.listResult);
    expect(queryState.listCallCount).toBe(2);
    expect(cacheState.ttlByKey.get("short-url:list:USER:user_1:page=1&size=10&userName=alice&url=demo&target=example")).toBe(60);
    expect(cacheState.ttlByKey.get("short-url:list:USER:user_1:page=2&size=10&userName=alice&url=demo&target=example")).toBe(60);
  });

  it("keeps user and admin list caches isolated", async () => {
    queryState.listResult = { list: [{ id: "user_only" }], total: 1 };
    const userList = await getUserShortUrls("user_1", 1, 1, 10, "USER", "", "", "");

    queryState.listResult = { list: [{ id: "admin_scope" }], total: 99 };
    const adminList = await getUserShortUrls("user_1", 1, 1, 10, "ADMIN", "", "", "");

    expect(userList).toEqual({ list: [{ id: "user_only" }], total: 1 });
    expect(adminList).toEqual({ list: [{ id: "admin_scope" }], total: 99 });
    expect(queryState.listCallCount).toBe(2);
  });

  it("invalidates slug, status, and list caches when visibility changes", async () => {
    cacheState.values.set("short-url:slug:demo", { id: "cached" });
    cacheState.values.set("short-url:status:USER:user_1", { total: 1 });
    cacheState.values.set("short-url:status:ADMIN:admin", { total: 10 });
    cacheState.values.set("short-url:list:USER:user_1:page=1&size=10&userName=&url=&target=", { list: [] });
    cacheState.values.set("short-url:list:ADMIN:admin:page=1&size=10&userName=&url=&target=", { list: [] });
    queryState.updateVisibilityResult = { id: "url_1", visible: 0, userId: "user_1" };

    const result = await updateUserShortUrlVisibility("url_1", 0);

    expect(result).toEqual({
      status: "success",
      data: { id: "url_1", visible: 0, userId: "user_1" },
    });
    expect(cacheState.values.has("short-url:slug:demo")).toBe(false);
    expect(cacheState.values.has("short-url:status:USER:user_1")).toBe(false);
    expect(cacheState.values.has("short-url:status:ADMIN:admin")).toBe(false);
    expect(cacheState.values.has("short-url:list:USER:user_1:page=1&size=10&userName=&url=&target=")).toBe(false);
    expect(cacheState.values.has("short-url:list:ADMIN:admin:page=1&size=10&userName=&url=&target=")).toBe(false);
  });

  it("deletes short URLs by owner", async () => {
    const result = await deleteUserShortUrl("user_1", "url_1");

    expect(result).toEqual({ success: true, userId: "user_1" });
    expect(queryState.lastDeleteArgs).toEqual(["user_1", "url_1"]);
    expect(cacheState.lastDeletedKeys).toEqual([
      "short-url:slug:demo",
      "short-url:status:USER:user_1",
      "short-url:status:ADMIN:admin",
    ]);
    expect(cacheState.lastDeletedPrefixes).toEqual([
      "short-url:list:USER:user_1:",
      "short-url:list:ADMIN:admin:",
    ]);
  });

  it("returns a zero-filled click map when click aggregation fails", async () => {
    queryState.aggregateClicksError = new Error("query failed");

    expect(
      await getUrlClicksByIds(["url_1", "url_2"], "user_1", "USER"),
    ).toEqual({
      url_1: 0,
      url_2: 0,
    });
  });

  it("caches short URL lookups and negative misses", async () => {
    queryState.shortUrlBySuffix = {
      id: "url_1",
      target: "https://example.com",
      active: 1,
      prefix: "go",
      expiration: "-1",
      password: "",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const firstResult = await getUrlBySuffix("demo");
    queryState.shortUrlBySuffix = {
      id: "url_1",
      target: "https://changed.example.com",
      active: 1,
      prefix: "go",
      expiration: "-1",
      password: "",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    const secondResult = await getUrlBySuffix("demo");

    expect(firstResult).toEqual(secondResult);
    expect(queryState.suffixLookupCount).toBe(1);

    queryState.shortUrlBySuffix = null;
    const missingResult = await getUrlBySuffix("missing");
    queryState.shortUrlBySuffix = {
      id: "url_missing",
      target: "https://later.example.com",
      active: 1,
      prefix: "go",
      expiration: "-1",
      password: "",
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    };
    const stillMissingResult = await getUrlBySuffix("missing");

    expect(missingResult).toBe(null);
    expect(stillMissingResult).toBe(null);
    expect(cacheState.ttlByKey.get("short-url:slug:missing")).toBe(60);
    expect(cacheState.values.get("short-url:slug:missing")).toEqual({ missing: true });
  });

  it("invalidates short URL cache when active state changes", async () => {
    queryState.updateActiveResult = { id: "url_1", active: 0, userId: "user_1" };

    const result = await updateUserShortUrlActive("user_1", "url_1", 0, "USER");

    expect(result).toEqual({
      status: "success",
      data: { id: "url_1", active: 0, userId: "user_1" },
    });
    expect(cacheState.lastDeletedKeys).toEqual([
      "short-url:slug:demo",
      "short-url:status:USER:user_1",
      "short-url:status:ADMIN:admin",
    ]);
    expect(cacheState.lastDeletedPrefixes).toEqual([
      "short-url:list:USER:user_1:",
      "short-url:list:ADMIN:admin:",
    ]);
  });

  it("falls back to direct reads when Redis is unavailable", async () => {
    cacheState.redisAvailable = false;
    queryState.listResult = { list: [{ id: "url_1" }], total: 1 };
    queryState.statusRecords = [
      {
        id: "url_active",
        userId: "user_1",
        active: 1,
        expiration: "-1",
        password: "",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];

    const firstList = await getUserShortUrls("user_1", 1, 1, 10, "USER", "", "", "");
    const secondList = await getUserShortUrls("user_1", 1, 1, 10, "USER", "", "", "");
    const firstStatus = await getUrlStatusOptimized("user_1", "USER");
    const secondStatus = await getUrlStatusOptimized("user_1", "USER");

    expect(firstList).toEqual(secondList);
    expect(firstStatus).toEqual(secondStatus);
    expect(queryState.listCallCount).toBe(2);
    expect(queryState.statusCallCount).toBe(2);
    expect(cacheState.values.size).toBe(0);
  });

  it("lists short URLs through the route with parsed filters", async () => {
    const response = await GET(
      makeRequest(
        "http://localhost/api/url?page=2&size=5&userName=alice&slug=demo&target=example",
      ),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(queryState.listResult);
    expect(queryState.lastListArgs).toEqual([
      "user_1",
      2,
      5,
      "USER",
      "alice",
      "demo",
      "example",
    ]);
  });

  it("loads click counts through the route", async () => {
    queryState.aggregateClicksResult = [{ urlId: "url_1", click: 12 }];

    const response = await POST(
      makeRequest("http://localhost/api/url", {
        method: "POST",
        body: JSON.stringify({ ids: ["url_1"] }),
        headers: { "content-type": "application/json" },
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url_1: 12 });
    expect(queryState.lastAggregateArgs).toEqual([["url_1"], "user_1", "USER"]);
  });
});
