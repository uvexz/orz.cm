import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAdminApiRoute,
} from "@/lib/api/route";
import {
  createDomain,
  deleteDomain,
  getAllDomains,
  updateDomain,
} from "@/lib/dto/domains";

// Get domains list
export const dynamic = "force-dynamic";

export const GET = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const size = url.searchParams.get("size");
    const target = url.searchParams.get("target") || "";

    const data = await getAllDomains(
      Number(page || "1"),
      Number(size || "10"),
      target,
    );

    return apiOk(data);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

// Create domain
export const POST = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const { data } = await req.json();
    if (!data || !data.domain_name) {
      throw badRequest("domain_name is required");
    }

    const newDomain = await createDomain({
      domain_name: data.domain_name,
      enable_short_link: !!data.enable_short_link,
      enable_email: !!data.enable_email,
      enable_dns: !!data.enable_dns,
      cf_zone_id: data.cf_zone_id,
      cf_api_key: data.cf_api_key,
      cf_email: data.cf_email,
      cf_record_types: data.cf_record_types,
      cf_api_key_encrypted: false,
      email_provider: data.email_provider,
      resend_api_key: data.resend_api_key,
      brevo_api_key: data.brevo_api_key,
      max_short_links: data.max_short_links,
      max_email_forwards: data.max_email_forwards,
      max_dns_records: data.max_dns_records,
      min_url_length: data.min_url_length,
      min_email_length: data.min_email_length,
      min_record_length: data.min_record_length,
      active: true,
    });

    return apiOk(newDomain);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

// Update domain
export const PUT = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const {
      domain_name,
      enable_short_link,
      enable_email,
      enable_dns,
      cf_zone_id,
      cf_api_key,
      cf_email,
      cf_record_types,
      email_provider,
      resend_api_key,
      brevo_api_key,
      min_url_length,
      min_email_length,
      min_record_length,
      max_short_links,
      max_email_forwards,
      max_dns_records,
      active,
      id,
    } = await req.json();
    if (!id) {
      throw badRequest("domain id is required");
    }

    const updatedDomain = await updateDomain(id, {
      domain_name,
      enable_short_link: !!enable_short_link,
      enable_email: !!enable_email,
      enable_dns: !!enable_dns,
      active: !!active,
      cf_zone_id,
      cf_api_key,
      cf_email,
      cf_record_types,
      cf_api_key_encrypted: false,
      email_provider,
      brevo_api_key,
      resend_api_key,
      min_url_length,
      min_email_length,
      min_record_length,
      max_short_links,
      max_email_forwards,
      max_dns_records,
    });

    return apiOk(updatedDomain);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

// Delete domain
export const DELETE = createAdminApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext) => {
    const { domain_name } = await req.json();
    if (!domain_name) {
      throw badRequest("domain_name is required");
    }

    const deletedDomain = await deleteDomain(domain_name);

    return apiOk(deletedDomain);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
