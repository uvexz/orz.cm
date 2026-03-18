"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ForwardEmail } from "@/lib/db/types";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR from "swr";

import { cn, fetcher, htmlToText } from "@/lib/utils";

import BlurImage from "../shared/blur-image";
import { EmptyPlaceholder } from "../shared/empty-placeholder";
import { Icons } from "../shared/icons";
import { PaginationWrapper } from "../shared/pagination";
import { TimeAgoIntl } from "../shared/time-ago";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import EmailDetail from "./EmailDetail";
import Loader from "./Loader";
import { SendEmailModal } from "./SendEmailModal";

interface EmailListProps {
  emailAddress: string | null;
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string | null) => void;
  className?: string;
  isAdminModel: boolean;
  showMailboxSwitcher?: boolean;
  onShowMailboxList?: () => void;
}

export default function EmailList({
  emailAddress,
  selectedEmailId,
  onSelectEmail,
  className,
  isAdminModel: _isAdminModel,
  showMailboxSwitcher = false,
  onShowMailboxList,
}: EmailListProps) {
  const t = useTranslations("Email");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showMutiCheckBox, setShowMutiCheckBox] = useState(false);

  const [isDeleting, startDeleteTransition] = useTransition();
  const inboxQuery = emailAddress
    ? new URLSearchParams({
        emailAddress,
        page: currentPage.toString(),
        size: pageSize.toString(),
      }).toString()
    : null;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const { data, error, isLoading, mutate } = useSWR<{
    total: number;
    list: ForwardEmail[];
  }>(
    inboxQuery ? `/api/email/inbox?${inboxQuery}` : null,
    fetcher,
    {
      refreshInterval: isAutoRefresh ? 5000 : 0,
      dedupingInterval: 2000,
    },
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedEmails([]);
    setShowMutiCheckBox(false);
    onSelectEmail(null);
  }, [emailAddress, onSelectEmail]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, data, pageSize]);

  useEffect(() => {
    if (!data?.list) {
      return;
    }

    setSelectedEmails((prev) =>
      prev.filter((id) => data.list.some((email) => email.id === id)),
    );
  }, [data]);

  useEffect(() => {
    if (emailAddress && selectedEmailId) {
      const emailExists = data?.list.some(
        (email) => email.id === selectedEmailId,
      );
      if (!emailExists) {
        onSelectEmail(null);
      }
    }
  }, [emailAddress, data, selectedEmailId]);

  const selectedEmail = useMemo(
    () => data?.list?.find((email) => email.id === selectedEmailId),
    [data?.list, selectedEmailId],
  );

  const emailPreviewMap = useMemo(
    () =>
      new Map(
        (data?.list ?? []).map((email) => [
          email.id,
          email.html ? htmlToText(email.html) : email.text || "No content",
        ]),
      ),
    [data?.list],
  );

  const handleMarkAsRead = async (emailId: string) => {
    try {
      const response = await fetch("/api/email/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });

      if (!response.ok) {
        throw new Error((await response.text()) || t("Please try again"));
      }

      await mutate();
    } catch (error: unknown) {
      toast.error(t("Failed to mark emails as read"), {
        description: getErrorMessage(error, t("Please try again")),
      });
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedEmails.length === 0) {
      toast.error(t("Select at least one email"));
      return;
    }

    try {
      const response = await fetch("/api/email/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: selectedEmails }),
      });

      if (response.ok) {
        setSelectedEmails([]);
        await mutate();
      } else {
        toast.error(t("Failed to mark emails as read"), {
          description: (await response.text()) || t("Please try again"),
        });
      }
    } catch (error: unknown) {
      toast.error(t("Failed to mark emails as read"), {
        description: getErrorMessage(error, t("Please try again")),
      });
    }
  };

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmails((prev) =>
      prev.includes(emailId)
        ? prev.filter((id) => id !== emailId)
        : [...prev, emailId],
    );
  };

  const handleSelectAllEmails = () => {
    setSelectedEmails(data?.list.map((email) => email.id) || []);
  };

  const handleSetAutoRefresh = (value: boolean) => {
    setIsAutoRefresh(value);
  };

  const handleManualRefresh = async () => {
    if (!isAutoRefresh) {
      try {
        setIsRefreshing(true);
        await mutate();
      } catch (error: unknown) {
        toast.error(t("Refresh failed"), {
          description: getErrorMessage(error, t("Please try again")),
        });
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleEmailSelection = (emailId: string | null) => {
    if (emailId) {
      const nextSelectedEmail = data?.list?.find((email) => email.id === emailId);
      if (nextSelectedEmail && !nextSelectedEmail.readAt) {
        handleMarkAsRead(emailId);
      }
    }
    onSelectEmail(emailId);
  };

  const handleDeletEmails = async (ids: string[]) => {
    startDeleteTransition(async () => {
      try {
        const response = await fetch("/api/email/inbox", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          throw new Error((await response.text()) || t("Please try again"));
        }

        if (selectedEmailId && ids.includes(selectedEmailId)) {
          onSelectEmail(null);
        }
        setSelectedEmails([]);
        await mutate();
      } catch (error: unknown) {
        toast.error(t("Failed to delete emails"), {
          description: getErrorMessage(error, t("Please try again")),
        });
      }
    });
  };

  if (!emailAddress) {
    return <EmptyInboxSection />;
  }

  return (
    <div className={cn("grids flex min-w-0 flex-1 flex-col", className)}>
      <div className="border-b bg-muted/30 p-2 text-foreground">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium sm:text-base">
          {showMailboxSwitcher && onShowMailboxList && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={onShowMailboxList}
              aria-label={t("Back to mailboxes")}
            >
              <Icons.chevronLeft className="size-4" />
            </Button>
          )}
          <Icons.inbox size={20} />
          <span>{t("INBOX")}</span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <SendEmailModal emailAddress={emailAddress} onSuccess={mutate} />
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Switch
                    className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted-foreground/30 dark:data-[state=unchecked]:bg-muted-foreground/40"
                    onCheckedChange={handleSetAutoRefresh}
                    checked={isAutoRefresh}
                    aria-label={t("Auto refresh")}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("Auto refresh")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoading || isAutoRefresh}
              className="h-9"
              aria-label={t("Refresh email list")}
            >
              <Icons.refreshCw
                size={15}
                className={cn(
                  isRefreshing || isLoading || isAutoRefresh
                    ? "animate-spin"
                    : "",
                )}
              />
            </Button>
            <Button
              className={cn(
                "h-9",
                showMutiCheckBox ? "bg-primary text-primary-foreground" : "",
              )}
              variant="outline"
              size="sm"
              onClick={() => setShowMutiCheckBox(!showMutiCheckBox)}
              aria-pressed={showMutiCheckBox}
              aria-label={t("Select all")}
            >
              <Icons.listChecks className="size-4" />
            </Button>
            {showMutiCheckBox && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex h-9 items-center gap-1"
                  >
                    <span className="text-sm">{t("more")}</span>
                    <Icons.chevronDown className="mt-0.5 size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllEmails}
                      className="w-full"
                    >
                      <span className="text-xs">{t("Select all")}</span>
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    disabled={selectedEmails.length === 0}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkSelectedAsRead}
                      className="w-full"
                    >
                      <span className="text-xs">{t("Mark as read")}</span>
                    </Button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    disabled={isDeleting || selectedEmails.length === 0}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDeletEmails(selectedEmails)}
                    >
                      {isDeleting && (
                        <Icons.spinner className="mr-1 size-4 animate-spin" />
                      )}
                      <span className="text-xs">{t("Delete selected")}</span>
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
      {isLoading && (
        <div className="flex flex-col gap-2 p-1">
          {[...Array(9)].map((_, index) => (
            <Skeleton key={index} className="h-[80px] w-full rounded-lg" />
          ))}
        </div>
      )}
      {!isLoading && error && (
        <div className="flex h-[calc(100vh-105px)] items-center justify-center p-4">
          <EmptyPlaceholder className="max-h-none shadow-none">
            <EmptyPlaceholder.Icon name="warning" />
            <EmptyPlaceholder.Title>
              {t("Failed to load emails")}
            </EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description className="max-w-sm break-words">
              {getErrorMessage(error, t("Please try again"))}
            </EmptyPlaceholder.Description>
            <Button type="button" variant="outline" onClick={handleManualRefresh}>
              {t("Retry")}
            </Button>
          </EmptyPlaceholder>
        </div>
      )}
      {!isLoading && !error && (
        <div className="scrollbar-hidden relative h-[calc(100vh-105px)] animate-fade-in overflow-scroll">
          {selectedEmailId ? (
            <EmailDetail
              email={selectedEmail}
              selectedEmailId={selectedEmailId}
              onClose={() => onSelectEmail(null)}
              onMarkAsRead={() => handleMarkAsRead(selectedEmailId)}
            />
          ) : (
            <>
              {data && data.total > 0 ? (
                data.list.map((email) => (
                  <div
                    key={email.id}
                    className="border-b border-dotted bg-background px-3 py-2 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {showMutiCheckBox && (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedEmails.includes(email.id)}
                            onCheckedChange={() => handleSelectEmail(email.id)}
                            className="mr-3 size-4 border-neutral-300 bg-neutral-100 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-600 data-[state=checked]:text-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:data-[state=checked]:border-neutral-300 dark:data-[state=checked]:bg-neutral-300"
                          />
                        </div>
                      )}
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleEmailSelection(email.id)}
                      >
                        <div className="mb-1 flex min-w-0 flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                            {email.fromName || email.subject || "Untitled"}
                          </span>
                          <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-400 tabular-nums">
                            <TimeAgoIntl
                              date={new Date(email.date ?? email.createdAt)}
                            />
                          </span>
                          {email.readAt && (
                            <Icons.checkCheck className="ml-2 size-3 text-green-600" />
                          )}
                        </div>
                        <div className="mb-0.5 min-w-0 line-clamp-1 truncate text-sm font-medium text-neutral-600 dark:text-neutral-400">
                          {email.subject}
                        </div>
                        <div className="line-clamp-2 break-words text-sm leading-5 text-neutral-500">
                          {emailPreviewMap.get(email.id) || "No content"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-[calc(100vh-135px)] flex-col items-center justify-center gap-8">
                  <Loader />
                  <p className="font-mono font-semibold text-neutral-500">
                    {t("Waiting for new emails")}...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {data && Math.ceil(data.total / pageSize) > 1 && (
        <PaginationWrapper
          className="mx-2 my-1"
          total={data.total}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
        />
      )}
    </div>
  );
}

export function EmptyInboxSection() {
  const t = useTranslations("Email");
  return (
    <div className="grids flex flex-1 animate-fade-in flex-col items-center justify-center p-4 text-center text-neutral-600 dark:text-neutral-400">
      <BlurImage
        className="size-40"
        src="/_static/landing/mailbox.svg"
        height={200}
        width={200}
        alt="Inbox"
      />
      <h2 className="my-2 text-lg font-semibold">
        {t("No Email Address Selected")}
      </h2>
      <p className="max-w-md text-sm">
        {t("Please select an email address from the list to view your inbox")}.
        {t("Once selected, your emails will appear here automatically")}.
      </p>
      <ul className="mt-3 list-disc text-left">
        <li>{t("How to use email to send or receive emails?")}</li>
        <li>{t("Will my email or inbox expire?")}</li>
        <li>{t("What is the limit? It's free?")}</li>
        <li>{t("How to create emails with api?")}</li>
      </ul>
      <div className="mt-6 flex gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300 delay-100 dark:bg-neutral-600" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-300 delay-200 dark:bg-neutral-600" />
      </div>
    </div>
  );
}
