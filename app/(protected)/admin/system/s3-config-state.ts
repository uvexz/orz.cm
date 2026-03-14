import type { BucketItem, CloudStorageCredentials } from "@/lib/s3";

import {
  createEmptyProvider,
  EMPTY_BUCKET,
  type S3ProviderOption,
} from "./s3-config-types";

function updateConfigAt(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  updater: (config: CloudStorageCredentials) => CloudStorageCredentials,
) {
  return configs.map((config, index) =>
    index === providerIndex ? updater(config) : config,
  );
}

export function areProviderNamesUnique(configs: CloudStorageCredentials[]) {
  const names = configs.map((item) => item.provider_name).filter(Boolean);
  return new Set(names).size === names.length;
}

export function addProvider(configs: CloudStorageCredentials[]) {
  return [...configs, createEmptyProvider(configs.length + 1)];
}

export function removeProvider(
  configs: CloudStorageCredentials[],
  providerIndex: number,
) {
  return configs.filter((_, index) => index !== providerIndex);
}

export function updateProvider(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  updates: Partial<CloudStorageCredentials>,
) {
  return updateConfigAt(configs, providerIndex, (config) => ({
    ...config,
    ...updates,
  }));
}

export function updateProviderSelection(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  provider: S3ProviderOption | undefined,
) {
  return updateProvider(configs, providerIndex, {
    provider_name: `${provider?.value || "Provider"} (${providerIndex + 1})`,
    channel: provider?.channel || "",
    platform: provider?.platform || "",
  });
}

export function updateBucket(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  bucketIndex: number,
  updates: Partial<BucketItem>,
) {
  return updateConfigAt(configs, providerIndex, (config) => ({
    ...config,
    buckets: config.buckets.map((bucket, index) =>
      index === bucketIndex ? { ...bucket, ...updates } : bucket,
    ),
  }));
}

export function addBucket(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  bucketIndex: number,
) {
  return updateConfigAt(configs, providerIndex, (config) => {
    const buckets = [...config.buckets];
    buckets.splice(bucketIndex + 1, 0, { ...EMPTY_BUCKET });
    return {
      ...config,
      buckets,
    };
  });
}

export function removeBucket(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  bucketIndex: number,
) {
  return updateConfigAt(configs, providerIndex, (config) => ({
    ...config,
    buckets: config.buckets.filter((_, index) => index !== bucketIndex),
  }));
}

export function moveBucket(
  configs: CloudStorageCredentials[],
  providerIndex: number,
  bucketIndex: number,
  direction: "up" | "down",
) {
  return updateConfigAt(configs, providerIndex, (config) => {
    const buckets = [...config.buckets];
    const nextIndex = direction === "up" ? bucketIndex - 1 : bucketIndex + 1;
    const [bucket] = buckets.splice(bucketIndex, 1);
    buckets.splice(nextIndex, 0, bucket);

    return {
      ...config,
      buckets,
    };
  });
}
