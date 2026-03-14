import { ApiError, badRequest, conflict, hasErrorCode } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  assertNoQuota,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { getDomainsByFeature } from "@/lib/dto/domains";
import { getPlanQuota } from "@/lib/dto/plan";
import { createUserShortUrl } from "@/lib/short-urls/services";
import { restrictByTimeRange } from "@/lib/team";
import { createUrlSchema } from "@/lib/validations/url";

export const POST = createAuthedApiRoute(
  async (req: Request, _context: AppRouteHandlerContext, { user }) => {
    const plan = await getPlanQuota(user.team);
    const limit = await restrictByTimeRange({
      model: "userUrl",
      userId: user.id,
      limit: plan.slNewLinks,
      rangeType: "month",
    });
    assertNoQuota(limit);

    const { data } = await req.json();
    const parsed = createUrlSchema.safeParse(data);
    if (!parsed.success) {
      throw badRequest(parsed.error.flatten());
    }

    const { target, url, prefix, visible, active, expiration, password } =
      parsed.data;

    const zones = await getDomainsByFeature("enable_short_link");
    if (
      !zones.length ||
      !zones.map((zone) => zone.domain_name).includes(prefix)
    ) {
      throw badRequest("Invalid domain");
    }

    const res = await createUserShortUrl({
      userId: user.id,
      userName: user.name || "Anonymous",
      target,
      url,
      prefix,
      visible,
      active,
      expiration,
      password,
    });
    if (res.status !== "success") {
      if (hasErrorCode(res.status, "UNIQUE_CONSTRAINT")) {
        throw conflict("Short link already exists");
      }

      throw new ApiError(502, res.status);
    }
    return apiOk(res.data);
  },
  {
    fallbackBody: "Internal Server Error",
  },
);
