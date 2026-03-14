import { ApiError, badRequest, notFound } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  updateUserShortUrl,
  updateUserShortUrlAdmin,
} from "@/lib/short-urls/services";
import { getUserByEmail } from "@/lib/dto/user";
import { createUrlSchema } from "@/lib/validations/url";

export const POST = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const { data, userId, email } = await req.json();
    if (!data?.id) {
      throw badRequest("Url id is required");
    }

    const parsed = createUrlSchema.safeParse(data);
    if (!parsed.success) {
      throw badRequest(parsed.error.flatten());
    }

    const { target, url, prefix, visible, active, id, expiration, password } =
      parsed.data;

    const currentOwnerId = user.role === "ADMIN" && userId ? userId : user.id;
    const targetUser =
      user.role === "ADMIN" && email ? await getUserByEmail(email) : null;

    if (user.role === "ADMIN" && email && !targetUser) {
      throw notFound("User not found");
    }

    const res =
      user.role === "ADMIN"
        ? await updateUserShortUrlAdmin(
            {
              id,
              userId: currentOwnerId,
              userName: user.name || "",
              target,
              url,
              prefix,
              visible,
              active,
              expiration,
              password,
            },
            targetUser?.id ?? currentOwnerId,
          )
        : await updateUserShortUrl({
            id,
            userId: currentOwnerId,
            userName: user.name || "Anonymous",
            target,
            prefix,
            url,
            visible,
            active,
            expiration,
            password,
          });

    if (res.status !== "success") {
      throw new ApiError(400, res.status);
    }
    return apiOk(res.data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
