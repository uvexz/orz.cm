import { reservedAddressSuffix } from "@/lib/enums";
import { isValidEmail } from "@/lib/utils";

import type { EmailDomainRule, UserRole } from "./types";

type PolicyError = Error & {
  code?: string;
};

function createPolicyError(message: string, code?: string) {
  const error = new Error(message) as PolicyError;
  if (code) {
    error.code = code;
  }
  return error;
}

export function normalizeEmailAddress(emailAddress: string) {
  return emailAddress.trim().toLowerCase();
}

export function canAccessAllUserEmails(role: UserRole, includeAll: boolean) {
  return role === "ADMIN" && includeAll;
}

export function assertCreatableEmailAddress(emailAddress: string) {
  if (!isValidEmail(emailAddress)) {
    throw createPolicyError("Invalid email address", "INVALID_EMAIL_ADDRESS");
  }

  const prefix = emailAddress.split("@")[0];
  if (reservedAddressSuffix.includes(prefix)) {
    throw createPolicyError("Invalid email address", "INVALID_EMAIL_ADDRESS");
  }
}

export function assertEmailDomainAllowed(
  emailAddress: string,
  domains: EmailDomainRule[],
) {
  const [, suffix] = emailAddress.split("@");
  if (!domains.length || !domains.some((domain) => domain.domain_name === suffix)) {
    throw createPolicyError(
      "Invalid email suffix address",
      "INVALID_EMAIL_SUFFIX",
    );
  }
}

export function assertEmailPrefixLength(
  emailAddress: string,
  domains: EmailDomainRule[],
) {
  const [prefix, suffix] = emailAddress.split("@");
  const minLength =
    domains.find((domain) => domain.domain_name === suffix)?.min_email_length ?? 3;

  if (!prefix || prefix.length < minLength) {
    throw createPolicyError(
      `Email address length must be at least ${minLength}`,
      "EMAIL_PREFIX_TOO_SHORT",
    );
  }
}

export function assertSendEmailPayload(
  input: {
    from?: string;
    to?: string;
    subject?: string;
    html?: string;
  },
): asserts input is {
  from?: string;
  to?: string;
  subject?: string;
  html?: string;
} & {
  from: string;
  to: string;
  subject: string;
  html: string;
} {
  if (!input.from || !input.to || !input.subject || !input.html) {
    throw createPolicyError("Missing required fields", "MISSING_REQUIRED_FIELDS");
  }

  if (!isValidEmail(input.from) || !isValidEmail(input.to)) {
    throw createPolicyError("Invalid email address", "INVALID_EMAIL_ADDRESS");
  }
}

export function assertConfiguredEmailProvider(
  emailKey: string | null,
): asserts emailKey is string {
  if (!emailKey) {
    throw createPolicyError(
      "This domain is not configured for sending emails",
      "EMAIL_PROVIDER_NOT_CONFIGURED",
    );
  }
}

export function assertEmailRecordExists<T>(
  record: T | null | undefined,
  message: string,
): asserts record is T {
  if (!record) {
    throw createPolicyError(message);
  }
}

export function assertAccessibleEmailIds(ids: string[], message: string) {
  if (ids.length === 0) {
    throw createPolicyError(message);
  }
}
