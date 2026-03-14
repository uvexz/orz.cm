import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema } from "@/lib/db/schema";

type SqlClient = ReturnType<typeof postgres>;
type DrizzleDb = ReturnType<typeof drizzle>;

declare global {
  // eslint-disable-next-line no-var
  var cachedSqlClient: SqlClient | undefined;
  // eslint-disable-next-line no-var
  var cachedDrizzleDb: DrizzleDb | undefined;
}

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function createRecursiveProxy(): DrizzleDb {
  const proxyTarget = (() => undefined) as (...args: unknown[]) => unknown;

  return new Proxy(proxyTarget, {
    get: (_target, prop) => {
      if (prop === "then") return undefined;
      return createRecursiveProxy();
    },
    apply: () => createRecursiveProxy(),
  }) as unknown as DrizzleDb;
}

function ensureDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the Drizzle database client.");
  }
  return databaseUrl;
}

function getSqlClient() {
  if (!global.cachedSqlClient) {
    global.cachedSqlClient = postgres(ensureDatabaseUrl(), {
      prepare: false,
      max: 10,
    });
  }

  return global.cachedSqlClient;
}

export const db: DrizzleDb = isBuild
  ? (createRecursiveProxy() as DrizzleDb)
  : global.cachedDrizzleDb || drizzle(getSqlClient(), { schema });

if (!isBuild && process.env.NODE_ENV !== "production") {
  global.cachedDrizzleDb = db;
}
