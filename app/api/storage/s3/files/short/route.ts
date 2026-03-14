import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { updateUserFile } from "@/lib/files/services";
import { getUserShortLinksByIds } from "@/lib/short-urls/services";

export const POST = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { ids } = await request.json();
    if (!ids) {
      throw badRequest({ error: "Ids are required" });
    }

    const data = await getUserShortLinksByIds(
      ids,
      user.role === "ADMIN" ? undefined : user.id,
    );

    const dataMap = new Map(data.map((item) => [item.id, item]));

    const orderedResults = ids.map((id) => {
      const item = dataMap.get(id);
      return item ? `${item.prefix}/${item.url}` : "";
    });

    return apiOk({
      urls: orderedResults,
    });
  },
  {
    fallbackBody: "Error generating download URL",
  },
);

export const PUT = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext) => {
    const { urlId, fileId } = await request.json();

    if (!urlId || !fileId) {
      throw badRequest({ error: "Slug and fileId are required" });
    }

    const res = await updateUserFile(fileId, {
      shortUrlId: urlId,
    });

    if (!res.success) {
      throw badRequest({ error: res.error });
    }

    return apiOk({ success: true });
  },
  {
    fallbackBody: { error: "Error generating download URL" },
  },
);
