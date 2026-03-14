import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  assertS3BucketExists,
  getS3ConfigListOrThrow,
  getS3ProviderConfigOrThrow,
} from "@/lib/api/storage";
import { getUserFiles, softDeleteUserFiles } from "@/lib/files/services";
import { createS3Client, deleteFile, getSignedUrlForDownload } from "@/lib/s3";

export const GET = createAuthedApiRoute(
  async (req: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const url = new URL(req.url);
    const page = url.searchParams.get("page");
    const pageSize = url.searchParams.get("pageSize");
    const bucket = url.searchParams.get("bucket") || "";
    const provider = url.searchParams.get("provider") || "";
    const name = url.searchParams.get("name") || "";
    const fileSize = url.searchParams.get("fileSize") || "";
    const mimeType = url.searchParams.get("mimeType") || "";
    const status = url.searchParams.get("status") || "";

    const configList = await getS3ConfigListOrThrow();
    const providerChannel = getS3ProviderConfigOrThrow(configList, provider);
    assertS3BucketExists(providerChannel, bucket);

    const res = await getUserFiles({
      page: Number(page) || 1,
      limit: Number(pageSize) || 20,
      bucket,
      userId: user.role === "ADMIN" ? undefined : user.id,
      status: user.role === "ADMIN" ? Number(status === "0" ? 0 : 1) : 1,
      channel: providerChannel.channel,
      platform: providerChannel.platform,
      providerName: providerChannel.provider_name,
      name,
      size: Number(fileSize || 0),
      mimeType,
    });

    return apiOk(res);
  },
  {
    fallbackBody: { error: "Error listing files" },
    logMessage: "Error listing files:",
  },
);

export const POST = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext) => {
    const { key, bucket, provider } = await request.json();
    if (!key || !bucket || !provider) {
      throw badRequest("key and bucket is required");
    }

    const configList = await getS3ConfigListOrThrow();
    const providerChannel = getS3ProviderConfigOrThrow(configList, provider);
    assertS3BucketExists(providerChannel, bucket);

    const signedUrl = await getSignedUrlForDownload(
      key,
      createS3Client(
        providerChannel.endpoint,
        providerChannel.access_key_id,
        providerChannel.secret_access_key,
      ),
      bucket,
    );
    return apiOk({ signedUrl });
  },
  {
    fallbackBody: "Error generating download URL",
  },
);

export const DELETE = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext) => {
    const { keys, ids, bucket, provider } = await request.json();

    if (!keys || !ids || !bucket || !provider) {
      throw badRequest("key and bucket is required");
    }

    const configList = await getS3ConfigListOrThrow();
    const providerChannel = getS3ProviderConfigOrThrow(configList, provider);
    assertS3BucketExists(providerChannel, bucket);

    const R2 = createS3Client(
      providerChannel.endpoint,
      providerChannel.access_key_id,
      providerChannel.secret_access_key,
    );

    for (const key of keys) {
      await deleteFile(key, R2, bucket);
    }
    await softDeleteUserFiles(ids);
    return apiOk({ message: "File deleted successfully" });
  },
  {
    fallbackBody: "Error deleting file",
    logMessage: "Error deleting file:",
  },
);
