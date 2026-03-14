import { describe, expect, it } from "bun:test";

import {
  calculateUrlStatusStats,
  isValidExpirationValue,
  shouldRestrictShortUrlsToUser,
} from "@/lib/short-urls/policies";

describe("lib/short-urls/policies", () => {
  it("restricts standard users to their own URLs", () => {
    expect(shouldRestrictShortUrlsToUser("USER")).toBe(true);
    expect(shouldRestrictShortUrlsToUser("ADMIN")).toBe(false);
  });

  it("recognizes configured expiration values", () => {
    expect(isValidExpirationValue("3600")).toBe(true);
    expect(isValidExpirationValue("999999")).toBe(false);
  });

  it("calculates URL status buckets from record state", () => {
    const now = Date.now();
    const stats = calculateUrlStatusStats([
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
        id: "url_disabled",
        userId: "user_1",
        active: 0,
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
      {
        id: "url_password",
        userId: "user_1",
        active: 1,
        expiration: "-1",
        password: "secret",
        createdAt: new Date(now - 5_000),
        updatedAt: new Date(now - 5_000),
      },
    ]);

    expect(stats).toEqual({
      total: 4,
      actived: 1,
      disabled: 1,
      expired: 1,
      passwordprotected: 1,
    });
  });
});
