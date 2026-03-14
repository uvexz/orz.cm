// app/api/user-files/route.ts
import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import { createUserFile } from "@/lib/files/services";
import { bytesToStorageValue } from "@/lib/utils";

export const POST = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const body = await request.json();

    const requiredFields = [
      "name",
      "originalName",
      "mimeType",
      "path",
      "size",
      "bucket",
    ];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      throw badRequest({
        success: false,
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const userFile = await createUserFile({
      userId: user.id,
      name: body.name,
      originalName: body.originalName,
      mimeType: body.mimeType,
      path: body.path,
      etag: body.etag || "",
      storageClass: body.storageClass || "",
      channel: body.channel || "",
      platform: body.platform || "",
      providerName: body.providerName || "",
      size: bytesToStorageValue(body.size),
      bucket: body.bucket,
      lastModified: body.lastModified
        ? new Date(body.lastModified)
        : new Date(),
    });

    return apiOk({
      success: true,
      data: userFile,
      message: "success",
    });
  },
  {
    fallbackBody: {
      success: false,
      error: "Error creating user file",
    },
    logMessage: "Error creating user file:",
  },
);

export const PUT = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { files } = await request.json();

    if (!Array.isArray(files)) {
      throw badRequest({
        success: false,
        error: "File list must be an array",
      });
    }

    const results = await Promise.allSettled(
      files.map((file) =>
        createUserFile({
          ...file,
          userId: user.id,
        }),
      ),
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return apiOk({
      success: true,
      data: {
        total: files.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          index,
          status: result.status,
          data: result.status === "fulfilled" ? result.value : null,
          error: result.status === "rejected" ? result.reason.message : null,
        })),
      },
      message: `Complete: ${successful} success, ${failed} failed`,
    });
  },
  {
    fallbackBody: {
      success: false,
      error: "Create user files failed",
    },
    logMessage: "Create user files failed:",
  },
);
