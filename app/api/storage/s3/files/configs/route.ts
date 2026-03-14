import { NextRequest } from "next/server";

import { notFound } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getS3ConfigListOrThrow } from "@/lib/api/storage";

export const GET = createAuthedApiRoute(
  async (_req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const configList = await getS3ConfigListOrThrow();
    const processedList = configList
      .map((config) => {
        const buckets = (config.buckets || []).filter((bucket) =>
          user.role === "ADMIN"
            ? bucket?.bucket
            : bucket?.bucket && bucket?.public,
        );

        return {
          provider_name: config.provider_name,
          platform: config.platform,
          channel: config.channel,
          enabled: config.enabled,
          buckets,
        };
      })
      .filter((config) => config.enabled && config.buckets.length > 0);

    if (user.role !== "ADMIN" && processedList.length === 0) {
      throw notFound("No buckets found");
    }

    return apiOk(processedList);
  },
  {
    fallbackBody: "Error listing buckets",
  },
);
