import "server-only";

import { siteConfig } from "@/config/site";
import { env } from "@/env.mjs";
import { brevoSendEmail } from "@/lib/email/brevo";
import { resend } from "@/lib/email/resend";
import { getVerificationEmailHtml } from "@/lib/email/templates";

export async function sendAuthMagicLink(email: string, url: string) {
  const subject = `Sign in to ${siteConfig.name}`;
  const html = getVerificationEmailHtml({
    url,
    appName: siteConfig.name,
  });
  const resendFrom = env.EMAIL_FROM
    ? env.EMAIL_FROM_NAME
      ? `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM}>`
      : env.EMAIL_FROM
    : `${siteConfig.name} <no-reply@orz.cm>`;

  if (env.RESEND_API_KEY) {
    const { error } = await resend.emails.send({
      from: resendFrom,
      to: [email],
      subject,
      html,
    });

    if (error) {
      throw new Error(`Failed to send auth email with Resend: ${error.message}`);
    }

    return;
  }

  const result = await brevoSendEmail({
    to: email,
    subject,
    html,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME || siteConfig.name,
  });

  if (!result.success) {
    throw new Error("Failed to send auth email with Brevo.");
  }
}
