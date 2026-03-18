import { beforeEach, describe, expect, it, mock } from "bun:test";
import { forbidden, unauthorized } from "@/lib/api/errors";

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
  lastFeatureArg: string | null;
  domainResult: unknown;
} = {
  currentUser: {
    id: "user_1",
    role: "USER",
    team: "free",
    active: 1,
    name: "Test User",
  },
  lastFeatureArg: null,
  domainResult: [
    {
      domain_name: "go.example.com",
      cf_record_types: "A,AAAA,CNAME",
      min_url_length: 3,
      min_email_length: 5,
      min_record_length: 2,
    },
  ],
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

mock.module("@/lib/dto/domains", () => ({
  FeatureMap: {
    short: "enable_short_link",
    email: "enable_email",
    record: "enable_dns",
  },
  getDomainsByFeature: async (feature: string) => {
    state.lastFeatureArg = feature;
    return state.domainResult;
  },
}));

const { GET } = await import("@/app/api/domain/route");

const routeContext = {
  params: Promise.resolve({}),
};

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as NextRequest;
}

describe("app/api/domain/route", () => {
  beforeEach(() => {
    state.currentUser = {
      id: "user_1",
      role: "USER",
      team: "free",
      active: 1,
      name: "Test User",
    };
    state.lastFeatureArg = null;
    state.domainResult = [
      {
        domain_name: "go.example.com",
        cf_record_types: "A,AAAA,CNAME",
        min_url_length: 3,
        min_email_length: 5,
        min_record_length: 2,
      },
    ];
  });

  it("returns 401 when the caller is not logged in", async () => {
    state.currentUser = null;

    const response = await GET(
      makeRequest("http://localhost/api/domain?feature=short"),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toBe("Unauthorized");
  });

  it("returns 400 for unsupported features", async () => {
    const response = await GET(
      makeRequest("http://localhost/api/domain?feature=unknown"),
      routeContext,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toBe(
      "Invalid feature parameter. Use 'short', 'email', or 'record'.",
    );
  });

  it("uses the shared domains-by-feature reader", async () => {
    const response = await GET(
      makeRequest("http://localhost/api/domain?feature=email"),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(state.domainResult);
    expect(state.lastFeatureArg).toBe("enable_email");
  });
});
