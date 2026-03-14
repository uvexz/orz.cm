import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getUrlClicksByIds, getUserShortUrls } from "@/lib/short-urls/services";

export const dynamic = "force-dynamic";

export const GET = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const size = url.searchParams.get("size");
    const userName = url.searchParams.get("userName") || "";
    const slug = url.searchParams.get("slug") || "";
    const target = url.searchParams.get("target") || "";
    const data = await getUserShortUrls(
      user.id,
      1,
      Number(page || "1"),
      Number(size || "10"),
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
    const data = await getUrlClicksByIds(ids, user.id, user.role);
    return apiOk(data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
