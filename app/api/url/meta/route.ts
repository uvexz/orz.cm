import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getUserUrlMetaInfo } from "@/lib/short-urls/services";

export const GET = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext) => {
    const url = new URL(req.url);
    const urlId = url.searchParams.get("id");
    const range = url.searchParams.get("range") || "24h";

    if (!urlId) {
      throw badRequest("url id is required");
    }

    const data = await getUserUrlMetaInfo(urlId, range);
    return apiOk(data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
