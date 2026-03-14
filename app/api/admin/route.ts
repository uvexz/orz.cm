import { and, gte, lt } from "drizzle-orm";

import {
  type AppRouteHandlerContext,
  apiOk,
  createAdminApiRoute,
} from "@/lib/api/route";
import { db } from "@/lib/db";
import {
  forwardEmails,
  userEmails,
  userRecords,
  userSendEmails,
  users,
  userUrls,
} from "@/lib/db/schema";
import { TIME_RANGES } from "@/lib/enums";
import { getStartDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DatedTable =
  | typeof users
  | typeof userUrls
  | typeof userEmails
  | typeof forwardEmails
  | typeof userSendEmails;

type DatedColumn =
  | typeof users.createdAt
  | typeof userUrls.createdAt
  | typeof userEmails.createdAt
  | typeof forwardEmails.createdAt
  | typeof userSendEmails.createdAt;

async function getDateRows(
  table: DatedTable,
  column: DatedColumn,
  startDate: Date,
  endDate?: Date,
) {
  const conditions = endDate
    ? and(gte(column, startDate), lt(column, endDate))
    : gte(column, startDate);

  return db.select({ createdAt: column }).from(table).where(conditions);
}

export const GET = createAdminApiRoute(
  async (req: Request, _context: AppRouteHandlerContext) => {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";

    const startDate = getStartDate(range);
    if (!startDate) {
      return apiOk({ statusText: "Invalid range" }, 400);
    }

    // Calculate previous period start and end dates
    const rangeDuration = TIME_RANGES[range];
    const prevStartDate = new Date(startDate.getTime() - rangeDuration);
    const prevEndDate = startDate;

    const [currentUsers, records, urls, emails, inbox, sends] =
      await Promise.all([
        getDateRows(users, users.createdAt, startDate),
        db
          .select({ created_on: userRecords.created_on })
          .from(userRecords)
          .where(gte(userRecords.created_on, startDate)),
        getDateRows(userUrls, userUrls.createdAt, startDate),
        getDateRows(userEmails, userEmails.createdAt, startDate),
        getDateRows(forwardEmails, forwardEmails.createdAt, startDate),
        getDateRows(userSendEmails, userSendEmails.createdAt, startDate),
      ]);

    // Fetch previous period data
    const [prevUsers, prevRecords, prevUrls, prevEmails, prevInbox, prevSends] =
      await Promise.all([
        getDateRows(users, users.createdAt, prevStartDate, prevEndDate),
        db
          .select({ created_on: userRecords.created_on })
          .from(userRecords)
          .where(
            and(
              gte(userRecords.created_on, prevStartDate),
              lt(userRecords.created_on, prevEndDate),
            ),
          ),
        getDateRows(userUrls, userUrls.createdAt, prevStartDate, prevEndDate),
        getDateRows(userEmails, userEmails.createdAt, prevStartDate, prevEndDate),
        getDateRows(forwardEmails, forwardEmails.createdAt, prevStartDate, prevEndDate),
        getDateRows(
          userSendEmails,
          userSendEmails.createdAt,
          prevStartDate,
          prevEndDate,
        ),
      ]);

    // Process current period data
    const userCountByDate: { [date: string]: number } = {};
    const recordCountByDate: { [date: string]: number } = {};
    const urlCountByDate: { [date: string]: number } = {};
    const emailCountByDate: { [date: string]: number } = {};
    const inboxCountByDate: { [date: string]: number } = {};
    const sendCountByDate: { [date: string]: number } = {};

    currentUsers.forEach((user) => {
      const date = user.createdAt!.toISOString().split("T")[0];
      userCountByDate[date] = (userCountByDate[date] || 0) + 1;
    });
    records.forEach((record) => {
      const date = record.created_on!.toISOString().split("T")[0];
      recordCountByDate[date] = (recordCountByDate[date] || 0) + 1;
    });
    urls.forEach((url) => {
      const date = url.createdAt.toISOString().split("T")[0];
      urlCountByDate[date] = (urlCountByDate[date] || 0) + 1;
    });
    emails.forEach((email) => {
      const date = email.createdAt.toISOString().split("T")[0];
      emailCountByDate[date] = (emailCountByDate[date] || 0) + 1;
    });
    inbox.forEach((email) => {
      const date = email.createdAt.toISOString().split("T")[0];
      inboxCountByDate[date] = (inboxCountByDate[date] || 0) + 1;
    });
    sends.forEach((send) => {
      const date = send.createdAt.toISOString().split("T")[0];
      sendCountByDate[date] = (sendCountByDate[date] || 0) + 1;
    });

    const allDates = Array.from(
      new Set([
        ...Object.keys(userCountByDate),
        ...Object.keys(recordCountByDate),
        ...Object.keys(urlCountByDate),
        ...Object.keys(emailCountByDate),
        ...Object.keys(inboxCountByDate),
        ...Object.keys(sendCountByDate),
      ]),
    );
    const combinedData = allDates.map((date) => ({
      date,
      records: recordCountByDate[date] || 0,
      urls: urlCountByDate[date] || 0,
      users: userCountByDate[date] || 0,
      emails: emailCountByDate[date] || 0,
      inbox: inboxCountByDate[date] || 0,
      sends: sendCountByDate[date] || 0,
    }));

    const total = {
      records: combinedData.reduce((acc, curr) => acc + curr.records, 0),
      urls: combinedData.reduce((acc, curr) => acc + curr.urls, 0),
      users: combinedData.reduce((acc, curr) => acc + curr.users, 0),
      emails: combinedData.reduce((acc, curr) => acc + curr.emails, 0),
      inbox: combinedData.reduce((acc, curr) => acc + curr.inbox, 0),
      sends: combinedData.reduce((acc, curr) => acc + curr.sends, 0),
    };

    // Calculate totals for previous period
    const prevTotal = {
      records: prevRecords.length,
      urls: prevUrls.length,
      users: prevUsers.length,
      emails: prevEmails.length,
      inbox: prevInbox.length,
      sends: prevSends.length,
    };

    // Calculate growth rates
    const growthRates = {
      records:
        prevTotal.records === 0
          ? total.records > 0
            ? 100
            : 0
          : ((total.records - prevTotal.records) / prevTotal.records) * 100,
      urls:
        prevTotal.urls === 0
          ? total.urls > 0
            ? 100
            : 0
          : ((total.urls - prevTotal.urls) / prevTotal.urls) * 100,
      users:
        prevTotal.users === 0
          ? total.users > 0
            ? 100
            : 0
          : ((total.users - prevTotal.users) / prevTotal.users) * 100,
      emails:
        prevTotal.emails === 0
          ? total.emails > 0
            ? 100
            : 0
          : ((total.emails - prevTotal.emails) / prevTotal.emails) * 100,
      inbox:
        prevTotal.inbox === 0
          ? total.inbox > 0
            ? 100
            : 0
          : ((total.inbox - prevTotal.inbox) / prevTotal.inbox) * 100,
      sends:
        prevTotal.sends === 0
          ? total.sends > 0
            ? 100
            : 0
          : ((total.sends - prevTotal.sends) / prevTotal.sends) * 100,
    };

    return apiOk({
      list: combinedData.reverse(),
      total,
      growthRates,
    });
  },
  {
    fallbackBody: { statusText: "Server error" },
  },
);
