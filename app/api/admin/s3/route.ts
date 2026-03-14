import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAdminApiRoute,
} from "@/lib/api/route";
import {
  getMultipleConfigs,
  updateSystemConfig,
} from "@/lib/dto/system-config";

export const dynamic = "force-dynamic";

export const GET = createAdminApiRoute(
  async (_req: NextRequest, _context: AppRouteHandlerContext) => {
    const configs = await getMultipleConfigs(["s3_config_list"]);

    return apiOk(configs);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

export const POST = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const { key, value, type } = await req.json();
    if (!key || !type) {
      throw badRequest("key and value is required");
    }

    const configs = await getMultipleConfigs([key]);

    if (key in configs) {
      await updateSystemConfig(key, { value, type });
      return apiOk("Success");
    }
    throw badRequest("Invalid key");
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
