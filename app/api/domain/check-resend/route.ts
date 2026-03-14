import { NextRequest } from "next/server";
import { Resend } from "resend";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const url = new URL(req.url);
    const api_key = url.searchParams.get("api_key") || "";
    const domain = url.searchParams.get("domain") || "";

    if (!api_key || !domain) {
      throw badRequest("api_key and domain are required");
    }
    if (!user.email) {
      throw badRequest("Missing account email");
    }

    const resend = new Resend(api_key);
    const { error } = await resend.emails.send({
      from: `test@${domain}`,
      to: user.email,
      subject: "Test Resend API Key",
      html: "This is a test email sent using Resend API Key.",
    });

    if (error) {
      console.log("Resend error:", error);
      throw badRequest(error.message);
    }

    return apiOk(200);
  },
  {
    fallbackBody: 500,
  },
);
