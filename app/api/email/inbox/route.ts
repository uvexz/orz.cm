import { NextRequest } from "next/server";

import { badRequest, getErrorMessage, hasErrorMessage, notFound } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { deleteEmailsByIds, getEmailsByEmailAddress } from "@/lib/email/services";

function mapInboxQueryError(error: unknown) {
  if (hasErrorMessage(error, "Email address not found or has been deleted")) {
    return notFound({ error: getErrorMessage(error) });
  }

  return null;
}

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, _api) => {
    const { searchParams } = new URL(req.url);
    const emailAddress = searchParams.get("emailAddress");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("size") || "10", 10);

    if (!emailAddress) {
      throw badRequest({ error: "Missing emailAddress parameter" });
    }

    const emails = await getEmailsByEmailAddress(emailAddress, page, pageSize);
    return apiOk(emails);
  },
  {
    fallbackBody: { error: "Internal Server Error" },
    logMessage: "Error fetching emails:",
    mapError: mapInboxQueryError,
  },
);

export const DELETE = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, _api) => {
    const { ids } = await req.json();
    if (!ids) {
      throw badRequest("ids is required");
    }

    await deleteEmailsByIds(ids);
    return apiOk("success");
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
