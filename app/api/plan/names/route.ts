import {
  apiOk,
  createAuthedApiRoute,
  type AppRouteHandlerContext,
} from "@/lib/api/route";
import { badRequest } from "@/lib/api/errors";
import { getPlanNames } from "@/lib/dto/plan";

export const dynamic = "force-dynamic";

export const GET = createAuthedApiRoute(
  async (_req: Request, _context: AppRouteHandlerContext) => {
    const res = await getPlanNames();
    if (!res) {
      throw badRequest("Plans not found");
    }

    return apiOk(res);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
