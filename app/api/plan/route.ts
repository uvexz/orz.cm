import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  apiOk,
  createApiRoute,
  ensureAdmin,
  requireUser,
} from "@/lib/api/route";
import {
  createPlan,
  deletePlan,
  getAllPlans,
  getPlanQuota,
  type PlanQuotaFormData,
  updatePlanQuota,
} from "@/lib/dto/plan";

export const dynamic = "force-dynamic";

function toPlanInput(plan: PlanQuotaFormData): PlanQuotaFormData {
  return {
    id: plan.id,
    name: plan.name,
    slTrackedClicks: plan.slTrackedClicks,
    slNewLinks: plan.slNewLinks,
    slAnalyticsRetention: plan.slAnalyticsRetention,
    slDomains: plan.slDomains,
    slAdvancedAnalytics: plan.slAdvancedAnalytics,
    slCustomQrCodeLogo: plan.slCustomQrCodeLogo,
    rcNewRecords: plan.rcNewRecords,
    emEmailAddresses: plan.emEmailAddresses,
    emDomains: plan.emDomains,
    emSendEmails: plan.emSendEmails,
    stMaxFileSize: plan.stMaxFileSize,
    stMaxTotalSize: plan.stMaxTotalSize,
    stMaxFileCount: plan.stMaxFileCount,
    appSupport: plan.appSupport.toUpperCase(),
    appApiAccess: plan.appApiAccess,
    isActive: plan.isActive,
  };
}

async function requireAdminUser() {
  const user = await requireUser();
  ensureAdmin(user);
  return user;
}

export const GET = createApiRoute(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const team = url.searchParams.get("team");
    const isAll = url.searchParams.get("all") || "0";
    const page = url.searchParams.get("page");
    const size = url.searchParams.get("size");
    const target = url.searchParams.get("target") || "";

    if (team) {
      return apiOk(await getPlanQuota(team));
    }

    if (page || size || target) {
      await requireAdminUser();
      return apiOk(
        await getAllPlans(
          Number(page || "1"),
          Number(size || "10"),
          target,
        ),
      );
    }

    if (isAll === "1") {
      return apiOk(await getAllPlans());
    }

    throw badRequest("Plan not found");
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

export const POST = createApiRoute(
  async (req: NextRequest) => {
    await requireAdminUser();

    const { plan } = await req.json();
    if (!plan) {
      throw badRequest("Invalid request body");
    }

    const data = await createPlan(toPlanInput(plan as PlanQuotaFormData));
    if (!data) {
      throw badRequest("Failed to create plan");
    }

    return apiOk(data);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

export const PUT = createApiRoute(
  async (req: NextRequest) => {
    await requireAdminUser();

    const { plan } = await req.json();
    if (!plan) {
      throw badRequest("Invalid request body");
    }

    const res = await updatePlanQuota(toPlanInput(plan as PlanQuotaFormData));
    if (!res) {
      throw badRequest("Failed to update plan");
    }

    return apiOk(res);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);

export const DELETE = createApiRoute(
  async (req: NextRequest) => {
    await requireAdminUser();

    const { id } = await req.json();
    if (!id) {
      throw badRequest("id is required");
    }

    const data = await deletePlan(id);
    if (!data) {
      throw badRequest("Failed to delete plan");
    }

    return apiOk(data);
  },
  {
    fallbackBody: "Server error",
    logMessage: "[Error]",
  },
);
