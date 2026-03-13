import crypto from "crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const getApiKeyByUserId = async (userId: string) => {
  const [user] = await db
    .select({ apiKey: users.apiKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
};

export const checkApiKey = async (apiKey: string) => {
  const [user] = await db
    .select({
      id: users.id,
      team: users.team,
      name: users.name,
      active: users.active,
    })
    .from(users)
    .where(and(eq(users.apiKey, apiKey), eq(users.active, 1)))
    .limit(1);

  return user ?? null;
};

export const generateApiKey = async (userId: string) => {
  const apiKey = crypto.randomUUID();
  const [user] = await db
    .update(users)
    .set({
      apiKey,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), eq(users.active, 1)))
    .returning({ apiKey: users.apiKey });

  return user ?? null;
};
