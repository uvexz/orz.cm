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
  updateOwnerResult: unknown;
  removeResult: unknown;
  listResult: unknown;
  statusRecords: ShortUrlStatusRecord[];
  aggregateClicksResult: Array<{ urlId: string; click: number }>;
  aggregateClicksError: unknown;
  lastInsertArg: ShortUrlFormData | null;
  lastUpdateOwnerArg: ShortUrlFormData | null;
  lastDeleteArgs: [string, string] | null;
  lastListArgs: unknown[];
  lastAggregateArgs: unknown[];
} = {
  insertResult: { id: "url_1" },
  insertError: null,
  updateOwnerResult: { id: "url_1", target: "https://updated.example.com" },
  removeResult: { success: true },
  listResult: { list: [{ id: "url_1", url: "demo" }], total: 1 },
  statusRecords: [],
  aggregateClicksResult: [],
  aggregateClicksError: null,
  lastInsertArg: null,
  lastUpdateOwnerArg: null,
  lastDeleteArgs: null,
  lastListArgs: [],
  lastAggregateArgs: [],
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
  findShortUrlBySuffix: async () => null,
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
  listUrlStatusRecords: async () => queryState.statusRecords,
  listUserShortUrls: async (...args: unknown[]) => {
    queryState.lastListArgs = args;
    return queryState.listResult;
  },
  listUserUrlMetaInfo: async () => [],
  removeUserShortUrl: async (userId: string, urlId: string) => {
    queryState.lastDeleteArgs = [userId, urlId];
    return queryState.removeResult;
  },
  updateShortUrlActiveState: async () => null,
  updateShortUrlVisibilityState: async () => null,
  updateUserShortUrlByAdmin: async () => null,
  updateUserShortUrlByOwner: async (data: ShortUrlFormData) => {
    queryState.lastUpdateOwnerArg = data;
    return queryState.updateOwnerResult;
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
  getUrlClicksByIds,
  getUrlStatusOptimized,
  updateUserShortUrl,
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
    queryState.updateOwnerResult = {
      id: "url_1",
      target: "https://updated.example.com",
    };
    queryState.removeResult = { success: true };
    queryState.listResult = { list: [{ id: "url_1", url: "demo" }], total: 1 };
    queryState.statusRecords = [];
    queryState.aggregateClicksResult = [];
    queryState.aggregateClicksError = null;
    queryState.lastInsertArg = null;
    queryState.lastUpdateOwnerArg = null;
    queryState.lastDeleteArgs = null;
    queryState.lastListArgs = [];
    queryState.lastAggregateArgs = [];
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
  });

  it("updates short URLs and surfaces missing records as errors", async () => {
    const successResult = await updateUserShortUrl(sampleShortUrl);
    expect(successResult).toEqual({
      status: "success",
      data: queryState.updateOwnerResult,
    });

    queryState.updateOwnerResult = null;
    const failedResult = await updateUserShortUrl(sampleShortUrl);
    expect(failedResult.status).toBeInstanceOf(Error);
  });

  it("calculates status aggregates from query records", async () => {
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

    expect(await getUrlStatusOptimized("user_1")).toEqual({
      total: 2,
      actived: 1,
      disabled: 0,
      expired: 1,
      passwordprotected: 0,
    });
  });

  it("deletes short URLs by owner", async () => {
    const result = await deleteUserShortUrl("user_1", "url_1");

    expect(result).toEqual({ success: true });
    expect(queryState.lastDeleteArgs).toEqual(["user_1", "url_1"]);
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
