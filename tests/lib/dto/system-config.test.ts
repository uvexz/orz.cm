import { beforeEach, describe, expect, it, mock } from "bun:test";

type ConfigRow = {
  id: string;
  key: string;
  value: string;
  type: "BOOLEAN" | "STRING" | "NUMBER" | "OBJECT";
  description?: string | null;
  version?: string;
  createdAt: Date;
  updatedAt: Date;
};

const dbState: {
  rows: ConfigRow[];
  selectCalls: number;
} = {
  rows: [],
  selectCalls: 0,
};

const cacheState: {
  values: Map<string, unknown>;
  deletedKeys: string[];
} = {
  values: new Map(),
  deletedKeys: [],
};

function applyCondition(rows: ConfigRow[], condition?: unknown) {
  if (!condition) {
    return rows;
  }

  if (typeof condition === "object" && condition !== null) {
    const typedCondition = condition as {
      type?: string;
      column?: keyof ConfigRow;
      value?: unknown;
      values?: unknown[];
    };

    if (typedCondition.type === "eq" && typedCondition.column) {
      return rows.filter((row) => row[typedCondition.column!] === typedCondition.value);
    }

    if (typedCondition.type === "inArray" && typedCondition.column) {
      return rows.filter((row) => typedCondition.values?.includes(row[typedCondition.column!]));
    }
  }

  return rows;
}

function createSelectBuilder() {
  const state: {
    condition?: unknown;
    limitCount?: number;
  } = {};

  const builder = {
    from() {
      return builder;
    },
    where(condition: unknown) {
      state.condition = condition;
      return builder;
    },
    orderBy() {
      return Promise.resolve(builder.execute());
    },
    limit(limitCount: number) {
      state.limitCount = limitCount;
      return Promise.resolve(builder.execute());
    },
    execute() {
      dbState.selectCalls += 1;
      const rows = applyCondition(dbState.rows, state.condition);
      return state.limitCount === undefined ? rows : rows.slice(0, state.limitCount);
    },
    then(resolve: (value: ConfigRow[]) => unknown, reject?: (reason?: unknown) => unknown) {
      return Promise.resolve(builder.execute()).then(resolve, reject);
    },
  };

  return builder;
}

mock.module("drizzle-orm", () => ({
  asc: (value: unknown) => value,
  eq: (column: string, value: unknown) => ({ type: "eq", column, value }),
  ilike: (column: string, value: unknown) => ({ type: "ilike", column, value }),
  inArray: (column: string, values: unknown[]) => ({ type: "inArray", column, values }),
  or: (...conditions: unknown[]) => ({ type: "or", conditions }),
  sql: <T>(strings: TemplateStringsArray) => strings.join("") as T,
}));

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
  getCache: async <T>(key: string) => {
    if (!cacheState.values.has(key)) {
      return null;
    }

    return cacheState.values.get(key) as T;
  },
  getOrSetCache: async <T>(key: string, _ttlSeconds: number, loader: () => Promise<T>) => {
    if (cacheState.values.has(key)) {
      return cacheState.values.get(key) as T;
    }

    const value = await loader();
    cacheState.values.set(key, value);
    return value;
  },
  setCache: async <T>(key: string, value: T) => {
    cacheState.values.set(key, value);
  },
  delCache: async (key: string) => {
    cacheState.deletedKeys.push(key);
    cacheState.values.delete(key);
  },
  delCacheByPrefix: async (prefix: string) => {
    cacheState.deletedKeys.push(prefix);
    for (const key of [...cacheState.values.keys()]) {
      if (key.startsWith(prefix)) {
        cacheState.values.delete(key);
      }
    }
  },
}));

mock.module("@/lib/db/schema", () => ({
  systemConfigs: {
    key: "key",
    type: "type",
    description: "description",
  },
}));

