import type { BucketItem, CloudStorageCredentials } from "@/lib/s3";

export interface S3ConfigResponse {
  s3_config_list?: CloudStorageCredentials[];
}

export interface S3ProviderOption {
  label: string;
  value: string;
  platform: string;
  channel: string;
}

export const S3_PROVIDERS: S3ProviderOption[] = [
  {
    label: "Cloudflare R2",
    value: "Cloudflare R2",
    platform: "cloudflare",
    channel: "r2",
  },
  {
    label: "AWS S3",
    value: "AWS S3",
    platform: "aws",
    channel: "s3",
  },
  {
    label: "Tencent COS",
    value: "Tencent COS",
    platform: "tencent",
    channel: "cos",
  },
  {
    label: "Ali OSS",
    value: "Ali OSS",
    platform: "ali",
    channel: "oss",
  },
  {
    label: "Custom Provider",
    value: "Custom Provider",
    platform: "custom provider",
    channel: "cp",
  },
];

export const EMPTY_BUCKET: BucketItem = {
  bucket: "",
  prefix: "",
  file_types: "",
  region: "auto",
  custom_domain: "",
  file_size: "26214400",
  max_storage: "1073741824",
  max_files: "1000",
  public: true,
};

export function createEmptyProvider(index: number): CloudStorageCredentials {
  return {
    platform: "cloudflare",
    channel: "s3",
    provider_name: `Cloudflare R2 (${index})`,
    account_id: "",
    access_key_id: "",
    secret_access_key: "",
    endpoint: "",
    enabled: true,
    buckets: [{ ...EMPTY_BUCKET }],
  };
}

export function normalizeS3Configs(configs?: S3ConfigResponse) {
  if (!Array.isArray(configs?.s3_config_list)) {
    return [];
  }

  return configs.s3_config_list.map((config) => ({
    ...config,
    buckets: (config.buckets || []).map((bucket) => ({ ...bucket })),
  }));
}
