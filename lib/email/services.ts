import { Resend } from "resend";

import { ApiError } from "@/lib/api/errors";
import {
  checkDomainIsConfiguratedEmailProvider,
  getDomainsByFeature,
} from "@/lib/dto/domains";
import { getPlanQuota } from "@/lib/dto/plan";
import { brevoSendEmail } from "@/lib/email/brevo";
import { restrictByTimeRange } from "@/lib/team";

import {
  assertAccessibleEmailIds,
  assertConfiguredEmailProvider,
  assertCreatableEmailAddress,
  assertEmailDomainAllowed,
  assertEmailPrefixLength,
  assertEmailRecordExists,
  assertSendEmailPayload,
  canAccessAllUserEmails,
} from "./policies";
import {
  countInboxEmails,
  countUserEmails,
  countUserSendEmails,
  deleteForwardEmailsByIds,
  findActiveUserEmailByAddress,
  findOwnedUserEmail,
  findReadableEmailId,
  findReadableEmailIds,
  findUserById,
  findUserEmailById,
  findUserEmailIdByAddress,
  insertForwardEmail,
  insertUserEmail,
  insertUserSendEmail,
  listForwardEmailsByAddress,
  listUserEmailsWithStats,
  listUserSendEmails,
  softDeleteUserEmailByAddress,
  softDeleteUserEmailById,
  updateAllForwardEmailsReadState,
  updateForwardEmailReadState,
  updateForwardEmailsReadState,
  updateUserEmailById,
} from "./queries";
import type { EmailActor, EmailApiActor, OriginalEmail, UserRole } from "./types";

const READ_PERMISSION_ERROR =
  "There are no valid emails to mark as read or you do not have permission";
const READ_ALL_PERMISSION_ERROR =
  "There are no valid emails or you do not have permission";

async function assertEmailQuota(
  userId: string,
  team: string,
  model: "userEmail" | "userSendEmail",
  limitKey: "emEmailAddresses" | "emSendEmails",
) {
  const plan = await getPlanQuota(team);
  const limit = await restrictByTimeRange({
    model,
    userId,
    limit: plan[limitKey],
    rangeType: "month",
  });

  if (limit) {
    throw new ApiError(limit.status, limit.statusText);
  }
}

export async function saveForwardEmail(emailData: OriginalEmail) {
  const userEmail = await findUserEmailIdByAddress(emailData.to);
  if (!userEmail) {
    return null;
  }

  return insertForwardEmail(emailData);
}

export async function getAllUserEmails(
  userId: string,
  page: number,
  size: number,
  search: string,
  admin: boolean,
  onlyUnread = false,
) {
  return listUserEmailsWithStats(userId, page, size, search, admin, onlyUnread);
}

export async function getAllUserEmailsForActor(
  actor: EmailActor,
  options: {
    page: number;
    size: number;
    search: string;
    includeAll: boolean;
    unreadOnly: boolean;
  },
) {
  return getAllUserEmails(
    actor.id,
    options.page,
    options.size,
    options.search,
    canAccessAllUserEmails(actor.role, options.includeAll),
    options.unreadOnly,
  );
}

export async function getAllUserEmailsCount(
  userId: string,
  role: UserRole = "USER",
) {
  return countUserEmails(userId, role);
}

export async function getAllUserInboxEmailsCount() {
  return countInboxEmails();
}

export async function createUserEmail(userId: string, emailAddress: string) {
  assertCreatableEmailAddress(emailAddress);

  const user = await findUserById(userId);
  if (!user) {
    throw new Error("Invalid userId");
  }

  return insertUserEmail(userId, emailAddress);
}

export async function createManagedUserEmail(
  actor: EmailActor,
  emailAddress: string,
) {
  await assertEmailQuota(actor.id, actor.team, "userEmail", "emEmailAddresses");
  return createUserEmail(actor.id, emailAddress);
}

export async function createApiUserEmail(
  actor: EmailApiActor,
  emailAddress: string,
) {
  await assertEmailQuota(
    actor.id,
    actor.team ?? "",
    "userEmail",
    "emEmailAddresses",
  );

  const domains = await getDomainsByFeature("enable_email", true);
  assertEmailDomainAllowed(emailAddress, domains);
  assertEmailPrefixLength(emailAddress, domains);

  return createUserEmail(actor.id, emailAddress);
}

export async function getUserEmailById(id: string) {
  return findUserEmailById(id);
}

