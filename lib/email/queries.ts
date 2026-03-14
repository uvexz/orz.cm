import {
  and,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { forwardEmails, userEmails, userSendEmails, users } from "@/lib/db/schema";

import type { OriginalEmail, UserEmailList, UserEmailRow, UserRole } from "./types";

const generateId = () => crypto.randomUUID().replace(/-/g, "");

function isUniqueViolation(error: unknown): error is { code: string } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

function toUniqueConstraintError() {
  const error = new Error("Unique constraint failed");
  (error as Error & { code?: string }).code = "UNIQUE_CONSTRAINT";
  return error;
}

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  };
}

function buildUserEmailWhere(
  userId: string,
  search: string,
  admin: boolean,
  onlyUnread: boolean,
) {
  const conditions: SQL[] = [ilike(userEmails.emailAddress, `%${search}%`)];

  if (!admin) {
    conditions.push(eq(userEmails.userId, userId), isNull(userEmails.deletedAt));
  } else {
    conditions.push(isNull(userEmails.deletedAt));
  }

  if (onlyUnread) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(forwardEmails)
          .where(
            and(
              eq(forwardEmails.to, userEmails.emailAddress),
              isNull(forwardEmails.readAt),
            ),
          ),
      ),
    );
  }

  return and(...conditions);
}

async function getForwardEmailCountMap(emailAddresses: string[], unreadOnly = false) {
  if (emailAddresses.length === 0) {
    return new Map<string, number>();
  }

  const conditions: SQL[] = [inArray(forwardEmails.to, emailAddresses)];
  if (unreadOnly) {
    conditions.push(isNull(forwardEmails.readAt));
  }

  const rows = await db
    .select({
      emailAddress: forwardEmails.to,
      count: sql<number>`count(*)`,
    })
    .from(forwardEmails)
    .where(and(...conditions))
    .groupBy(forwardEmails.to);

  return new Map(
    rows.map((row) => [row.emailAddress, Number(row.count ?? 0)] as const),
  );
}

export async function findUserById(userId: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function insertForwardEmail(emailData: OriginalEmail) {
  const [savedEmail] = await db
    .insert(forwardEmails)
    .values({
      id: generateId(),
      from: emailData.from,
      fromName: emailData.fromName,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      date: emailData.date,
      messageId: emailData.messageId,
      replyTo: emailData.replyTo,
      cc: emailData.cc,
      headers: emailData.headers ?? "[]",
      attachments: JSON.stringify(emailData.attachments ?? []),
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: forwardEmails.id });

  return savedEmail?.id ?? null;
}

export async function listUserEmailsWithStats(
  userId: string,
  page: number,
  size: number,
  search: string,
  admin: boolean,
  onlyUnread: boolean,
) {
  const whereClause = buildUserEmailWhere(userId, search, admin, onlyUnread);

  let listQuery = db
    .select({
      userEmail: userEmails,
      userName: users.name,
      userAccountEmail: users.email,
    })
    .from(userEmails)
    .leftJoin(users, eq(userEmails.userId, users.id))
    .orderBy(desc(userEmails.updatedAt))
    .limit(size)
    .offset((page - 1) * size)
    .$dynamic();

  let totalQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(userEmails)
    .$dynamic();

  let emailAddressQuery = db
    .select({ emailAddress: userEmails.emailAddress })
    .from(userEmails)
    .$dynamic();

  listQuery = listQuery.where(whereClause);
  totalQuery = totalQuery.where(whereClause);
  emailAddressQuery = emailAddressQuery.where(whereClause);

  const [[totalResult], pagedRows, allEmailRows] = await Promise.all([
    totalQuery,
    listQuery,
    emailAddressQuery,
  ]);

  const pageEmailAddresses = pagedRows.map((row) => row.userEmail.emailAddress);
  const allEmailAddresses = allEmailRows.map((row) => row.emailAddress);

  const [
    pageCountMap,
    pageUnreadCountMap,
    totalInboxCountRows,
    totalUnreadCountRows,
  ] = await Promise.all([
    getForwardEmailCountMap(pageEmailAddresses),
    getForwardEmailCountMap(pageEmailAddresses, true),
    allEmailAddresses.length === 0
      ? Promise.resolve([{ count: 0 }])
      : db
          .select({ count: sql<number>`count(*)` })
          .from(forwardEmails)
          .where(inArray(forwardEmails.to, allEmailAddresses)),
    allEmailAddresses.length === 0
      ? Promise.resolve([{ count: 0 }])
      : db
          .select({ count: sql<number>`count(*)` })
          .from(forwardEmails)
          .where(
            and(
              inArray(forwardEmails.to, allEmailAddresses),
              isNull(forwardEmails.readAt),
            ),
          ),
  ]);

  const list: UserEmailList[] = pagedRows.map((row) => ({
    ...row.userEmail,
    count: pageCountMap.get(row.userEmail.emailAddress) ?? 0,
    unreadCount: pageUnreadCountMap.get(row.userEmail.emailAddress) ?? 0,
    user: row.userName ?? "",
    email: row.userAccountEmail ?? "",
  }));

  return {
    list,
    total: Number(totalResult?.count ?? 0),
    totalInboxCount: Number(totalInboxCountRows[0]?.count ?? 0),
    totalUnreadCount: Number(totalUnreadCountRows[0]?.count ?? 0),
  };
}

export async function countUserEmails(userId: string, role: UserRole) {
  const { start, end } = getMonthRange();
  const baseConditions =
    role === "USER"
      ? [eq(userEmails.userId, userId), isNull(userEmails.deletedAt)]
      : [isNull(userEmails.deletedAt)];

  const [totalRows, monthRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(userEmails)
      .where(and(...baseConditions)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userEmails)
      .where(
        and(
          ...baseConditions,
          gte(userEmails.createdAt, start),
          lte(userEmails.createdAt, end),
        ),
      ),
  ]);

  return {
    total: Number(totalRows[0]?.count ?? 0),
    month_total: Number(monthRows[0]?.count ?? 0),
  };
}

