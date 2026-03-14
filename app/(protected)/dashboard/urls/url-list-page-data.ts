import { loadDashboardViewer } from "../dashboard-page-data";

import type { UrlListProps } from "./url-list.types";

export async function loadUrlListPageData(): Promise<UrlListProps> {
  return {
    user: await loadDashboardViewer(),
    action: "/api/url",
  };
}
