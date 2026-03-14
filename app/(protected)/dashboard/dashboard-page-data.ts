import { redirect } from "next/navigation";

import { getAllUserEmailsCount } from "@/lib/dto/email";
import { getPlanQuota, type PlanQuota } from "@/lib/dto/plan";
import { getUserShortUrlCount } from "@/lib/dto/short-urls";
import { getCurrentUser } from "@/lib/session";
import type { UrlListViewer } from "./urls/url-list.types";

export interface DashboardOverviewData {
  user: UrlListViewer;
  plan: PlanQuota;
  emailStats: {
    total: number;
    monthTotal: number;
  };
  shortUrlStats: {
    total: number;
    monthTotal: number;
  };
}

function normalizeViewer(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user?.id) {
    redirect("/login");
  }

  return {
    id: user.id,
    name: user.name || "",
    apiKey: user.apiKey || "",
    role: user.role,
    team: user.team,
  } satisfies UrlListViewer;
}

export async function loadDashboardViewer(): Promise<UrlListViewer> {
  const user = await getCurrentUser();
  return normalizeViewer(user);
}

export async function loadDashboardOverviewData(): Promise<DashboardOverviewData> {
  const user = await loadDashboardViewer();
  const [plan, emailCount, shortUrlCount] = await Promise.all([
    getPlanQuota(user.team),
    getAllUserEmailsCount(user.id),
    getUserShortUrlCount(user.id),
  ]);

  return {
    user,
    plan,
    emailStats: {
      total: emailCount.total,
      monthTotal: emailCount.month_total,
    },
    shortUrlStats: {
      total: shortUrlCount.total,
      monthTotal: shortUrlCount.month_total,
    },
  };
}
