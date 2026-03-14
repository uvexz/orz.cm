import { NextRequest } from "next/server";

import {
  badRequest,
  forbidden,
  getErrorMessage,
  hasErrorMessage,
  unauthorized,
} from "@/lib/api/errors";
import { apiOk, createApiRoute } from "@/lib/api/route";
import { checkApiKey } from "@/lib/dto/api-key";
import { deleteOwnedEmailsByIds, markEmailAsRead } from "@/lib/email/services";

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

function mapMessageActionError(error: unknown) {
  if (
    hasErrorMessage(
      error,
      "There are no valid emails to mark as read or you do not have permission",
    ) ||
    hasErrorMessage(
      error,
      "There are no valid emails to delete or you do not have permission",
    )
  ) {
    return forbidden({
      success: false,
      error: getErrorMessage(error),
    });
  }

  return null;
}

export const POST = createApiRoute(
  async (req: NextRequest) => {
    const user = await requireApiUser(req);
    const { emailId } = await req.json();

    if (!emailId) {
      throw badRequest({ error: "Missing emailId parameter" });
    }

    await markEmailAsRead(emailId, user.id);
    return apiOk({ success: true });
  },
  {
    fallbackBody: { success: false, error: "Internal Server Error" },
    logMessage: "Error marking email as read (v1):",
    mapError: mapMessageActionError,
  },
);

export const DELETE = createApiRoute(
  async (req: NextRequest) => {
    const user = await requireApiUser(req);
    const { emailId } = await req.json();

    if (!emailId) {
      throw badRequest({ error: "Missing emailId parameter" });
    }

    await deleteOwnedEmailsByIds([emailId], user.id);
    return apiOk({ success: true });
  },
  {
    fallbackBody: { success: false, error: "Internal Server Error" },
    logMessage: "Error deleting email message (v1):",
    mapError: mapMessageActionError,
  },
);