export async function countInboxEmails() {
  const { start, end } = getMonthRange();

  const [totalRows, monthRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(forwardEmails),
    db
      .select({ count: sql<number>`count(*)` })
      .from(forwardEmails)
      .where(
        and(
          gte(forwardEmails.createdAt, start),
          lte(forwardEmails.createdAt, end),
        ),
      ),
  ]);

  return {
    total: Number(totalRows[0]?.count ?? 0),
    month_total: Number(monthRows[0]?.count ?? 0),
  };
}

export async function insertUserEmail(userId: string, emailAddress: string) {
  try {
    const [createdUserEmail] = await db
      .insert(userEmails)
      .values({
        id: generateId(),
        userId,
        emailAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return createdUserEmail;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw toUniqueConstraintError();
    }

    throw error;
  }
}

export async function findUserEmailById(id: string): Promise<UserEmailRow | null> {
  const [userEmail] = await db
    .select()
    .from(userEmails)
    .where(and(eq(userEmails.id, id), isNull(userEmails.deletedAt)))
    .limit(1);

  return userEmail ?? null;
}

export async function updateUserEmailById(id: string, emailAddress: string) {
  try {
    const [updatedUserEmail] = await db
      .update(userEmails)
      .set({
        emailAddress,
        updatedAt: new Date(),
      })
      .where(and(eq(userEmails.id, id), isNull(userEmails.deletedAt)))
      .returning();

    return updatedUserEmail ?? null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw toUniqueConstraintError();
    }

    throw error;
  }
}

export async function softDeleteUserEmailById(id: string) {
  const [userEmail] = await db
    .select({ id: userEmails.id })
    .from(userEmails)
    .where(and(eq(userEmails.id, id), isNull(userEmails.deletedAt)))
    .limit(1);

  if (!userEmail) {
    return null;
  }

  await db
    .update(userEmails)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userEmails.id, id));

  return userEmail;
}

export async function findActiveUserEmailByAddress(emailAddress: string) {
  const [userEmail] = await db
    .select()
    .from(userEmails)
    .where(
      and(
        eq(userEmails.emailAddress, emailAddress),
        isNull(userEmails.deletedAt),
      ),
    )
    .limit(1);

  return userEmail ?? null;
}

export async function softDeleteUserEmailByAddress(emailAddress: string) {
  await db
    .update(userEmails)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userEmails.emailAddress, emailAddress));
}

export async function listDeletedUserEmails(
  userId: string,
  page: number,
  pageSize: number,
  search: string,
) {
  const whereClause = and(
    eq(userEmails.userId, userId),
    isNotNull(userEmails.deletedAt),
    ilike(userEmails.emailAddress, `%${search}%`),
  );

  const [list, totalRows] = await Promise.all([
    db
      .select()
      .from(userEmails)
      .where(whereClause)
      .orderBy(desc(userEmails.deletedAt), desc(userEmails.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userEmails)
      .where(whereClause),
  ]);

  return {
    list,
    total: Number(totalRows[0]?.count ?? 0),
  };
}

export async function restoreDeletedUserEmailById(id: string, userId: string) {
  try {
    const [restoredUserEmail] = await db
      .update(userEmails)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userEmails.id, id),
          eq(userEmails.userId, userId),
          isNotNull(userEmails.deletedAt),
        ),
      )
      .returning();

    return restoredUserEmail ?? null;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw toUniqueConstraintError();
    }

    throw error;
  }
}

