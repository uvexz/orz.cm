"use client";

import { useState } from "react";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR from "swr";

import type { UserEmailRow } from "@/lib/email/types";
import { fetcher } from "@/lib/utils";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { PaginationWrapper } from "@/components/shared/pagination";
import { TimeAgoIntl } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type TrashEmailResponse = {
  list: UserEmailRow[];
  total: number;
};

function getErrorMessageFromResponse(data: unknown) {
  if (typeof data === "string") {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return null;
}

export default function TrashEmailList() {
  const t = useTranslations("Email");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"restore" | "delete" | null>(
    null,
  );

  const { data, error, isLoading, mutate } = useSWR<TrashEmailResponse>(
    `/api/email/trash?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchQuery)}`,
    fetcher,
    { dedupingInterval: 3000 },
  );

  const handleActionResult = async () => {
    if (data?.list.length === 1 && currentPage > 1) {
      setCurrentPage((page) => Math.max(1, page - 1));
      return;
    }

    await mutate();
  };

  const handleRestore = async (id: string) => {
    setBusyId(id);
    setBusyAction("restore");

    try {
      const response = await fetch("/api/email/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const message = getErrorMessageFromResponse(await response.json());
        throw new Error(message || t("Restore failed"));
      }

      toast.success(t("Email restored successfully"));
      await handleActionResult();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Restore failed"),
      );
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm(t("Confirm permanently deleting this mailbox record?"))) {
      return;
    }

    setBusyId(id);
    setBusyAction("delete");

    try {
      const response = await fetch("/api/email/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const message = getErrorMessageFromResponse(await response.json());
        throw new Error(message || t("Permanently delete failed"));
      }

      toast.success(t("Email permanently deleted"));
      await handleActionResult();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("Permanently delete failed"),
      );
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  return (
    <div className="h-[calc(100vh-60px)] w-full overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 xl:p-8">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>{t("Deleted Email Addresses")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("TrashDescription")}
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
                placeholder={t("Search deleted emails")}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {t("Failed to load emails")}
              </div>
            )}

            {!isLoading && !error && data && data.total === 0 && (
              <EmptyPlaceholder className="max-h-none border border-dashed shadow-none">
                <EmptyPlaceholder.Icon name="trash" />
                <EmptyPlaceholder.Title>{t("No deleted emails")}</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                  {t("TrashEmptyDescription")}
                </EmptyPlaceholder.Description>
              </EmptyPlaceholder>
            )}

            {!isLoading &&
              !error &&
              data?.list.map((email) => {
                const isCurrentRestoreAction =
                  busyId === email.id && busyAction === "restore";
                const isCurrentDeleteAction =
                  busyId === email.id && busyAction === "delete";

                return (
                  <div
                    key={email.id}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{email.emailAddress}</p>
                          <Badge variant="secondary">{t("Deleted mailbox")}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("Deleted")}{" "}
                          <TimeAgoIntl
                            date={new Date(email.deletedAt ?? email.updatedAt)}
                          />
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleRestore(email.id)}
                          disabled={busyId !== null}
                        >
                          <RotateCcw className="mr-2 size-4" />
                          {isCurrentRestoreAction
                            ? t("Restoring")
                            : t("Restore")}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handlePermanentDelete(email.id)}
                          disabled={busyId !== null}
                        >
                          <Trash2 className="mr-2 size-4" />
                          {isCurrentDeleteAction
                            ? t("Deleting")
                            : t("Permanently Delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {data && data.total > pageSize && (
          <PaginationWrapper
            total={data.total}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        )}
      </div>
    </div>
  );
}