export async function updateUserEmail(id: string, emailAddress: string) {
  assertCreatableEmailAddress(emailAddress);

  const userEmail = await updateUserEmailById(id, emailAddress);
  assertEmailRecordExists(
    userEmail,
    "User email not found or already deleted",
  );
  return userEmail;
}

export async function deleteUserEmail(id: string) {
  return softDeleteUserEmailById(id);
}

export async function deleteUserEmailByAddress(emailAddress: string) {
  const userEmail = await findActiveUserEmailByAddress(emailAddress);
  assertEmailRecordExists(
    userEmail,
    "User email not found or already deleted",
  );

  await softDeleteUserEmailByAddress(emailAddress);
}

export async function getEmailsByEmailAddress(
  emailAddress: string,
  page: number,
  pageSize: number,
) {
  const userEmail = await findActiveUserEmailByAddress(emailAddress);
  assertEmailRecordExists(
    userEmail,
    "Email address not found or has been deleted",
  );

  return listForwardEmailsByAddress(emailAddress, page, pageSize);
}

export async function markEmailAsRead(emailId: string, userId: string) {
  const email = await findReadableEmailId(emailId, userId);
  assertEmailRecordExists(email, READ_PERMISSION_ERROR);

  return updateForwardEmailReadState(emailId);
}

export async function markEmailsAsRead(emailIds: string[], userId: string) {
  assertAccessibleEmailIds(emailIds, READ_PERMISSION_ERROR);

  const validEmailIds = await findReadableEmailIds(emailIds, userId);
  assertAccessibleEmailIds(validEmailIds, READ_PERMISSION_ERROR);

  const updatedRows = await updateForwardEmailsReadState(validEmailIds);
  return {
    updatedCount: updatedRows.length,
    message: `Successfully marked ${updatedRows.length} emails as read`,
  };
}

export async function markAllEmailsAsRead(userEmailId: string, userId: string) {
  const userEmail = await findOwnedUserEmail(userEmailId, userId);
  assertEmailRecordExists(userEmail, READ_ALL_PERMISSION_ERROR);

  const updatedRows = await updateAllForwardEmailsReadState(userEmail.emailAddress);
  return {
    updatedCount: updatedRows.length,
    message: `Successfully marked ${updatedRows.length} emails as read`,
  };
}

export async function deleteEmailsByIds(ids: string[]) {
  if (ids.length === 0) {
    return { count: 0 };
  }

  return deleteForwardEmailsByIds(ids);
}

export async function saveUserSendEmail(
  userId: string,
  from: string,
  to: string,
  subject: string,
  html: string,
) {
  return insertUserSendEmail(userId, from, to, subject, html);
}

export async function getUserSendEmailCount(userId: string, admin: boolean) {
  return countUserSendEmails(userId, admin);
}

export async function getUserSendEmailCountForActor(
  actor: EmailActor,
  includeAll: boolean,
) {
  return getUserSendEmailCount(
    actor.id,
    canAccessAllUserEmails(actor.role, includeAll),
  );
}

export async function getUserSendEmailList(
  userId: string,
  admin: boolean,
  page: number,
  size: number,
  search: string,
) {
  return listUserSendEmails(userId, admin, page, size, search);
}

export async function getUserSendEmailListForActor(
  actor: EmailActor,
  options: {
    includeAll: boolean;
    page: number;
    size: number;
    search: string;
  },
) {
  return getUserSendEmailList(
    actor.id,
    canAccessAllUserEmails(actor.role, options.includeAll),
    options.page,
    options.size,
    options.search,
  );
}

export async function sendManagedUserEmail(
  actor: EmailActor,
  input: {
    from?: string;
    to?: string;
    subject?: string;
    html?: string;
  },
) {
  await assertEmailQuota(actor.id, actor.team, "userSendEmail", "emSendEmails");
  assertSendEmailPayload(input);

  const { from, to, subject, html } = input;
  const { email_key, provider } = await checkDomainIsConfiguratedEmailProvider(
    from.split("@")[1],
  );

  assertConfiguredEmailProvider(email_key);

  switch (provider) {
    case "Resend": {
      const resend = new Resend(email_key);
      await resend.emails.send({ from, to, subject, html });
      break;
    }
    case "Brevo":
      await brevoSendEmail({
        from,
        fromName: from.split("@")[0],
        to,
        subject,
        html,
      });
      break;
    default:
      break;
  }

  await saveUserSendEmail(actor.id, from, to, subject, html);
}
