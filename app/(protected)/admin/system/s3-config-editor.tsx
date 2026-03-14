"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import type { BucketItem, CloudStorageCredentials } from "@/lib/s3";
import { cn, formatFileSize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/shared/icons";
import {
  PageSectionEmptyState,
  PageSectionSkeleton,
} from "@/components/shared/page-states";

import { S3_PROVIDERS } from "./s3-config-types";

interface S3ConfigEditorProps {
  configs: CloudStorageCredentials[];
  isLoading: boolean;
  isPending: boolean;
  canSave: boolean;
  onSave: () => void;
  onAddProvider: () => void;
  onRemoveProvider: (providerIndex: number) => void;
  onSelectProvider: (providerIndex: number, value: string) => void;
  onUpdateProvider: (
    providerIndex: number,
    updates: Partial<CloudStorageCredentials>,
  ) => void;
  onUpdateBucket: (
    providerIndex: number,
    bucketIndex: number,
    updates: Partial<BucketItem>,
  ) => void;
  onAddBucket: (providerIndex: number, bucketIndex: number) => void;
  onRemoveBucket: (providerIndex: number, bucketIndex: number) => void;
  onMoveBucket: (
    providerIndex: number,
    bucketIndex: number,
    direction: "up" | "down",
  ) => void;
}

function BucketEditor({
  providerIndex,
  bucket,
  bucketIndex,
  bucketCount,
  onUpdateBucket,
  onAddBucket,
  onRemoveBucket,
  onMoveBucket,
}: {
  providerIndex: number;
  bucket: BucketItem;
  bucketIndex: number;
  bucketCount: number;
  onUpdateBucket: S3ConfigEditorProps["onUpdateBucket"];
  onAddBucket: S3ConfigEditorProps["onAddBucket"];
  onRemoveBucket: S3ConfigEditorProps["onRemoveBucket"];
  onMoveBucket: S3ConfigEditorProps["onMoveBucket"];
}) {
  const t = useTranslations("Setting");

  return (
    <motion.div
      className="relative grid grid-cols-1 gap-4 rounded-lg border border-dashed border-muted-foreground px-3 pb-3 pt-10 text-neutral-600 dark:text-neutral-400 sm:grid-cols-4"
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        layout: { duration: 0.3, ease: "easeInOut" },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }}
    >
      <p className="absolute left-2 top-3 text-xs text-muted-foreground">
        {t("Bucket")} {bucketIndex + 1}
      </p>

      <div className="absolute right-2 top-2 flex items-center justify-between space-x-2">
        {bucketIndex > 0 ? (
          <Button
            className="h-[30px] px-1.5"
            size="sm"
            variant="ghost"
            onClick={() => onMoveBucket(providerIndex, bucketIndex, "up")}
          >
            <Icons.arrowUp className="size-4" />
          </Button>
        ) : null}
        {bucketIndex < bucketCount - 1 ? (
          <Button
            className="h-[30px] px-1.5"
            size="sm"
            variant="ghost"
            onClick={() => onMoveBucket(providerIndex, bucketIndex, "down")}
          >
            <Icons.arrowDown className="size-4" />
          </Button>
        ) : null}
        <Button
          className="ml-auto h-[30px] px-1.5"
          size="sm"
          variant="outline"
          onClick={() => onAddBucket(providerIndex, bucketIndex)}
        >
          <Icons.add className="size-4" />
        </Button>
        {bucketIndex !== 0 ? (
          <Button
            className="h-[30px] px-1.5"
            size="sm"
            variant="outline"
            onClick={() => onRemoveBucket(providerIndex, bucketIndex)}
          >
            <Icons.trash className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label>{t("Bucket Name")}*</Label>
        <Input
          value={bucket.bucket}
          placeholder="bucket name"
          onChange={(event) =>
            onUpdateBucket(providerIndex, bucketIndex, {
              bucket: event.target.value,
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>{t("Public Domain")}*</Label>
        <Input
          value={bucket.custom_domain ?? ""}
          placeholder="https://endpoint or custom domain"
          onChange={(event) =>
            onUpdateBucket(providerIndex, bucketIndex, {
              custom_domain: event.target.value,
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>{t("Region")}</Label>
        <Input
          value={bucket.region ?? ""}
          placeholder="auto"
          onChange={(event) =>
            onUpdateBucket(providerIndex, bucketIndex, {
              region: event.target.value,
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>
          {t("Prefix")} ({t("Optional")})
        </Label>
        <Input
          value={bucket.prefix ?? ""}
          placeholder="2025/08/08"
          onChange={(event) =>
            onUpdateBucket(providerIndex, bucketIndex, {
              prefix: event.target.value,
            })
          }
        />
      </div>

      <div className="mt-1 space-y-2">
        <div className="flex items-center gap-1">
          <Label>{t("Max File Size")}</Label>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger>
                <Icons.help className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-wrap">
                {t("maxFileSizeTooltip")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Input
            value={bucket.file_size ?? ""}
            placeholder="26214400"
            onChange={(event) =>
              onUpdateBucket(providerIndex, bucketIndex, {
                file_size: event.target.value,
              })
            }
          />
          {bucket.file_size ? (
            <span className="absolute right-2 top-[11px] text-xs text-muted-foreground">
              ≈{formatFileSize(Number(bucket.file_size))}
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-1">
        <Label>{t("Max File Count")}</Label>
        <Input
          value={bucket.max_files ?? ""}
          placeholder="1000"
          onChange={(event) =>
            onUpdateBucket(providerIndex, bucketIndex, {
              max_files: event.target.value,
            })
          }
        />
      </div>
      <div className="mt-1 space-y-2">
        <div className="flex items-center gap-1">
          <Label>{t("Max Storage")}</Label>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger>
                <Icons.help className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-wrap">
                {t("maxStorageTooltip")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Input
            value={bucket.max_storage ?? ""}
            placeholder="10737418240"
            onChange={(event) =>
              onUpdateBucket(providerIndex, bucketIndex, {
                max_storage: event.target.value,
              })
            }
          />
          {bucket.max_storage ? (
            <span className="absolute right-2 top-[11px] text-xs text-muted-foreground">
              ≈{formatFileSize(Number(bucket.max_storage))}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col justify-center space-y-3">
        <div className="flex items-center gap-1">
          <Label>{t("Public")}</Label>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger>
                <Icons.help className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-wrap">
                {t(
                  "Publicize this storage bucket, all registered users can upload files to this storage bucket; If not public, only administrators can upload files to this storage bucket",
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          checked={bucket.public}
          onCheckedChange={(checked) =>
            onUpdateBucket(providerIndex, bucketIndex, { public: checked })
          }
        />
      </div>
    </motion.div>
  );
}

function ProviderEditor({
  config,
  providerIndex,
  providerCount,
  isPending,
  canSave,
  onSave,
  onRemoveProvider,
  onSelectProvider,
  onUpdateProvider,
  onUpdateBucket,
  onAddBucket,
  onRemoveBucket,
  onMoveBucket,
}: {
  config: CloudStorageCredentials;
  providerIndex: number;
  providerCount: number;
  isPending: boolean;
  canSave: boolean;
  onSave: () => void;
  onRemoveProvider: S3ConfigEditorProps["onRemoveProvider"];
  onSelectProvider: S3ConfigEditorProps["onSelectProvider"];
  onUpdateProvider: S3ConfigEditorProps["onUpdateProvider"];
  onUpdateBucket: S3ConfigEditorProps["onUpdateBucket"];
  onAddBucket: S3ConfigEditorProps["onAddBucket"];
  onRemoveBucket: S3ConfigEditorProps["onRemoveBucket"];
  onMoveBucket: S3ConfigEditorProps["onMoveBucket"];
}) {
  const t = useTranslations("Setting");

  return (
    <Collapsible
      className={cn(
        providerIndex !== providerCount - 1 && "border-b pb-3",
        "group",
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3">
        <p className="mr-auto font-semibold group-hover:font-bold">
          {config.provider_name || `Provider ${providerIndex + 1}`}
        </p>
        <Badge className="text-xs" variant="outline">
          {t("{length} Buckets", {
            length: config.buckets.length,
          })}
        </Badge>
        <Icons.trash
          className="size-6 rounded border p-1 text-muted-foreground hover:border-red-500 hover:bg-red-50 hover:text-red-500"
          onClick={() => onRemoveProvider(providerIndex)}
        />
        <Icons.chevronDown className="size-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 rounded-lg border p-6 shadow-md transition-colors duration-75 group-hover:bg-primary-foreground">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>{t("Provider")}*</Label>
            <Select
              value={
                config.platform && config.channel
                  ? `${config.platform} (${config.channel})`
                  : ""
              }
              onValueChange={(value) => onSelectProvider(providerIndex, value)}
            >
              <SelectTrigger className="bg-neutral-100 dark:bg-neutral-800">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {S3_PROVIDERS.map((provider) => (
                  <SelectItem
                    key={`${provider.platform} (${provider.channel})`}
                    value={`${provider.platform} (${provider.channel})`}
                  >
                    {provider.platform} ({provider.channel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>
              {t("Provider Unique Name")}* ({t("Unique")})
            </Label>
            <Input
              value={config.provider_name ?? ""}
              placeholder="provider display name"
              onChange={(event) =>
                onUpdateProvider(providerIndex, {
                  provider_name: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("Endpoint")}*</Label>
            <Input
              value={config.endpoint ?? ""}
              placeholder="https://<account_id>.r2.cloudflarestorage.com"
              onChange={(event) =>
                onUpdateProvider(providerIndex, {
                  endpoint: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("Access Key ID")}*</Label>
            <Input
              value={config.access_key_id ?? ""}
              onChange={(event) =>
                onUpdateProvider(providerIndex, {
                  access_key_id: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("Secret Access Key")}*</Label>
            <Input
              value={config.secret_access_key ?? ""}
              onChange={(event) =>
                onUpdateProvider(providerIndex, {
                  secret_access_key: event.target.value,
                })
              }
            />
          </div>
          <div className="flex flex-col justify-center space-y-3">
            <Label>{t("Enabled")}*</Label>
            <Switch
              checked={Boolean(config.enabled)}
              onCheckedChange={(checked) =>
                onUpdateProvider(providerIndex, {
                  enabled: checked,
                })
              }
            />
          </div>
        </div>

        {config.buckets.map((bucket, bucketIndex) => (
          <BucketEditor
            key={`bucket-${bucketIndex}`}
            providerIndex={providerIndex}
            bucket={bucket}
            bucketIndex={bucketIndex}
            bucketCount={config.buckets.length}
            onUpdateBucket={onUpdateBucket}
            onAddBucket={onAddBucket}
            onRemoveBucket={onRemoveBucket}
            onMoveBucket={onMoveBucket}
          />
        ))}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {t("How to get the S3 credentials?")}
          </p>
          <Button disabled={isPending || !canSave} onClick={onSave}>
            {isPending ? (
              <Icons.spinner className="mr-1 size-4 animate-spin" />
            ) : null}
            {t("Save")}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function S3ConfigEditor({
  configs,
  isLoading,
  isPending,
  canSave,
  onSave,
  onAddProvider,
  onRemoveProvider,
  onSelectProvider,
  onUpdateProvider,
  onUpdateBucket,
  onAddBucket,
  onRemoveBucket,
  onMoveBucket,
}: S3ConfigEditorProps) {
  const t = useTranslations("Setting");

  if (isLoading) {
    return <PageSectionSkeleton className="h-48" />;
  }

  return (
    <Card>
      <Collapsible defaultOpen>
        <div className="flex items-center gap-3 bg-neutral-50 px-4 py-5 dark:bg-neutral-900">
          <CollapsibleTrigger className="flex flex-1 items-center justify-between gap-3 text-left">
            <p className="mr-auto text-lg font-bold">
              {t("Cloud Storage Configs")}
            </p>
            <Icons.chevronDown className="size-4" />
          </CollapsibleTrigger>
          {canSave ? (
            <Button
              className="h-7 px-2 py-1 text-xs"
              size="sm"
              disabled={isPending || !canSave}
              onClick={onSave}
            >
              {isPending ? (
                <Icons.spinner className="mr-1 size-4 animate-spin" />
              ) : null}
              {t("Save Modifications")}
            </Button>
          ) : null}
          <Button className="h-7 gap-1 px-2 py-1 text-xs" size="sm" onClick={onAddProvider}>
            <Icons.add className="size-3" />
            {t("Add Provider")}
          </Button>
        </div>
        <CollapsibleContent className="space-y-3 bg-neutral-100 p-4 dark:bg-neutral-800">
          {configs.length > 0 ? (
            configs.map((config, providerIndex) => (
              <ProviderEditor
                key={`${config.provider_name}-${providerIndex}`}
                config={config}
                providerIndex={providerIndex}
                providerCount={configs.length}
                isPending={isPending}
                canSave={canSave}
                onSave={onSave}
                onRemoveProvider={onRemoveProvider}
                onSelectProvider={onSelectProvider}
                onUpdateProvider={onUpdateProvider}
                onUpdateBucket={onUpdateBucket}
                onAddBucket={onAddBucket}
                onRemoveBucket={onRemoveBucket}
                onMoveBucket={onMoveBucket}
              />
            ))
          ) : (
            <PageSectionEmptyState
              icon="storage"
              title="No storage providers"
              description="Add a provider to start managing S3-compatible buckets for uploads."
              className="rounded-lg border bg-background"
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
