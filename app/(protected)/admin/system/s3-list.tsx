"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import type { CloudStorageCredentials } from "@/lib/s3";
import { fetcher } from "@/lib/utils";

import { S3ConfigEditor } from "./s3-config-editor";
import {
  addBucket,
  addProvider,
  areProviderNamesUnique,
  moveBucket,
  removeBucket,
  removeProvider,
  updateBucket,
  updateProvider,
  updateProviderSelection,
} from "./s3-config-state";
import {
  normalizeS3Configs,
  S3_PROVIDERS,
  type S3ConfigResponse,
} from "./s3-config-types";

export default function S3Configs() {
  const [isPending, startTransition] = useTransition();
  const [s3Configs, setS3Configs] = useState<CloudStorageCredentials[]>([]);
  const [hasSyncedConfigs, setHasSyncedConfigs] = useState(false);

  const { data: configs, isLoading, mutate } = useSWR<S3ConfigResponse>(
    "/api/admin/s3",
    fetcher,
  );

  useEffect(() => {
    if (configs) {
      setS3Configs(normalizeS3Configs(configs));
      setHasSyncedConfigs(true);
    }
  }, [configs]);

  const handleSaveConfigs = (value: CloudStorageCredentials[]) => {
    if (!areProviderNamesUnique(s3Configs)) {
      toast.error("Provider name must be unique");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/s3", {
        method: "POST",
        body: JSON.stringify({
          key: "s3_config_list",
          value,
          type: "OBJECT",
        }),
      });
      if (res.ok) {
        toast.success("Saved");
        mutate();
      } else {
        toast.error("Failed to save", {
          description: await res.text(),
        });
      }
    });
  };

  const canSaveR2Credentials = useMemo(() => {
    if (!configs || !hasSyncedConfigs) return false;

    const savedS3Configs = normalizeS3Configs(configs);

    return JSON.stringify(savedS3Configs) !== JSON.stringify(s3Configs);
  }, [s3Configs, configs, hasSyncedConfigs]);

  return (
    <S3ConfigEditor
      configs={s3Configs}
      isLoading={isLoading}
      isPending={isPending}
      canSave={canSaveR2Credentials}
      onSave={() => handleSaveConfigs(s3Configs)}
      onAddProvider={() => setS3Configs((current) => addProvider(current))}
      onRemoveProvider={(providerIndex) =>
        setS3Configs((current) => removeProvider(current, providerIndex))
      }
      onSelectProvider={(providerIndex, value) => {
        const provider = S3_PROVIDERS.find(
          (item) => `${item.platform} (${item.channel})` === value,
        );
        setS3Configs((current) =>
          updateProviderSelection(current, providerIndex, provider),
        );
      }}
      onUpdateProvider={(providerIndex, updates) =>
        setS3Configs((current) => updateProvider(current, providerIndex, updates))
      }
      onUpdateBucket={(providerIndex, bucketIndex, updates) =>
        setS3Configs((current) =>
          updateBucket(current, providerIndex, bucketIndex, updates),
        )
      }
      onAddBucket={(providerIndex, bucketIndex) =>
        setS3Configs((current) => addBucket(current, providerIndex, bucketIndex))
      }
      onRemoveBucket={(providerIndex, bucketIndex) =>
        setS3Configs((current) =>
          removeBucket(current, providerIndex, bucketIndex),
        )
      }
      onMoveBucket={(providerIndex, bucketIndex, direction) =>
        setS3Configs((current) =>
          moveBucket(current, providerIndex, bucketIndex, direction),
        )
      }
    />
  );
}
