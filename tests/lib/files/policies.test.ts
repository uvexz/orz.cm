import { describe, expect, it } from "bun:test";

import { normalizeUserFileQueryOptions } from "@/lib/files/policies";

describe("lib/files/policies", () => {
  it("fills in default file query options", () => {
    expect(normalizeUserFileQueryOptions()).toEqual({
      page: 1,
      limit: 20,
      orderBy: "createdAt",
      order: "desc",
    });
  });

  it("preserves provided query options", () => {
    expect(
      normalizeUserFileQueryOptions({
        page: 3,
        limit: 50,
        orderBy: "size",
        order: "asc",
        bucket: "assets",
      }),
    ).toEqual({
      page: 3,
      limit: 50,
      orderBy: "size",
      order: "asc",
      bucket: "assets",
    });
  });
});
