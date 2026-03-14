import { EXPIRATION_ENUMS } from "@/lib/enums";

import type { ShortUrlStatusRecord, UrlStatusStats, UserRole } from "./types";

export function shouldRestrictShortUrlsToUser(role: UserRole) {
  return role === "USER";
}

export function isValidExpirationValue(expiration: string): boolean {
  return EXPIRATION_ENUMS.some((item) => item.value === expiration);
}

export function calculateUrlStatusStats(
  urlRecords: ShortUrlStatusRecord[],
): UrlStatusStats {
  const now = Date.now();
  const stats: UrlStatusStats = {
    total: urlRecords.length,
    actived: 0,
    disabled: 0,
    expired: 0,
    passwordprotected: 0,
  };

  urlRecords.forEach((record) => {
    const updatedAt = new Date(record.updatedAt || record.createdAt).getTime();

    let isExpired = false;
    if (record.expiration !== "-1" && isValidExpirationValue(record.expiration)) {
      const expirationMilliseconds = Number(record.expiration) * 1000;
      isExpired = now > updatedAt + expirationMilliseconds;
    }

    const isDisabled = record.active === 0;
    const hasPassword = Boolean(record.password && record.password.trim());

    if (isExpired) {
      stats.expired++;
    } else if (isDisabled) {
      stats.disabled++;
    } else if (hasPassword) {
      stats.passwordprotected++;
    } else {
      stats.actived++;
    }
  });

  return stats;
}
