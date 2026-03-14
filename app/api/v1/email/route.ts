import { NextRequest, NextResponse } from "next/server";

import {
  badRequest,
  conflict,
  getErrorMessage,
  hasErrorCode,
  hasErrorMessage,
  notFound,
  unauthorized,
} from "@/lib/api/errors";
import { apiCreated, apiOk, createApiRoute } from "@/lib/api/route";
import { checkApiKey } from "@/lib/dto/api-key";
import {
  createApiUserEmail,
  deleteUserEmailByAddress,
  getAllUserEmails,
} from "@/lib/email/services";

async function requireApiUser(req: NextRequest) {
  const customApiKey = req.headers.get("wrdo-api-key");
  if (!customApiKey) {
    throw unauthorized("Unauthorized");
  }

  const user = await checkApiKey(customApiKey);
  if (!user?.id) {
    throw unauthorized(
      "Invalid API key. You can get your API key from https://orz.cm/dashboard/settings.",
    );
  }

  return user;
}

function mapEmailApiError(error: unknown) {
  if (hasErrorMessage(error, "Invalid userId")) {
    return badRequest({ error: getErrorMessage(error) });
  }

  if (
    hasErrorCode(error, "INVALID_EMAIL_ADDRESS") ||
    hasErrorCode(error, "INVALID_EMAIL_SUFFIX") ||
    hasErrorCode(error, "EMAIL_PREFIX_TOO_SHORT")
  ) {
    return badRequest(getErrorMessage(error));
  }

  if (hasErrorCode(error, "UNIQUE_CONSTRAINT")) {
    return conflict("Email address already exists");
  }

  if (hasErrorMessage(error, "User email not found or already deleted")) {
    return notFound(getErrorMessage(error));
  }

  return undefined;
}

export const GET = createApiRoute(
  async (req: NextRequest) => {
    const user = await requireApiUser(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "10", 10);
    const search = searchParams.get("search") || "";
    const unread = searchParams.get("unread") === "true";

    const userEmails = await getAllUserEmails(
      user.id,
      page,
      size,
      search,
      false,
      unread,
    );

    return apiOk(userEmails);
  },
  {
    fallbackBody: "Internal Server Error",
    logMessage: "Error fetching user emails (v1):",
    mapError: mapEmailApiError,
  },
);

// 创建新 UserEmail
export const POST = createApiRoute(
  async (req: NextRequest) => {
    const user = await requireApiUser(req);
    const { emailAddress } = await req.json();

    if (!emailAddress) {
      throw badRequest("Missing emailAddress");
    }

    const userEmail = await createApiUserEmail(user, emailAddress);
    return apiCreated(userEmail);
  },
  {
    fallbackBody: "Internal Server Error",
    logMessage: "Error creating user email (v1):",
    mapError: mapEmailApiError,
  },
);

export const DELETE = createApiRoute(
  async (req: NextRequest) => {
    await requireApiUser(req);

    const { emailAddress } = await req.json();
    if (!emailAddress) {
      throw badRequest("Missing email address parameter");
    }

    await deleteUserEmailByAddress(emailAddress);
    return NextResponse.json("success", { status: 201 });
  },
  {
    fallbackBody: "Internal Server Error",
    logMessage: "Error deleting user email (v1):",
    mapError: mapEmailApiError,
  },
);
