import { NextRequest } from "next/server";

import { badRequest, conflict, hasErrorCode, hasErrorMessage, notFound } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  deleteUserEmail,
  getUserEmailById,
  updateUserEmail,
} from "@/lib/email/services";

function mapUserEmailMutationError(error: unknown) {
  if (hasErrorMessage(error, "User email not found or already deleted")) {
    return notFound("User email not found or already deleted");
  }

  if (hasErrorMessage(error, "Invalid email address")) {
    return badRequest("Invalid email address");
  }

  if (hasErrorCode(error, "UNIQUE_CONSTRAINT")) {
    return conflict("Email address already exists");
  }

  return null;
}

export const GET = createAuthedApiRoute<{ id: string }>(
  async (
    _req: NextRequest,
    { params }: AppRouteHandlerContext<{ id: string }>,
    _api,
  ) => {
    const { id } = await params;
    const userEmail = await getUserEmailById(id);

    if (!userEmail) {
      throw notFound({ error: "User email not found or deleted" });
    }

    return apiOk(userEmail);
  },
  {
    fallbackBody: { error: "Internal Server Error" },
    logMessage: "Error fetching user email:",
  },
);

export const PUT = createAuthedApiRoute<{ id: string }>(
  async (
    req: NextRequest,
    { params }: AppRouteHandlerContext<{ id: string }>,
    _api,
  ) => {
    const { id } = await params;
    const { emailAddress } = await req.json();

    if (!emailAddress) {
      throw badRequest("Missing emailAddress");
    }

    const userEmail = await updateUserEmail(id, emailAddress);
    return apiOk(userEmail);
  },
  {
    logMessage: "Error updating user email:",
    mapError: mapUserEmailMutationError,
  },
);

export const DELETE = createAuthedApiRoute<{ id: string }>(
  async (
    _req: NextRequest,
    { params }: AppRouteHandlerContext<{ id: string }>,
    _api,
  ) => {
    const { id } = await params;
    await deleteUserEmail(id);
    return apiOk({ message: "success" });
  },
  {
    logMessage: "Error deleting user email:",
    mapError: mapUserEmailMutationError,
  },
);
