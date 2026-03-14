import { constructMetadata } from "@/lib/utils";
import { AdminOverview } from "./admin-overview";
import { loadAdminDashboardData } from "./admin-page-data";

export const metadata = constructMetadata({
  title: "Admin",
  description: "Admin page for only admin management.",
});

export default async function AdminPage() {
  const data = await loadAdminDashboardData();

  return <AdminOverview data={data} />;
}
