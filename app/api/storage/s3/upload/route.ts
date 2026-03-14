import { NextRequest } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { badRequest, forbidden } from "@/lib/api/errors";
import {
  type AppRouteHandlerContext,
  apiOk,
  createAuthedApiRoute,
} from "@/lib/api/route";
import {
  assertS3BucketExists,
  getS3ConfigListOrThrow,
  getS3ProviderConfigOrThrow,
  type S3ProviderConfig,
} from "@/lib/api/storage";
import { getBucketStorageUsage } from "@/lib/files/services";
import { getMultipleConfigs } from "@/lib/dto/system-config";
import { createS3Client } from "@/lib/s3";
import { generateFileKey } from "@/lib/utils";

type LegacyS3Config = Omit<
  S3ProviderConfig,
  "provider_name" | "platform" | "channel"
>;

export const POST = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext, { user }) => {
    const { provider, bucket, files, prefix } = await request.json();

    if (!bucket || !files || !Array.isArray(files)) {
      throw badRequest("Invalid request parameters");
    }

    const configList = await getS3ConfigListOrThrow();
    const providerChannel = getS3ProviderConfigOrThrow(configList, provider);
    const buckets = assertS3BucketExists(providerChannel, bucket);

    const bucketConfig = buckets.find((b) => b.bucket === bucket);
    if (bucketConfig?.file_size) {
      for (const file of files) {
        if (Number(file.size) > Number(bucketConfig?.file_size)) {
          throw badRequest("File size limit exceeded");
        }
      }
    }
    // else {
    //   const plan = await getPlanQuota(user.team!);
    //   for (const file of files) {
    //     if (Number(file.size) > Number(plan.stMaxFileSize)) {
    //       return Response.json(`File (${file.name}) size limit exceeded`, {
    //         status: 400,
    //       });
    //     }
    //   }
    // }

    // 检查存储桶容量限制
    const totalUploadSize = files.reduce(
      (sum, file) => sum + Number(file.size),
      0,
    );

    if (bucketConfig?.max_storage) {
      const bucketUsage = await getBucketStorageUsage(
        bucket,
        provider,
        user.id,
      );
      if (bucketUsage.success && bucketUsage.data) {
        const currentUsage = bucketUsage.data.totalSize;
        const maxStorage = Number(bucketConfig.max_storage);

        if (currentUsage + totalUploadSize > maxStorage) {
          const remainingSpace = maxStorage - currentUsage;
          const remainingSpaceGB = (
            remainingSpace /
            (1024 * 1024 * 1024)
          ).toFixed(2);
          throw forbidden(
            `Bucket storage limit exceeded. Remaining space: ${remainingSpaceGB} GB.`,
          );
        }
      }
    }

    const R2 = createS3Client(
      providerChannel.endpoint,
      providerChannel.access_key_id,
      providerChannel.secret_access_key,
    );

    const signedUrls = await Promise.all(
      files.map(async (file: { name: string; type: string; size: number }) => {
        const fileName = generateFileKey(file.name, prefix || "");

        const signedUrl = await getSignedUrl(
          R2,
          new PutObjectCommand({
            Bucket: bucket,
            Key: fileName,
            ContentType: file.type,
            ContentLength: file.size,
          }),
          { expiresIn: 600 }, // 10分钟过期时间
        );

        return {
          originalName: file.name,
          fileName,
          url: signedUrl,
          type: file.type,
          size: file.size,
        };
      }),
    );

    return apiOk({ urls: signedUrls });
  },
  {
    fallbackBody: { error: "Server Error" },
    logMessage: "生成预签名 URL 失败:",
  },
);

export const GET = createAuthedApiRoute(
  async (request: NextRequest, _context: AppRouteHandlerContext) => {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const bucket = url.searchParams.get("bucket");

    if (!path || !bucket) {
      throw badRequest("Invalid request parameters");
    }

    const configs = await getMultipleConfigs<{
      s3_config_01: LegacyS3Config;
    }>(["s3_config_01"]);
    if (!configs.s3_config_01.enabled) {
      throw forbidden("S3 is not enabled");
    }
    if (
      !configs.s3_config_01 ||
      !configs.s3_config_01.access_key_id ||
      !configs.s3_config_01.secret_access_key ||
      !configs.s3_config_01.endpoint
    ) {
      throw forbidden("Invalid S3 config");
    }
    const buckets = configs.s3_config_01.buckets || [];
    if (!buckets.find((b) => b.bucket === bucket)) {
      throw forbidden("Bucket does not exist");
    }

    const R2 = createS3Client(
      configs.s3_config_01.endpoint,
      configs.s3_config_01.access_key_id,
      configs.s3_config_01.secret_access_key,
    );

    const pre_url = await getSignedUrl(
      R2,
      new GetObjectCommand({
        Bucket: bucket,
        Key: path,
      }),
      {
        expiresIn: 600,
      },
    );
    return apiOk({ url: pre_url });
  },
  {
    fallbackBody: { error: "Server Error" },
  },
);
