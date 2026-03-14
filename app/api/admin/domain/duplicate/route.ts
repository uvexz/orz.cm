import { NextRequest } from "next/server";

import { badRequest, notFound } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAdminApiRoute,
} from "@/lib/api/route";
import { createDomain, getDomainByName } from "@/lib/dto/domains";

export const POST = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const { domain } = await req.json();
    if (!domain) {
      throw badRequest("Domain name is required");
    }

    const target_domain = await getDomainByName(domain);
    if (!target_domain) {
      throw notFound("Domain not found");
    }

    const newDomain = await createDomain({
      domain_name: target_domain.domain_name + "-copy",
      enable_short_link: !!target_domain.enable_short_link,
      enable_email: !!target_domain.enable_email,
      enable_dns: !!target_domain.enable_dns,
      cf_zone_id: target_domain.cf_zone_id,
      cf_api_key: target_domain.cf_api_key,
      cf_email: target_domain.cf_email,
      cf_record_types: target_domain.cf_record_types,
      cf_api_key_encrypted: false,
      email_provider: target_domain.email_provider,
      resend_api_key: target_domain.resend_api_key,
      brevo_api_key: target_domain.brevo_api_key,
      max_short_links: target_domain.max_short_links,
      max_email_forwards: target_domain.max_email_forwards,
      max_dns_records: target_domain.max_dns_records,
      min_url_length: target_domain.min_url_length,
      min_email_length: target_domain.min_email_length,
      min_record_length: target_domain.min_record_length,
      active: true,
    });

    if (!newDomain) {
      throw badRequest("Failed to create domain");
    }

    return apiOk("Success");
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
