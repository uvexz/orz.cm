import { unauthorized } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getUrlMetaLiveLog } from "@/lib/short-urls/services";

export const GET = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const url = new URL(req.url);
    const isAdmin = url.searchParams.get("admin");

    if (isAdmin === "true") {
      if (user.role !== "ADMIN") {
        throw unauthorized("Unauthorized");
      }
    }

    const logs = await getUrlMetaLiveLog(
      isAdmin === "true" ? undefined : user.id,
    );
    return apiOk(logs);
  },
  {
    fallbackBody: "Server error",
  },
);