mock.module("@/lib/db", () => ({
  db: {
    select: () => createSelectBuilder(),
    insert: () => {
      const builder = {
        values(row: ConfigRow) {
          return {
            returning: async () => {
              dbState.rows.push(row);
              return [row];
            },
          };
        },
      };

      return builder;
    },
    update: () => {
      const state: {
        data?: Partial<ConfigRow>;
        condition?: unknown;
      } = {};

      const builder = {
        set(data: Partial<ConfigRow>) {
          state.data = data;
          return builder;
        },
        where(condition: unknown) {
          state.condition = condition;
          return builder;
        },
        returning: async () => {
          const rows = applyCondition(dbState.rows, state.condition);
          const current = rows[0];
          if (!current) {
            return [];
          }

          const updated = { ...current, ...state.data };
          const index = dbState.rows.findIndex((row) => row.id === current.id);
          dbState.rows[index] = updated;
          return [updated];
        },
      };

      return builder;
    },
    delete: () => {
      const state: {
        condition?: unknown;
      } = {};

      const builder = {
        where(condition: unknown) {
          state.condition = condition;
          return builder;
        },
        returning: async () => {
          const rows = applyCondition(dbState.rows, state.condition);
          const current = rows[0];
          if (!current) {
            return [];
          }

          const index = dbState.rows.findIndex((row) => row.id === current.id);
          dbState.rows.splice(index, 1);
          return [current];
        },
      };

      return builder;
    },
  },
}));

const {
  deleteSystemConfig,
  getMultipleConfigs,
  getSystemConfig,
  setSystemConfig,
} = await import("@/lib/dto/system-config");

describe("lib/dto/system-config", () => {
  beforeEach(() => {
    dbState.rows = [
      {
        id: "cfg_1",
        key: "enable_user_registration",
        value: "false",
        type: "BOOLEAN",
        description: "toggle registration",
        version: "0.5.0",
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        updatedAt: new Date("2026-03-17T00:00:00.000Z"),
      },
      {
        id: "cfg_2",
        key: "system_notification",
        value: '"hello"',
        type: "STRING",
        description: "notification text",
        version: "0.5.0",
        createdAt: new Date("2026-03-17T00:00:00.000Z"),
        updatedAt: new Date("2026-03-17T00:00:00.000Z"),
      },
    ];
    dbState.selectCalls = 0;
    cacheState.values = new Map();
    cacheState.deletedKeys = [];
  });

  it("reuses single-key cache entries during bulk reads", async () => {
    const first = await getMultipleConfigs([
      "enable_user_registration",
      "system_notification",
      "enable_google_oauth",
    ]);

    expect(first).toEqual({
      enable_user_registration: false,
      system_notification: "hello",
      enable_google_oauth: false,
    });
    expect(dbState.selectCalls).toBe(1);

    const second = await getMultipleConfigs([
      "enable_user_registration",
      "system_notification",
      "enable_google_oauth",
    ]);

    expect(second).toEqual(first);
    expect(dbState.selectCalls).toBe(1);
  });

  it("invalidates cached keys when a config is updated", async () => {
    expect(await getSystemConfig("enable_user_registration")).toEqual({
      key: "enable_user_registration",
      value: false,
      type: "BOOLEAN",
      description: "toggle registration",
      version: "0.5.0",
    });
    expect(dbState.selectCalls).toBe(1);

    await setSystemConfig(
      "enable_user_registration",
      true,
      "BOOLEAN",
      "toggle registration",
    );

    expect(cacheState.deletedKeys.includes("system-config:enable_user_registration")).toBe(true);

    const refreshed = await getMultipleConfigs(["enable_user_registration"]);
    expect(refreshed).toEqual({ enable_user_registration: true });
    expect(dbState.selectCalls).toBe(3);
  });

  it("invalidates cached keys when a config is deleted", async () => {
    expect(await getSystemConfig("system_notification")).toEqual({
      key: "system_notification",
      value: "hello",
      type: "STRING",
      description: "notification text",
      version: "0.5.0",
    });
    expect(dbState.selectCalls).toBe(1);

    await deleteSystemConfig("system_notification");

    expect(cacheState.deletedKeys.includes("system-config:system_notification")).toBe(true);

    const refreshed = await getMultipleConfigs(["system_notification"]);
    expect(refreshed).toEqual({ system_notification: false });
    expect(dbState.selectCalls).toBe(2);
  });
});
