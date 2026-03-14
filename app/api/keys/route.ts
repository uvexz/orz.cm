import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { generateApiKey } from "@/lib/dto/api-key";

export const POST = createAuthedApiRoute(
  async (_request: Request, _context: AppRouteHandlerContext, { user }) => {
    const result = await generateApiKey(user.id);

    if (!result) {
      return apiOk({ statusText: "Server error" }, 501);
    }

    return apiOk(result.apiKey);
  },
  {
    fallbackBody: { statusText: "Server error" },
  },
);
