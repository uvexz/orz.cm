import { toNextJsHandler } from "better-auth/next-js";

import { betterAuthServer } from "@/auth";

export const { GET, POST, PUT, PATCH, DELETE } =
  toNextJsHandler(betterAuthServer);