export async function permanentlyDeleteUserEmailById(id: string, userId: string) {
  const [deletedUserEmail] = await db
    .delete(userEmails)
    .where(
      and(
        eq(userEmails.id, id),
        eq(userEmails.userId, userId),
        isNotNull(userEmails.deletedAt),
      ),
    )
    .returning({ id: userEmails.id });

  return deletedUserEmail ?? null;
}

export async function listForwardEmailsByAddress(
  emailAddress: string,
  page: number,
  pageSize: number,
) {
  const [list, totalRows] = await Promise.all([
    db
      .select()
      .from(forwardEmails)
      .where(eq(forwardEmails.to, emailAddress))
      .orderBy(desc(forwardEmails.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(forwardEmails)
      .where(eq(forwardEmails.to, emailAddress)),
  ]);

  return {
    list,
    total: Number(totalRows[0]?.count ?? 0),
  };
}

export async function findReadableEmailId(emailId: string, userId: string) {
  const [email] = await db
    .select({ id: forwardEmails.id })
    .from(forwardEmails)
    .innerJoin(userEmails, eq(forwardEmails.to, userEmails.emailAddress))
    .where(
      and(
        eq(forwardEmails.id, emailId),
        eq(userEmails.userId, userId),
        isNull(forwardEmails.readAt),
      ),
    )
    .limit(1);

  return email ?? null;
}

export async function updateForwardEmailReadState(emailId: string) {
  const [updatedEmail] = await db
    .update(forwardEmails)
    .set({
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(forwardEmails.id, emailId))
    .returning();

  return updatedEmail ?? null;
}

export async function findReadableEmailIds(emailIds: string[], userId: string) {
  const emails = await db
    .select({ id: forwardEmails.id })
    .from(forwardEmails)
    .innerJoin(userEmails, eq(forwardEmails.to, userEmails.emailAddress))
    .where(
      and(
        inArray(forwardEmails.id, emailIds),
        eq(userEmails.userId, userId),
      ),
    );

  return emails.map((email) => email.id);
}

export async function updateForwardEmailsReadState(emailIds: string[]) {
  return db
    .update(forwardEmails)
    .set({
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(inArray(forwardEmails.id, emailIds))
    .returning({ id: forwardEmails.id });
}

export async function findOwnedUserEmail(userEmailId: string, userId: string) {
  const [userEmail] = await db
    .select({ emailAddress: userEmails.emailAddress })
    .from(userEmails)
    .where(and(eq(userEmails.id, userEmailId), eq(userEmails.userId, userId)))
    .limit(1);

  return userEmail ?? null;
}

export async function updateAllForwardEmailsReadState(emailAddress: string) {
  return db
    .update(forwardEmails)
    .set({
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(forwardEmails.to, emailAddress), isNull(forwardEmails.readAt)),
    )
    .returning({ id: forwardEmails.id });
}

export async function deleteForwardEmailsByIds(ids: string[]) {
  const deletedRows = await db
    .delete(forwardEmails)
    .where(inArray(forwardEmails.id, ids))
    .returning({ id: forwardEmails.id });

  return { count: deletedRows.length };
}

export async function insertUserSendEmail(
  userId: string,
  from: string,
  to: string,
  subject: string,
  html: string,
) {
  const [email] = await db
    .insert(userSendEmails)
    .values({
      id: generateId(),
      userId,
      from,
      to,
      subject,
      html,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return email;
}

export async function countUserSendEmails(userId: string, admin: boolean) {
  const rows = admin
    ? await db.select({ count: sql<number>`count(*)` }).from(userSendEmails)
    : await db
        .select({ count: sql<number>`count(*)` })
        .from(userSendEmails)
        .where(eq(userSendEmails.userId, userId));

  return Number(rows[0]?.count ?? 0);
}

export async function listUserSendEmails(
  userId: string,
  admin: boolean,
  page: number,
  size: number,
  search: string,
) {
  const conditions: SQL[] = [ilike(userSendEmails.to, `%${search}%`)];

  if (!admin) {
    conditions.push(eq(userSendEmails.userId, userId));
  }

  const whereClause = and(...conditions);

  const [list, totalRows] = await Promise.all([
    db
      .select({
        from: userSendEmails.from,
        to: userSendEmails.to,
        subject: userSendEmails.subject,
        html: userSendEmails.html,
        createdAt: userSendEmails.createdAt,
      })
      .from(userSendEmails)
      .where(whereClause)
      .orderBy(desc(userSendEmails.updatedAt))
      .limit(size)
      .offset((page - 1) * size),
    db
      .select({ count: sql<number>`count(*)` })
      .from(userSendEmails)
      .where(whereClause),
  ]);

  return {
    list,
    total: Number(totalRows[0]?.count ?? 0),
  };
}
