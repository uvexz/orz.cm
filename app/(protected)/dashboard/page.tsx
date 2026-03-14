import { constructMetadata } from "@/lib/utils";
import { DashboardOverview } from "./dashboard-overview";
import { loadDashboardOverviewData } from "./dashboard-page-data";

export const metadata = constructMetadata({
  title: "Dashboard",
  description: "List and manage records.",
});

export default async function DashboardPage() {
  const data = await loadDashboardOverviewData();

  return <DashboardOverview data={data} />;
}
