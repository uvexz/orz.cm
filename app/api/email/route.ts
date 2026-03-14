import { NextRequest } from "next/server";

import {
  badRequest,
  conflict,
  getErrorMessage,
  hasErrorCode,
  hasErrorMessage,
} from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiCreated,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  createManagedUserEmail,
  getAllUserEmailsForActor,
} from "@/lib/email/services";

function mapEmailMutationError(error: unknown) {
  if (hasErrorMessage(error, "Invalid userId")) {
    return badRequest({ error: getErrorMessage(error) });
  }

  if (hasErrorMessage(error, "Invalid email address")) {
    return badRequest({ error: getErrorMessage(error) });
  }

  if (hasErrorCode(error, "UNIQUE_CONSTRAINT")) {
    return conflict("Email address already exists");
  }

  return null;
}

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "10", 10);
    const search = searchParams.get("search") || "";
    const all = searchParams.get("all") || "false";
    const unread = searchParams.get("unread") || "false";

    const userEmails = await getAllUserEmailsForActor(user, {
      page,
      size,
      search,
      includeAll: all === "true",
      unreadOnly: unread === "true",
    });

    return apiOk(userEmails);
  },
  {
    logMessage: "Error fetching user emails:",
  },
);

export const POST = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { emailAddress } = await req.json();
    if (!emailAddress) {
      throw badRequest("Missing userId or emailAddress");
    }

    const userEmail = await createManagedUserEmail(user, emailAddress);
    return apiCreated(userEmail);
  },
  {
    logMessage: "Error creating user email:",
    mapError: mapEmailMutationError,
  },
);
