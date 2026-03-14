import { NextRequest } from "next/server";

import {
  badRequest,
  conflict,
  getErrorMessage,
  hasErrorCode,
  hasErrorMessage,
  notFound,
} from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  getDeletedUserEmailsForActor,
  permanentlyDeleteDeletedUserEmail,
  restoreDeletedUserEmail,
} from "@/lib/email/services";

function mapTrashError(error: unknown) {
  if (hasErrorMessage(error, "Deleted user email not found")) {
    return notFound({ error: getErrorMessage(error) });
  }

  if (hasErrorCode(error, "UNIQUE_CONSTRAINT")) {
    return conflict({ error: "Email address already exists" });
  }

  return null;
}

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "15", 10);
    const search = searchParams.get("search") || "";

    const deletedEmails = await getDeletedUserEmailsForActor(user, {
      page,
      size,
      search,
    });

    return apiOk(deletedEmails);
  },
  {
    fallbackBody: { error: "Internal Server Error" },
    logMessage: "Error fetching deleted user emails:",
  },
);

export const POST = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { id } = await req.json();

    if (!id) {
      throw badRequest({ error: "Missing id" });
    }

    const restoredUserEmail = await restoreDeletedUserEmail(id, user.id);
    return apiOk(restoredUserEmail);
  },
  {
    fallbackBody: { error: "Internal Server Error" },
    logMessage: "Error restoring deleted user email:",
    mapError: mapTrashError,
  },
);

export const DELETE = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { id } = await req.json();

    if (!id) {
      throw badRequest({ error: "Missing id" });
    }

    await permanentlyDeleteDeletedUserEmail(id, user.id);
    return apiOk({ success: true });
  },
  {
    fallbackBody: { error: "Internal Server Error" },
    logMessage: "Error permanently deleting user email:",
    mapError: mapTrashError,
  },
);
