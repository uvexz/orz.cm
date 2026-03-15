import { ApiError, badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  updateUserShortUrlActive,
} from "@/lib/short-urls/services";

export const POST = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const { id, active } = await req.json();

    if (!id) {
      throw badRequest({
        statusText: "Id is required",
      });
    }

    if (active !== 0 && active !== 1) {
      throw badRequest({
        statusText: "Active must be 0 or 1",
      });
    }

    const res = await updateUserShortUrlActive(user.id, id, active, user.role);
    if (res.status !== "success") {
      throw new ApiError(400, "Update failed");
    }
    return apiOk(res.data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
