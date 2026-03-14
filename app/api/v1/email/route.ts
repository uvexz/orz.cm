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
import { apiCreated, createApiRoute } from "@/lib/api/route";
import { checkApiKey } from "@/lib/dto/api-key";
import {
  createApiUserEmail,
  deleteUserEmailByAddress,
} from "@/lib/email/services";

async function requireApiUser(req: NextRequest) {
  const customApiKey = req.headers.get("wrdo-api-key");
  if (!customApiKey) {
    throw unauthorized("Unauthorized");
  }

  const user = await checkApiKey(customApiKey);
  if (!user?.id) {
    throw unauthorized(
      "Invalid API key. You can get your API key from https://wr.do/dashboard/settings.",
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
