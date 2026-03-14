import { NextRequest } from "next/server";

import { badRequest, forbidden, getErrorMessage, hasErrorMessage } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  markAllEmailsAsRead,
  markEmailAsRead,
  markEmailsAsRead,
} from "@/lib/email/services";

function mapReadError(error: unknown) {
  if (
    hasErrorMessage(
      error,
      "There are no valid emails to mark as read or you do not have permission",
    ) ||
    hasErrorMessage(
      error,
      "There are no valid emails or you do not have permission",
    )
  ) {
    return forbidden({
      success: false,
      error: getErrorMessage(error),
    });
  }

  return null;
}

export const POST = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const body = await request.json();
    const { emailId } = body;

    if (!emailId) {
      throw badRequest({ error: "缺少必要的参数: emailId" });
    }

    await markEmailAsRead(emailId, user.id);
    return apiOk({ success: true });
  },
  {
    fallbackBody: { success: false, error: "服务器错误" },
    mapError: mapReadError,
  },
);

export const PUT = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const body = await request.json();
    const { emailIds } = body;

    if (!emailIds || !Array.isArray(emailIds)) {
      throw badRequest({ error: "缺少必要的参数: emailIds 必须是数组" });
    }

    await markEmailsAsRead(emailIds, user.id);
    return apiOk({ success: true });
  },
  {
    fallbackBody: { success: false, error: "服务器错误" },
    mapError: mapReadError,
  },
);

export const PATCH = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const body = await request.json();
    const { userEmailId } = body;

    if (!userEmailId) {
      throw badRequest({ error: "缺少必要的参数: userEmailId" });
    }

    await markAllEmailsAsRead(userEmailId, user.id);
    return apiOk({ success: true });
  },
  {
    fallbackBody: { success: false, error: "服务器错误" },
    mapError: mapReadError,
  },
);
