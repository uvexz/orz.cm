import { env } from "@/env.mjs";
import { getMultipleConfigs } from "@/lib/dto/system-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await getMultipleConfigs([
      "enable_user_registration",
      "enable_subdomain_apply",
      "system_notification",
      "enable_github_oauth",
      "enable_google_oauth",
      "enable_liunxdo_oauth",
      "enable_resend_email_login",
      "enable_email_password_login",
      "enable_email_registration_suffix_limit",
      "email_registration_suffix_limit_white_list",
    ]);
    return Response.json({
      google:
        configs.enable_google_oauth &&
        !!env.GOOGLE_CLIENT_ID &&
        !!env.GOOGLE_CLIENT_SECRET,
      github:
        configs.enable_github_oauth &&
        !!env.GITHUB_ID &&
        !!env.GITHUB_SECRET,
      linuxdo:
        configs.enable_liunxdo_oauth &&
        !!env.LinuxDo_CLIENT_ID &&
        !!env.LinuxDo_CLIENT_SECRET,
      resend:
        configs.enable_resend_email_login &&
        (!!env.RESEND_API_KEY || !!env.BREVO_API_KEY),
      credentials: configs.enable_email_password_login,
      registration: configs.enable_user_registration,
      enableSuffixLimit: configs.enable_email_registration_suffix_limit,
      suffixWhiteList: configs.email_registration_suffix_limit_white_list,
    });
  } catch (error) {
    console.log("[Error]", error);
  }
}
