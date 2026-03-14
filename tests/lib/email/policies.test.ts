import { describe, expect, it } from "bun:test";

import {
  assertCreatableEmailAddress,
  assertEmailDomainAllowed,
  assertEmailPrefixLength,
  normalizeEmailAddress,
  assertSendEmailPayload,
  canAccessAllUserEmails,
} from "@/lib/email/policies";

const domains = [
  {
    domain_name: "example.com",
    min_email_length: 5,
  },
];

describe("lib/email/policies", () => {
  it("allows admins to opt into all-user email views", () => {
    expect(canAccessAllUserEmails("ADMIN", true)).toBe(true);
    expect(canAccessAllUserEmails("USER", true)).toBe(false);
    expect(canAccessAllUserEmails("ADMIN", false)).toBe(false);
  });

  it("rejects reserved email prefixes", () => {
    expect(() => assertCreatableEmailAddress("admin@example.com")).toThrow(
      "Invalid email address",
    );
    expect(() => assertCreatableEmailAddress("demo@example.com")).not.toThrow();
  });

  it("normalizes and validates email addresses", () => {
    expect(normalizeEmailAddress(" Demo@Example.com ")).toBe("demo@example.com");
    expect(() => assertCreatableEmailAddress("not-an-email")).toThrow(
      "Invalid email address",
    );
  });

  it("rejects domains outside the configured allow list", () => {
    expect(() =>
      assertEmailDomainAllowed("hello@blocked.com", domains),
    ).toThrow("Invalid email suffix address");
  });

  it("enforces the minimum prefix length for a domain", () => {
    expect(() => assertEmailPrefixLength("abc@example.com", domains)).toThrow(
      "Email address length must be at least 5",
    );
    expect(() =>
      assertEmailPrefixLength("hello@example.com", domains),
    ).not.toThrow();
  });

  it("validates send-email payload completeness and addresses", () => {
    expect(() =>
      assertSendEmailPayload({
        from: "sender@example.com",
        to: "receiver@example.com",
        subject: "Hello",
        html: "<p>World</p>",
      }),
    ).not.toThrow();

    expect(() =>
      assertSendEmailPayload({
        from: "bad-from",
        to: "receiver@example.com",
        subject: "Hello",
        html: "<p>World</p>",
      }),
    ).toThrow("Invalid email address");
  });
});
