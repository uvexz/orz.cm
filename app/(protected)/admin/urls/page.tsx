import { constructMetadata } from "@/lib/utils";

import UserUrlsList from "../../dashboard/urls/url-list";
import { loadUrlListPageData } from "../../dashboard/urls/url-list-page-data";

export const metadata = constructMetadata({
  title: "Links",
  description: "List and manage short links.",
});

export default async function DashboardPage() {
  const data = await loadUrlListPageData();

  return <UserUrlsList {...data} />;
}
