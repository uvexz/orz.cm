import { badRequest } from "@/lib/api/errors";
import { getMultipleConfigs } from "@/lib/dto/system-config";

type S3BucketConfig = {
  bucket: string;
  public?: boolean;
  file_size?: string | number | null;
  max_storage?: string | number | null;
};

export type S3ProviderConfig = {
  provider_name: string;
  platform: string;
  channel: string;
  endpoint: string;
  access_key_id: string;
  secret_access_key: string;
  enabled: boolean;
  buckets?: S3BucketConfig[];
};

export async function getS3ConfigListOrThrow() {
  const configs = await getMultipleConfigs<{
    s3_config_list: S3ProviderConfig[];
  }>(["s3_config_list"]);
  if (!configs || !Array.isArray(configs.s3_config_list)) {
    throw badRequest("Invalid S3 configs");
  }

  return configs.s3_config_list as S3ProviderConfig[];
}

export function getS3ProviderConfigOrThrow(
  configList: S3ProviderConfig[],
  provider: string,
) {
  const providerConfig = configList.find(
    (config) => config.provider_name === provider,
  );

  if (!providerConfig) {
    throw badRequest("Provider does not exist");
  }

  return providerConfig;
}

export function assertS3BucketExists(
  providerConfig: S3ProviderConfig,
  bucket: string,
) {
  const buckets = providerConfig.buckets || [];
  if (!buckets.find((item) => item.bucket === bucket)) {
    throw badRequest("Bucket does not exist");
  }

  return buckets;
}
