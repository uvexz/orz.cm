import { redirect } from "next/navigation";

import {
  getAllUserEmailsCount,
  getAllUserInboxEmailsCount,
} from "@/lib/dto/email";
import { getScrapeStatsByType } from "@/lib/dto/scrape";
import { getUserShortUrlCount } from "@/lib/dto/short-urls";
import { getAllUsersActiveApiKeyCount, getAllUsersCount } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

export type ScrapeChartDatum = Awaited<
  ReturnType<typeof getScrapeStatsByType>
>[number];

function mergeScrapeStats(...groups: ScrapeChartDatum[][]) {
  return groups.flat();
}

export interface AdminDashboardData {
  viewerId: string;
  userCount: number;
  shortUrlStats: {
    total: number;
    monthTotal: number;
    limit: number;
  };
  emailStats: {
    total: number;
    monthTotal: number;
    limit: number;
  };
  inboxStats: {
    total: number;
    monthTotal: number;
    limit: number;
  };
  requestStats: ScrapeChartDatum[];
  apiKeyStats: {
    totalUser: number;
    total: number;
  };
  qrScreenshotStats: ScrapeChartDatum[];
  screenshotMetaStats: ScrapeChartDatum[];
  markdownTextStats: ScrapeChartDatum[];
}

export async function loadAdminDashboardData(): Promise<AdminDashboardData> {
  const user = await getCurrentUser();
  if (!user?.id || user.role !== "ADMIN") {
    redirect("/login");
  }

  const [
    userCount,
    shortUrlCount,
    emailCount,
    inboxCount,
    activeApiKeyCount,
    screenshot30d,
    meta30d,
    markdown30d,
    text30d,
    qr30d,
    screenshot90d,
    qr90d,
    meta90d,
    markdown90d,
    text90d,
  ] = await Promise.all([
    getAllUsersCount(),
    getUserShortUrlCount(user.id, 1, "ADMIN"),
    getAllUserEmailsCount(user.id, "ADMIN"),
    getAllUserInboxEmailsCount(),
    getAllUsersActiveApiKeyCount(),
    getScrapeStatsByType("screenshot", "30d"),
    getScrapeStatsByType("meta-info", "30d"),
    getScrapeStatsByType("markdown", "30d"),
    getScrapeStatsByType("text", "30d"),
    getScrapeStatsByType("qrcode", "30d"),
    getScrapeStatsByType("screenshot", "90d"),
    getScrapeStatsByType("qrcode", "90d"),
    getScrapeStatsByType("meta-info", "90d"),
    getScrapeStatsByType("markdown", "90d"),
    getScrapeStatsByType("text", "90d"),
  ]);

  return {
    viewerId: user.id,
    userCount,
    shortUrlStats: {
      total: shortUrlCount.total,
      monthTotal: shortUrlCount.month_total,
      limit: 1000000,
    },
    emailStats: {
      total: emailCount.total,
      monthTotal: emailCount.month_total,
      limit: 1000000,
    },
    inboxStats: {
      total: inboxCount.total,
      monthTotal: inboxCount.month_total,
      limit: 1000000,
    },
    requestStats: mergeScrapeStats(
      screenshot30d,
      meta30d,
      markdown30d,
      text30d,
      qr30d,
    ),
    apiKeyStats: {
      totalUser: userCount,
      total: activeApiKeyCount,
    },
    qrScreenshotStats: mergeScrapeStats(qr90d, screenshot90d),
    screenshotMetaStats: mergeScrapeStats(screenshot90d, meta90d),
    markdownTextStats: mergeScrapeStats(markdown90d, text90d),
  };
}
