import type { UserRole } from "@/lib/db/types";
import type { ShortUrlFormData } from "@/lib/short-urls/types";

export interface UrlListViewer {
  id: string;
  name: string;
  apiKey: string;
  role: UserRole;
  team: string;
}

export interface UrlListProps {
  user: UrlListViewer;
  action: string;
}

export interface UrlListResponse {
  total: number;
  list: ShortUrlFormData[];
}

export interface UrlListSearchParams {
  slug: string;
  target: string;
  userName: string;
}

export type UrlListSearchType = keyof UrlListSearchParams;

export function buildUrlListQuery(
  action: string,
  page: number,
  size: number,
  searchParams: UrlListSearchParams,
) {
  return `${action}?page=${page}&size=${size}&slug=${searchParams.slug}&userName=${searchParams.userName}&target=${searchParams.target}`;
}
