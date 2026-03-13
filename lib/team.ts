import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "../lib/db";
import {
  scrapeMetas,
  userEmails,
  userFiles,
  userRecords,
  userSendEmails,
  userUrls,
} from "../lib/db/schema";

type TimeRangeType = "day" | "month";
const restrictableModels = {
  userEmail: {
    table: userEmails,
    userIdColumn: userEmails.userId,
    createdAtColumn: userEmails.createdAt,
  },
  userFile: {
    table: userFiles,
    userIdColumn: userFiles.userId,
    createdAtColumn: userFiles.createdAt,
  },
  userRecord: {
    table: userRecords,
    userIdColumn: userRecords.userId,
    createdAtColumn: userRecords.created_on,
  },
  userSendEmail: {
    table: userSendEmails,
    userIdColumn: userSendEmails.userId,
    createdAtColumn: userSendEmails.createdAt,
  },
  userUrl: {
    table: userUrls,
    userIdColumn: userUrls.userId,
    createdAtColumn: userUrls.createdAt,
  },
  scrapeMeta: {
    table: scrapeMetas,
    userIdColumn: scrapeMetas.userId,
    createdAtColumn: scrapeMetas.createdAt,
  },
} as const;

interface RestrictOptions {
  model: keyof typeof restrictableModels;
  userId: string;
  limit: number;
  rangeType: TimeRangeType;
  referenceDate?: Date;
}

export async function restrictByTimeRange({
  model,
  userId,
  limit,
  rangeType,
  referenceDate,
}: RestrictOptions) {
  const now = referenceDate || new Date();

  let start: Date;
  let end: Date;

  if (rangeType === "day") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
  } else if (rangeType === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    return {
      status: 400,
      statusText: `Invalid range type: ${rangeType}`,
    };
  }

  const target = restrictableModels[model];
  if (!target) {
    return {
      status: 400,
      statusText: `Invalid model: ${model.toString()}`,
    };
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(target.table)
    .where(
      and(
        eq(target.userIdColumn, userId),
        gte(target.createdAtColumn, start),
        lte(target.createdAtColumn, end),
      ),
    );

  const count = Number(result?.count ?? 0);

  if (count >= limit) {
    return {
      status: 409,
      statusText: `You have exceeded the ${rangeType}ly ${model.toString()} usage limit (${limit}). Please try again later.`,
    };
  }
  return null;
}
