import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { FeatureMap, getDomainsByFeatureClient } from "@/lib/dto/domains";

export const dynamic = "force-dynamic";

function isFeatureKey(feature: string): feature is keyof typeof FeatureMap {
  return feature in FeatureMap;
}

// Get domains by feature for frontend
export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const url = new URL(req.url);
    const feature = url.searchParams.get("feature") || "";

    if (!isFeatureKey(feature)) {
      throw badRequest(
        "Invalid feature parameter. Use 'short', 'email', or 'record'.",
      );
    }

    const domainList = await getDomainsByFeatureClient(FeatureMap[feature]);

    return apiOk(domainList);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
