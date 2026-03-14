import { NextRequest } from "next/server";

import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getUserSendEmailListForActor } from "@/lib/email/services";

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "10", 10);
    const search = searchParams.get("search") || "";
    const all = searchParams.get("all") || "false";

    const data = await getUserSendEmailListForActor(user, {
      includeAll: all === "true",
      page,
      size,
      search,
    });
    return apiOk(data);
  },
  {
    fallbackBody: "Internal server error",
  },
);
