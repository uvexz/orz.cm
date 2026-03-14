import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAdminApiRoute,
} from "@/lib/api/route";
import {
  getMultipleConfigs,
  updateSystemConfig,
} from "@/lib/dto/system-config";

export const dynamic = "force-dynamic";

export const GET = createAdminApiRoute(
  async (_req: NextRequest, _context: AppRouteHandlerContext) => {
    const configs = await getMultipleConfigs([
      "enable_user_registration",
      "enable_subdomain_apply",
      "system_notification",
      "enable_github_oauth",
      "enable_google_oauth",
      "enable_liunxdo_oauth",
      "enable_resend_email_login",
      "enable_email_password_login",
      "enable_email_catch_all",
      "catch_all_emails",
      "enable_tg_email_push",
      "tg_email_bot_token",
      "tg_email_chat_id",
      "tg_email_template",
      "tg_email_target_white_list",
      "enable_email_registration_suffix_limit",
      "email_registration_suffix_limit_white_list",
      "enable_subdomain_status_email_pusher",
      "enable_email_forward",
      "email_forward_targets",
      "email_forward_white_list",
    ]);

    return apiOk(configs);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

export const POST = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const { key, value, type } = await req.json();
    if (!key || !type) {
      throw badRequest("key and value is required");
    }

    const configs = await getMultipleConfigs([key]);

    if (key in configs) {
      await updateSystemConfig(key, { value, type });
      return apiOk("Success");
    }
    throw badRequest("Invalid key");
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
