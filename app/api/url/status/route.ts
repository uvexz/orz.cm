import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getUrlStatusOptimized } from "@/lib/short-urls/services";

export const GET = createAuthedApiRoute(
  async (_req: Request, _context: AppRouteHandlerContext, { user }) => {
    const status = await getUrlStatusOptimized(user.id, user.role);
    return apiOk(status);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
