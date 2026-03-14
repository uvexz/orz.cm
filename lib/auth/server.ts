import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { authAccount, authUser, users } from "@/lib/db/schema";

type AuthIdentity = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean | Date | null;
};

type SessionRecord = Record<string, unknown>;

type BetterAuthSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean | Date | null;
  role?: UserRole;
  team?: string;
  active?: number;
  apiKey?: string;
};

type BetterAuthSessionPayload = {
  session: SessionRecord;
  user: BetterAuthSessionUser;
};

type AppUserRecord = typeof users.$inferSelect;
type UserRole = AppUserRecord["role"];

export type AppSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  team: string;
  active: number;
  apiKey: string;
  emailVerified: Date | null;
};

export type AppSession = {
  session: SessionRecord;
  user: AppSessionUser;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBooleanOrDate(
  value: unknown,
): value is boolean | Date | null | undefined {
  return (
    value === undefined ||
    value === null ||
    typeof value === "boolean" ||
    value instanceof Date
  );
}

function isOptionalDate(value: unknown): value is Date | null | undefined {
  return value === undefined || value === null || value instanceof Date;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "USER";
}

export function isBetterAuthSessionPayload(
  value: unknown,
): value is BetterAuthSessionPayload {
  if (!isRecord(value) || !isRecord(value.session) || !isRecord(value.user)) {
    return false;
  }

  return (
    typeof value.user.id === "string" &&
    isOptionalNullableString(value.user.name) &&
    isOptionalNullableString(value.user.email) &&
    isOptionalNullableString(value.user.image) &&
    isOptionalBooleanOrDate(value.user.emailVerified)
  );
}

export function isAppSession(value: unknown): value is AppSession {
  if (!isBetterAuthSessionPayload(value)) {
    return false;
  }

  return (
    isUserRole(value.user.role) &&
    typeof value.user.team === "string" &&
    typeof value.user.active === "number" &&
    typeof value.user.apiKey === "string" &&
    isOptionalDate(value.user.emailVerified)
  );
}

function normalizeEmailVerified(
  value: BetterAuthSessionUser["emailVerified"],
): Date | null {
  if (value instanceof Date) {
    return value;
  }

  return value ? new Date() : null;
}

async function findAppUserByIdentity(identity: AuthIdentity) {
  if (identity.id) {
    const [existingById] = await db
      .select()
      .from(users)
      .where(eq(users.id, identity.id))
      .limit(1);

    if (existingById) {
      return existingById;
    }
  }

  const normalizedEmail = normalizeEmail(identity.email);
  if (!normalizedEmail) {
    return null;
  }

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return existingByEmail ?? null;
}

async function findAuthUserByIdentity(identity: {
  id?: string | null;
  email?: string | null;
}) {
  if (identity.id) {
    const [existingById] = await db
      .select()
      .from(authUser)
      .where(eq(authUser.id, identity.id))
      .limit(1);

    if (existingById) {
      return existingById;
    }
  }

  const normalizedEmail = normalizeEmail(identity.email);
  if (!normalizedEmail) {
    return null;
  }

  const [existingByEmail] = await db
    .select()
    .from(authUser)
    .where(eq(authUser.email, normalizedEmail))
    .limit(1);

  return existingByEmail ?? null;
}

function getSessionUser(
  session: BetterAuthSessionPayload,
  appUser: AppUserRecord | null,
): AppSessionUser {
  return {
    id: appUser?.id ?? session.user.id,
    name: appUser?.name ?? session.user.name ?? null,
    email: appUser?.email ?? session.user.email ?? null,
    image: appUser?.image ?? session.user.image ?? null,
    role: appUser?.role ?? "USER",
    team: appUser?.team || "free",
    active: appUser?.active ?? 1,
    apiKey: appUser?.apiKey || "",
    emailVerified: appUser?.emailVerified ?? normalizeEmailVerified(session.user.emailVerified),
  };
}

export async function buildAppSession(
  session: BetterAuthSessionPayload | null,
): Promise<AppSession | null> {
  if (!session?.user?.id) {
    return null;
  }

  const appUser = await findAppUserByIdentity({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    emailVerified: session.user.emailVerified,
  });

  return {
    session: session.session,
    user: getSessionUser(session, appUser),
  };
}

export async function syncAppUserFromAuthUser(identity: AuthIdentity) {
  if (!identity.id) {
    return;
  }

  const existingAppUser = await findAppUserByIdentity(identity);
  const normalizedEmail = normalizeEmail(identity.email);
  const emailVerifiedAt = normalizeEmailVerified(identity.emailVerified);

  if (existingAppUser) {
    await db
      .update(users)
      .set({
        name: identity.name ?? existingAppUser.name ?? "",
        email: normalizedEmail ?? existingAppUser.email ?? null,
        image: identity.image ?? existingAppUser.image ?? null,
        emailVerified: emailVerifiedAt ?? existingAppUser.emailVerified ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingAppUser.id));
    return;
  }

  await db.insert(users).values({
    id: identity.id,
    name: identity.name ?? "",
    email: normalizedEmail,
    image: identity.image ?? null,
    active: 1,
    role: "USER",
    team: "free",
    apiKey: null,
    emailVerified: emailVerifiedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function deactivateAppUserFromAuthUser(identity: AuthIdentity) {
  const existingAppUser = await findAppUserByIdentity(identity);

  if (!existingAppUser) {
    return;
  }

  await db
    .update(users)
    .set({
      active: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existingAppUser.id));
}

async function upsertBetterAuthUserForAppUser(appUser: AppUserRecord) {
  const normalizedEmail = normalizeEmail(appUser.email);
  if (!normalizedEmail) {
    throw new Error("A user email is required to sync Better Auth.");
  }

  const existingAuthUser = await findAuthUserByIdentity({
    id: appUser.id,
    email: normalizedEmail,
  });

  const nextValues = {
    name: appUser.name || normalizedEmail.split("@")[0] || "User",
    email: normalizedEmail,
    image: appUser.image ?? null,
    emailVerified: Boolean(appUser.emailVerified),
    updatedAt: new Date(),
  };

  if (existingAuthUser) {
    await db
      .update(authUser)
      .set(nextValues)
      .where(eq(authUser.id, existingAuthUser.id));

    return {
      ...existingAuthUser,
      ...nextValues,
    };
  }

  const createdUser = {
    id: appUser.id,
    ...nextValues,
    createdAt: appUser.createdAt ?? new Date(),
  };

  await db.insert(authUser).values(createdUser);
  return createdUser;
}

async function upsertCredentialAccount(userId: string, passwordHash: string) {
  const [existingCredentialAccount] = await db
    .select()
    .from(authAccount)
    .where(
      and(
        eq(authAccount.userId, userId),
        eq(authAccount.providerId, "credential"),
      ),
    )
    .limit(1);

  if (existingCredentialAccount) {
    await db
      .update(authAccount)
      .set({
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(authAccount.id, existingCredentialAccount.id));
    return;
  }

  await db.insert(authAccount).values({
    id: crypto.randomUUID().replace(/-/g, ""),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function syncBetterAuthProfileForAppUser(appUserId: string) {
  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, appUserId))
    .limit(1);

  if (!appUser) {
    throw new Error("User not found.");
  }

  return upsertBetterAuthUserForAppUser(appUser);
}

export async function syncBetterAuthCredentialForAppUser(
  appUserId: string,
  passwordHash: string,
) {
  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, appUserId))
    .limit(1);

  if (!appUser) {
    throw new Error("User not found.");
  }

  const syncedAuthUser = await upsertBetterAuthUserForAppUser(appUser);
  await upsertCredentialAccount(syncedAuthUser.id, passwordHash);

  return syncedAuthUser;
}
