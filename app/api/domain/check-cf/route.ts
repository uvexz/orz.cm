import { NextRequest } from "next/server";

import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getZoneDetail } from "@/lib/cloudflare";

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const url = new URL(req.url);
    const zone_id = url.searchParams.get("zone_id") || "";
    const api_key = url.searchParams.get("api_key") || "";
    const email = url.searchParams.get("email") || "";

    const res = await getZoneDetail(zone_id, api_key, email);

    return apiOk(res === 200 ? 200 : 400, res === 200 ? 200 : 400);
  },
  {
    fallbackBody: 500,
  },
);
