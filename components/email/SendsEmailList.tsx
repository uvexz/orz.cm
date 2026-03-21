"use client";

import { useCallback, useState } from "react";
import type { AppSessionUser } from "@/lib/auth/server";
import type { UserSendEmail } from "@/lib/db/types";
import { useTranslations } from "next-intl";
import useSWR from "swr";

import { cn, fetcher, formatDate, htmlToText, nFormatter } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { Icons } from "../shared/icons";
import { PaginationWrapper } from "../shared/pagination";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Switch } from "../ui/switch";

export default function SendsEmailList({ user }: { user: AppSessionUser }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isAdminModel, setAdminModel] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const t = useTranslations("Email");

  const { data: sendEmails } = useSWR<number>(
    `/api/email/send?all=${isAdminModel}`,
    fetcher,
    {
      dedupingInterval: 5000,
    },
  );

  const { data, isLoading, error } = useSWR<{
    list: UserSendEmail[];
    total: number;
  }>(
    `/api/email/send/list?page=${currentPage}&size=${pageSize}&search=${encodeURIComponent(searchQuery)}&all=${isAdminModel}`,
    fetcher,
    { dedupingInterval: 5000 },
  );

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const debouncedSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  return (
    <div className="h-[calc(100vh-60px)] w-full overflow-auto p-4 xl:p-8">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1 text-xs">
        <div className="flex flex-col items-center gap-1 rounded-md bg-background px-1 pb-1 pt-2 transition-colors hover:bg-muted dark:bg-card dark:hover:bg-muted">
          <div className="flex items-center gap-1">
            <Icons.send className="size-3 text-muted-foreground" />
            <p className="line-clamp-1 text-start font-medium text-muted-foreground">
              {t("Sent Emails")}
            </p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {nFormatter(sendEmails ?? 0)}
          </p>
        </div>

        {/* Admin Mode */}
        {user.role === "ADMIN" && (
          <div
            onClick={() => setAdminModel(!isAdminModel)}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-md bg-background px-1 pb-1 pt-2 transition-colors dark:bg-card",
              isAdminModel ? "bg-muted dark:bg-muted" : "hover:bg-muted dark:hover:bg-muted",
            )}
          >
            <div className="flex items-center gap-1">
              <Icons.lock className="size-3 text-muted-foreground" />
              <p className="line-clamp-1 text-start font-medium text-muted-foreground">
                {t("Admin Mode")}
              </p>
            </div>
            <Switch
              className="scale-90"
              checked={isAdminModel}
              onCheckedChange={(v) => setAdminModel(v)}
            />
          </div>
        )}
      </div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Input
          placeholder={t("Search by send to email")}
          value={searchQuery}
          onChange={handleSearch}
          className="w-full"
        />
        <Input
          placeholder={t("Search by from email")}
          value={searchQuery}
          onChange={handleSearch}
          className="w-full"
          disabled
        />
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-red-500">
          {t("Failed to load emails")}. {t("Please try again")}.
        </div>
      ) : !data || data.list.length === 0 ? (
        <div className="text-center text-muted-foreground">
          {t("No emails found")}.
        </div>
      ) : (
        <div className="scrollbar-hidden overflow-y-auto">
          <div className="space-y-1.5">
            {data.list.map((email) => (
              <Collapsible
                className="w-full rounded-lg border bg-card transition-all duration-200 hover:bg-muted/50"
                key={email.id}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="grids flex items-center justify-between rounded-t-lg bg-muted/70 px-2 py-1.5">
                    <span className="truncate text-xs font-semibold text-muted-foreground">
                      {email.from}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(email.createdAt).getTime())}
                    </span>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-3 p-2 sm:grid-cols-2">
                    <div className="text-start">
                      <div className="truncate text-xs font-semibold text-foreground">
                        <strong>Send To:</strong> {email.to}
                      </div>
                      <p className="line-clamp-1 truncate text-xs font-semibold text-muted-foreground">
                        <strong>Subject:</strong>{" "}
                        {email.subject || "No subject"}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-start text-xs text-muted-foreground">
                      {htmlToText(email.html || "")}
                    </p>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="animate-fade-in break-words border-t border-dashed p-2 text-sm text-neutral-500 dark:text-neutral-100">
                    {htmlToText(email.html || "")}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
          {data && totalPages > 1 && (
            <PaginationWrapper
              className="m-0 mt-6"
              total={data.total}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              layout="split"
            />
          )}
        </div>
      )}
    </div>
  );
}
