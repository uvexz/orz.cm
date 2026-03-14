import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { customSession, genericOAuth, magicLink } from "better-auth/plugins";
import { headers } from "next/headers";

import { env } from "@/env.mjs";
import { db } from "@/lib/db";
import {
  authAccount,
  authSession,
  authUser,
  authVerification,
} from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendAuthMagicLink } from "@/lib/auth/email";
import {
  buildAppSession,
  deactivateAppUserFromAuthUser,
  isAppSession,
  isBetterAuthSessionPayload,
  syncAppUserFromAuthUser,
  type AppSession,
} from "@/lib/auth/server";

export const betterAuthServer = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  secret: env.AUTH_SECRET || "development-secret-change-me",
  baseURL: env.AUTH_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: [
    env.AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.NEXTAUTH_URL,
  ].filter(Boolean) as string[],
  plugins: [
    nextCookies(),
    customSession(async (session) => {
      const appSession = await buildAppSession(session);

      if (!appSession) {
        throw new Error("Expected an authenticated session.");
      }

      return appSession;
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendAuthMagicLink(email, url);
      },
    }),
    genericOAuth({
      config:
        env.LinuxDo_CLIENT_ID && env.LinuxDo_CLIENT_SECRET
          ? [
              {
                providerId: "linuxdo",
                clientId: env.LinuxDo_CLIENT_ID,
                clientSecret: env.LinuxDo_CLIENT_SECRET,
                discoveryUrl:
                  "https://connect.linux.do/.well-known/openid-configuration",
                scopes: ["openid", "profile", "email"],
                mapProfileToUser: async (profile) => ({
                  id: String(
                    profile.sub ||
                      profile.id ||
                      profile.username ||
                      profile.preferred_username ||
                      profile.email,
                  ),
                  name:
                    profile.name ||
                    profile.username ||
                    profile.preferred_username ||
                    "",
                  email: profile.email,
                  emailVerified: Boolean(
                    profile.email_verified ?? profile.emailVerified,
                  ),
                  image:
                    profile.avatar_url || profile.picture || profile.avatar,
                }),
              },
            ]
          : [],
    }),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    password: {
      hash: async (password) => hashPassword(password),
      verify: async ({ hash, password }) => verifyPassword(password, hash),
    },
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.GITHUB_ID && env.GITHUB_SECRET
      ? {
          github: {
            clientId: env.GITHUB_ID,
            clientSecret: env.GITHUB_SECRET,
          },
        }
      : {}),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await syncAppUserFromAuthUser(user);
        },
      },
      update: {
        after: async (user) => {
          await syncAppUserFromAuthUser(user);
        },
      },
      delete: {
        after: async (user) => {
          await deactivateAppUserFromAuthUser(user);
        },
      },
    },
  },
});

export type AppAuth = typeof betterAuthServer;

export async function auth(): Promise<AppSession | null> {
  const session = await betterAuthServer.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  if (isAppSession(session)) {
    return session;
  }

  if (!isBetterAuthSessionPayload(session)) {
    return null;
  }

  return buildAppSession(session);
}
