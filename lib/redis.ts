import "server-only";

import { env } from "@/env.mjs";
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

declare global {
  // eslint-disable-next-line no-var
  var cachedRedisClient: RedisClient | undefined;
  // eslint-disable-next-line no-var
  var cachedRedisConnectPromise: Promise<RedisClient | null> | undefined;
}

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function createRedisClient() {
  const client = createClient({
    url: env.REDIS_URL,
  });

  client.on("error", (error) => {
    console.error("[redis] Client error", error);
  });

  return client;
}

async function connectRedisClient(client: RedisClient) {
  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

export async function getRedisClient(): Promise<RedisClient | null> {
  if (isBuild || !env.REDIS_URL) {
    return null;
  }

  if (global.cachedRedisClient?.isOpen) {
    return global.cachedRedisClient;
  }

  if (!global.cachedRedisClient) {
    global.cachedRedisClient = createRedisClient();
  }

  if (!global.cachedRedisConnectPromise) {
    const client = global.cachedRedisClient;

    global.cachedRedisConnectPromise = connectRedisClient(client).catch((error) => {
      console.error("[redis] Failed to connect", error);
      global.cachedRedisClient = undefined;
      global.cachedRedisConnectPromise = undefined;
      return null;
    });
  }

  return global.cachedRedisConnectPromise;
}
