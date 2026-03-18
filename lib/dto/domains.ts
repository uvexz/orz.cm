import { desc, eq, like, sql, type SQL } from "drizzle-orm";

import { CACHE_TTL, delCacheMany, getOrSetCache } from "@/lib/cache";

import { db } from "../db";
import { domains } from "../db/schema";

export const FeatureMap = {
  short: "enable_short_link",
  email: "enable_email",
  record: "enable_dns",
} as const;

type FeatureColumnName = (typeof FeatureMap)[keyof typeof FeatureMap];

export interface DomainConfig {
  domain_name: string;
  enable_short_link: boolean;
  enable_email: boolean;
  enable_dns: boolean;
  cf_zone_id: string | null;
  cf_api_key: string | null;
  cf_email: string | null;
  cf_record_types: string;
  cf_api_key_encrypted: boolean;
  email_provider: string;
  resend_api_key: string | null;
  brevo_api_key: string | null;
  min_url_length: number;
  min_email_length: number;
  min_record_length: number;
  max_short_links: number | null;
  max_email_forwards: number | null;
  max_dns_records: number | null;
  active: boolean;
}

export interface DomainFormData extends DomainConfig {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
}

function getFeatureColumn(feature: string) {
  switch (feature as FeatureColumnName) {
    case "enable_short_link":
      return domains.enable_short_link;
    case "enable_email":
      return domains.enable_email;
    case "enable_dns":
      return domains.enable_dns;
    default:
      return null;
  }
}

function getDomainsByFeatureCacheKey(feature: string, admin: boolean) {
  return `domains:feature:${feature}:${admin ? "admin" : "public"}`;
}

function getDomainByNameCacheKey(domainName: string) {
  return `domains:name:${domainName}`;
}

function getDomainEmailProviderCacheKey(domainName: string) {
  return `domains:email-provider:${domainName}`;
}

function getConfiguredEmailDomainsCacheKey() {
  return "domains:configured-email";
}

async function invalidateDomainCache(domainName?: string | null) {
  await delCacheMany([
    getDomainsByFeatureCacheKey("enable_short_link", false),
    getDomainsByFeatureCacheKey("enable_short_link", true),
    getDomainsByFeatureCacheKey("enable_email", false),
    getDomainsByFeatureCacheKey("enable_email", true),
    getDomainsByFeatureCacheKey("enable_dns", false),
    getDomainsByFeatureCacheKey("enable_dns", true),
    getConfiguredEmailDomainsCacheKey(),
    ...(domainName
      ? [
          getDomainByNameCacheKey(domainName),
          getDomainEmailProviderCacheKey(domainName),
        ]
      : []),
  ]);
}

export async function getAllDomains(page = 1, size = 10, target: string = "") {
  try {
    const whereClause = target ? like(domains.domain_name, `%${target}%`) : undefined;

    let totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(domains)
      .$dynamic();
    let listQuery = db
      .select()
      .from(domains)
      .orderBy(desc(domains.updatedAt))
      .limit(size)
      .offset((page - 1) * size)
      .$dynamic();

    if (whereClause) {
      totalQuery = totalQuery.where(whereClause);
      listQuery = listQuery.where(whereClause);
    }

    const [[totalResult], list] = await Promise.all([totalQuery, listQuery]);

    return {
      list,
      total: Number(totalResult?.count ?? 0),
    };
  } catch (error) {
    throw new Error(`Failed to fetch domain config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getDomainsByFeature(
  feature: string,
  admin: boolean = false,
) {
  try {
    const featureColumn = getFeatureColumn(feature);
    if (!featureColumn) {
      return [];
    }

    return getOrSetCache(
      getDomainsByFeatureCacheKey(feature, admin),
      CACHE_TTL.dto,
      async () => {
        if (admin) {
          return db
            .select({
              domain_name: domains.domain_name,
              cf_record_types: domains.cf_record_types,
              min_url_length: domains.min_url_length,
              min_email_length: domains.min_email_length,
              min_record_length: domains.min_record_length,
              enable_short_link: domains.enable_short_link,
              enable_email: domains.enable_email,
              enable_dns: domains.enable_dns,
              cf_zone_id: domains.cf_zone_id,
              cf_api_key: domains.cf_api_key,
              cf_email: domains.cf_email,
            })
            .from(domains)
            .where(eq(featureColumn, true))
            .orderBy(desc(domains.updatedAt));
        }

        return db
          .select({
            domain_name: domains.domain_name,
            cf_record_types: domains.cf_record_types,
            min_url_length: domains.min_url_length,
            min_email_length: domains.min_email_length,
            min_record_length: domains.min_record_length,
          })
          .from(domains)
          .where(eq(featureColumn, true))
          .orderBy(desc(domains.updatedAt));
      },
    );
  } catch (error) {
    throw new Error(`Failed to fetch domain config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getDomainByName(domain_name: string) {
  return getOrSetCache(getDomainByNameCacheKey(domain_name), CACHE_TTL.dto, async () => {
    const [domain] = await db
      .select()
      .from(domains)
      .where(eq(domains.domain_name, domain_name))
      .limit(1);

    return domain ?? null;
  });
}

export async function checkDomainIsConfiguratedEmailProvider(
  domain_name: string,
) {
  try {
    return getOrSetCache(
      getDomainEmailProviderCacheKey(domain_name),
      CACHE_TTL.dto,
      async () => {
        const [domain] = await db
          .select({
            email_provider: domains.email_provider,
            resend_api_key: domains.resend_api_key,
            brevo_api_key: domains.brevo_api_key,
          })
          .from(domains)
          .where(eq(domains.domain_name, domain_name))
          .limit(1);

        if (domain?.email_provider === "Resend") {
          return { email_key: domain.resend_api_key, provider: "Resend" };
        }
        if (domain?.email_provider === "Brevo") {
          return { email_key: domain.brevo_api_key, provider: "Brevo" };
        }
        return { email_key: null, provider: null };
      },
    );
  } catch (error) {
    throw new Error(`Failed to fetch domain config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getConfiguredEmailDomains() {
  try {
    return getOrSetCache(
      getConfiguredEmailDomainsCacheKey(),
      CACHE_TTL.dto,
      async () =>
        db
          .select({
            domain_name: domains.domain_name,
            brevo_api_key: domains.brevo_api_key,
          })
          .from(domains)
          .where(eq(domains.email_provider, "Brevo"))
          .orderBy(desc(domains.updatedAt)),
    );
  } catch (error) {
    return [];
  }
}

export async function createDomain(data: DomainConfig) {
  try {
    const [createdDomain] = await db
      .insert(domains)
      .values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await invalidateDomainCache(data.domain_name);
    return createdDomain ?? null;
  } catch (error) {
    throw new Error(`Failed to create domain: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateDomain(id: string, data: Partial<DomainConfig>) {
  try {
    const [currentDomain] = await db
      .select({ domain_name: domains.domain_name })
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    const [updatedDomain] = await db
      .update(domains)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, id))
      .returning();

    await invalidateDomainCache(currentDomain?.domain_name);
    if (data.domain_name && data.domain_name !== currentDomain?.domain_name) {
      await invalidateDomainCache(data.domain_name);
    }

    return updatedDomain ?? null;
  } catch (error) {
    throw new Error(`Failed to update domain: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteDomain(domain_name: string) {
  try {
    const [deletedDomain] = await db
      .delete(domains)
      .where(eq(domains.domain_name, domain_name))
      .returning();

    await invalidateDomainCache(domain_name);
    return deletedDomain ?? null;
  } catch (error) {
    throw new Error("Failed to delete domain");
  }
}
