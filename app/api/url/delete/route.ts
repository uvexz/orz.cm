import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { deleteUserShortUrl } from "@/lib/short-urls/services";

export const POST = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const { url_id, userId } = await req.json();
    if (!url_id) {
      throw badRequest("url id is required");
    }

    await deleteUserShortUrl(
      user.role === "ADMIN" && userId ? userId : user.id,
      url_id,
    );
    return apiOk("success");
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
