import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, gte, isNotNull, lte } from "drizzle-orm";

import { ApiError, getErrorMessage, isApiError, unauthorized } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { db } from "@/lib/db";
import { urlMetas, userUrls } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function mapLocationRow(
  row: {
    latitude: string | null;
    longitude: string | null;
    click: number;
    city: string | null;
    country: string | null;
    device: string | null;
    browser: string | null;
    createdAt: Date;
    updatedAt: Date;
    url: string | null;
    target: string | null;
    prefix: string | null;
  },
) {
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    click: row.click,
    city: row.city,
    country: row.country,
    device: row.device,
    browser: row.browser,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userUrl: {
      url: row.url ?? "",
      target: row.target ?? "",
      prefix: row.prefix ?? "",
    },
  };
}

function mapLocationError(
  error: unknown,
  body: Omit<Record<string, unknown>, "error" | "timestamp">,
) {
  if (isApiError(error)) {
    return null;
  }

  return new ApiError(500, {
    ...body,
    error: getErrorMessage(error) || "Failed to fetch location data",
    timestamp: new Date().toISOString(),
  });
}

export const GET = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    const isAdmin = searchParams.get("isAdmin");
    if (isAdmin === "true") {
      if (user.role !== "ADMIN") {
        throw unauthorized("Unauthorized");
      }
    }

    const startAtParam = searchParams.get("startAt");
    const endAtParam = searchParams.get("endAt");
    const country = searchParams.get("country");

    let startDate: Date;
    let endDate: Date;

    if (startAtParam && endAtParam) {
      startDate = new Date(parseInt(startAtParam) * 1000);
      endDate = new Date(parseInt(endAtParam) * 1000);
    } else {
      endDate = new Date();
      startDate = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid startAt or endAt parameters");
    }

    const conditions = [
      gte(urlMetas.createdAt, startDate),
      lte(urlMetas.createdAt, endDate),
      isNotNull(urlMetas.latitude),
      isNotNull(urlMetas.longitude),
      ...(isAdmin === "true" ? [] : [eq(userUrls.userId, user.id)]),
      ...(country ? [eq(urlMetas.country, country)] : []),
    ];

    const rawRows = await db
      .select({
        latitude: urlMetas.latitude,
        longitude: urlMetas.longitude,
        click: urlMetas.click,
        city: urlMetas.city,
        country: urlMetas.country,
        device: urlMetas.device,
        browser: urlMetas.browser,
        createdAt: urlMetas.createdAt,
        updatedAt: urlMetas.updatedAt,
        url: userUrls.url,
        target: userUrls.target,
        prefix: userUrls.prefix,
      })
      .from(urlMetas)
      .leftJoin(userUrls, eq(urlMetas.urlId, userUrls.id))
      .where(and(...conditions))
      .orderBy(desc(urlMetas.updatedAt))
      .limit(2000);

    const rawData = rawRows.map(mapLocationRow);

    // console.log("Raw data fetched:", rawData.length, "records");

    const locationMap = new Map<
      string,
      {
        latitude: number;
        longitude: number;
        count: number;
        city: string;
        country: string;
        lastUpdate: Date;
        updatedAt: Date;
        createdAt: Date;
        device: string;
        browser: string;
        userUrl: {
          url: string;
          target: string;
          prefix: string;
        };
      }
    >();

    rawData.forEach((item) => {
      if (item.latitude && item.longitude) {
        const lat = Math.round(Number(item.latitude) * 100) / 100;
        const lng = Math.round(Number(item.longitude) * 100) / 100;
        const key = `${lat},${lng},${item.createdAt},${item.userUrl?.url || ""},${item.userUrl?.prefix || ""}`;

        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          existing.count += item.click || 1;
          if (item.updatedAt > existing.lastUpdate) {
            existing.lastUpdate = item.updatedAt;
            existing.city = item.city || existing.city;
            existing.country = item.country || existing.country;
          }
        } else {
          locationMap.set(key, {
            latitude: lat,
            longitude: lng,
            count: item.click || 1,
            city: item.city || "",
            country: item.country || "",
            lastUpdate: item.updatedAt,
            updatedAt: item.updatedAt,
            createdAt: item.createdAt,
            device: item.device || "",
            browser: item.browser || "",
            userUrl: item.userUrl || {
              url: "",
              target: "",
              prefix: "",
            },
          });
        }
      }
    });

    const aggregatedData = Array.from(locationMap.values()).sort(
      (a, b) => b.count - a.count,
    );
    // .slice(0, 500);

    const totalClicks = aggregatedData.reduce(
      (sum, item) => sum + item.count,
      0,
    );
    const uniqueLocations = aggregatedData.length;

    return NextResponse.json({
      data: aggregatedData,
      total: uniqueLocations,
      totalClicks,
      rawRecords: rawData.length,
      timeRange: {
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  },
  {
    logMessage: "Error fetching location data:",
    mapError: (error) =>
      mapLocationError(error, {
        data: [],
        total: 0,
        totalClicks: 0,
        rawRecords: 0,
      }),
  },
);

export const POST = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const body = await request.json();
    const { lastUpdate, isAdmin } = body;

    if (isAdmin) {
      if (user.role !== "ADMIN") {
        throw unauthorized("Unauthorized");
      }
    }

    const sinceDate = lastUpdate
      ? new Date(lastUpdate)
      : new Date(Date.now() - 5000);

    // console.log("lastUpdate", lastUpdate, sinceDate);

    if (isNaN(sinceDate.getTime())) {
      throw new Error("Invalid lastUpdate parameter");
    }

    const newRows = await db
      .select({
        latitude: urlMetas.latitude,
        longitude: urlMetas.longitude,
        click: urlMetas.click,
        city: urlMetas.city,
        country: urlMetas.country,
        device: urlMetas.device,
        browser: urlMetas.browser,
        createdAt: urlMetas.createdAt,
        updatedAt: urlMetas.updatedAt,
        url: userUrls.url,
        target: userUrls.target,
        prefix: userUrls.prefix,
      })
      .from(urlMetas)
      .leftJoin(userUrls, eq(urlMetas.urlId, userUrls.id))
      .where(
        and(
          gt(urlMetas.createdAt, sinceDate),
          isNotNull(urlMetas.latitude),
          isNotNull(urlMetas.longitude),
          ...(isAdmin ? [] : [eq(userUrls.userId, user.id)]),
        ),
      )
      .orderBy(desc(urlMetas.updatedAt))
      .limit(1000);

    const newData = newRows.map(mapLocationRow);

    // console.log("Realtime updates fetched:", newData.length, "records");

    return NextResponse.json({
      data: newData,
      count: newData.length,
      timestamp: new Date().toISOString(),
    });
  },
  {
    logMessage: "Error fetching realtime updates:",
    mapError: (error) =>
      mapLocationError(error, {
        data: [],
        count: 0,
      }),
  },
);
