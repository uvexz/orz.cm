import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { badRequest } from "@/lib/api/errors";
import { getUrlClicksByIds, getUserShortUrls } from "@/lib/short-urls/services";

export const dynamic = "force-dynamic";

export const GET = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const url = new URL(req.url);
    const pageParam = Number.parseInt(url.searchParams.get("page") || "1", 10);
    const sizeParam = Number.parseInt(url.searchParams.get("size") || "10", 10);
    const userName = url.searchParams.get("userName") || "";
    const slug = url.searchParams.get("slug") || "";
    const target = url.searchParams.get("target") || "";
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const size =
      Number.isFinite(sizeParam) && sizeParam > 0
        ? Math.min(sizeParam, 100)
        : 10;
    const data = await getUserShortUrls(
      user.id,
      1,
      page,
      size,
      user.role,
      userName,
      slug,
      target,
    );

    return apiOk(data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);

export const POST = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const { ids } = await req.json();
    if (!Array.isArray(ids)) {
      throw badRequest("Ids must be an array");
    }

    const normalizedIds = ids.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (normalizedIds.length === 0) {
      return apiOk({});
    }

    const data = await getUrlClicksByIds(normalizedIds, user.id, user.role);
    return apiOk(data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
