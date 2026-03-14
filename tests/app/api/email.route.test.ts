import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ApiError, forbidden, unauthorized } from "@/lib/api/errors";

import type { NextRequest } from "next/server";

type MockUser = {
  id: string;
  role: "ADMIN" | "USER";
  team: string;
  active: number;
  name: string;
};

const state: {
  currentUser: MockUser | null;
  userEmailsResult: unknown;
  createEmailResult: unknown;
  createEmailError: unknown;
  lastGetArgs: unknown[];
  lastCreateArgs: unknown[];
} = {
  currentUser: {
    id: "user_1",
    role: "USER",
    team: "free",
    active: 1,
    name: "Test User",
  },
  userEmailsResult: {
    list: [{ id: "mail_1", emailAddress: "demo@example.com" }],
    total: 1,
  },
  createEmailResult: {
    id: "mail_1",
    emailAddress: "demo@example.com",
  },
  createEmailError: null,
  lastGetArgs: [],
  lastCreateArgs: [],
};

mock.module("@/lib/session", () => ({
  getCurrentUser: async () => state.currentUser,
}));

mock.module("@/lib/dto/user", () => ({
  checkUserStatus: (user: MockUser | null | undefined) => {
    if (!user?.id) {
      throw unauthorized("Unauthorized");
    }

    if (user.active === 0) {
      throw forbidden("Forbidden");
    }

    return user;
  },
}));

mock.module("@/lib/email/services", () => ({
  getAllUserEmailsForActor: async (...args: unknown[]) => {
    state.lastGetArgs = args;
    return state.userEmailsResult;
  },
  createManagedUserEmail: async (...args: unknown[]) => {
    state.lastCreateArgs = args;

    if (state.createEmailError) {
      throw state.createEmailError;
    }

    return state.createEmailResult;
  },
}));

const { GET, POST } = await import("@/app/api/email/route");

const routeContext = {
  params: Promise.resolve({}),
};

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as NextRequest;
}

describe("app/api/email/route", () => {
  beforeEach(() => {
    state.currentUser = {
      id: "user_1",
      role: "USER",
      team: "free",
      active: 1,
      name: "Test User",
    };
    state.userEmailsResult = {
      list: [{ id: "mail_1", emailAddress: "demo@example.com" }],
      total: 1,
    };
    state.createEmailResult = {
      id: "mail_1",
      emailAddress: "demo@example.com",
    };
    state.createEmailError = null;
    state.lastGetArgs = [];
    state.lastCreateArgs = [];
  });

  it("returns 401 when the caller is not logged in", async () => {
    state.currentUser = null;

    const response = await GET(
      makeRequest("http://localhost/api/email?page=1&size=10"),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toBe("Unauthorized");
  });

  it("returns 403 when the caller is disabled", async () => {
    state.currentUser = {
      id: "user_1",
      role: "USER",
      team: "free",
      active: 0,
      name: "Blocked User",
    };

    const response = await GET(
      makeRequest("http://localhost/api/email?page=1&size=10"),
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toBe("Forbidden");
  });

  it("maps duplicate-address failures to 409", async () => {
    const duplicateError = new Error("Unique constraint failed") as Error & {
      code?: string;
    };
    duplicateError.code = "UNIQUE_CONSTRAINT";
    state.createEmailError = duplicateError;

    const response = await POST(
      makeRequest("http://localhost/api/email", {
        method: "POST",
        body: JSON.stringify({ emailAddress: "demo@example.com" }),
        headers: { "content-type": "application/json" },
      }),
      routeContext,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toBe("Email address already exists");
  });

  it("returns quota failures from the shared API error path", async () => {
    state.createEmailError = new ApiError(429, "Email quota exceeded");

    const response = await POST(
      makeRequest("http://localhost/api/email", {
        method: "POST",
        body: JSON.stringify({ emailAddress: "demo@example.com" }),
        headers: { "content-type": "application/json" },
      }),
      routeContext,
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toBe("Email quota exceeded");
  });

  it("creates user email successfully", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/email", {
        method: "POST",
        body: JSON.stringify({ emailAddress: "demo@example.com" }),
        headers: { "content-type": "application/json" },
      }),
      routeContext,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(state.createEmailResult);
    expect(state.lastCreateArgs).toEqual([
      state.currentUser,
      "demo@example.com",
    ]);
  });

  it("lists user emails successfully", async () => {
    const response = await GET(
      makeRequest(
        "http://localhost/api/email?page=2&size=5&search=demo&all=true&unread=true",
      ),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(state.userEmailsResult);
    expect(state.lastGetArgs).toEqual([
      state.currentUser,
      {
        page: 2,
        size: 5,
        search: "demo",
        includeAll: true,
        unreadOnly: true,
      },
    ]);
  });
});
