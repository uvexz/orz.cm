import type { QueryUserFileOptions } from "./types";

export function normalizeUserFileQueryOptions(
  options: QueryUserFileOptions = {},
) {
  return {
    ...options,
    page: options.page ?? 1,
    limit: options.limit ?? 20,
    orderBy: options.orderBy ?? "createdAt",
    order: options.order ?? "desc",
  };
}
