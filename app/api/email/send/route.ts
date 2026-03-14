import { NextRequest } from "next/server";

import { badRequest, forbidden, hasErrorMessage } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  getUserSendEmailCountForActor,
  sendManagedUserEmail,
} from "@/lib/email/services";

function mapSendEmailError(error: unknown) {
  if (
    hasErrorMessage(error, "Missing required fields") ||
    hasErrorMessage(error, "This domain is not configured for sending emails")
  ) {
    return badRequest(error instanceof Error ? error.message : "Bad Request");
  }

  if (hasErrorMessage(error, "Invalid email address")) {
    return forbidden("Invalid email address");
  }

  return null;
}

export const POST = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const payload = await req.json();
    await sendManagedUserEmail(user, payload);
    return apiOk("success");
  },
  {
    fallbackBody: "Internal server error",
    logMessage: "Error sending email:",
    mapError: mapSendEmailError,
  },
);

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") || "false";

    const count = await getUserSendEmailCountForActor(user, all === "true");
    return apiOk(count);
  },
  {
    fallbackBody: "Internal server error",
  },
);
