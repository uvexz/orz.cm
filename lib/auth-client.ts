"use client";

import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  genericOAuthClient,
  magicLinkClient,
} from "better-auth/client/plugins";

import type { AppAuth } from "@/auth";

export const authClient = createAuthClient({
  plugins: [
    customSessionClient<AppAuth>(),
    magicLinkClient(),
    genericOAuthClient(),
  ],
});

export type AuthSession = typeof authClient.$Infer.Session;
