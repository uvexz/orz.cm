"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import type { AppSessionUser } from "@/lib/auth/server";
import randomName from "@scaleway/random-name";
import {
  PanelLeftClose,
  PanelRightClose,
  PenLine,
  Search,
  Sparkles,
  SquarePlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR from "swr";

import { siteConfig } from "@/config/site";
import { UserEmailList } from "@/lib/dto/email";
import { reservedAddressSuffix } from "@/lib/enums";
import { cn, fetcher, nFormatter } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

import { CopyButton } from "../shared/copy-button";
import { EmptyPlaceholder } from "../shared/empty-placeholder";
import { Icons } from "../shared/icons";
import { PaginationWrapper } from "../shared/pagination";
import { TimeAgoIntl } from "../shared/time-ago";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Modal } from "../ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { SendEmailModal } from "./SendEmailModal";

interface EmailSidebarProps {
  user: AppSessionUser;
  onSelectEmail: (emailAddress: string | null) => void;
  selectedEmailAddress: string | null;
  className?: string;
  isCollapsed?: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  isAdminModel: boolean;
  setAdminModel: (isAdminModel: boolean) => void;
  setIsMobileSidebarOpen?: (isOpen: boolean) => void;
}

export default function EmailSidebar({
  user,
  onSelectEmail,
  selectedEmailAddress,
  className,
  isCollapsed,
  setIsCollapsed,
  isAdminModel,
  setAdminModel,
  setIsMobileSidebarOpen,
}: EmailSidebarProps) {
  const { isMobile } = useMediaQuery();
  const t = useTranslations("Email");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [domainSuffix, setDomainSuffix] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const [pageSize] = useState(15);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const sidebarQuery = new URLSearchParams({
    page: currentPage.toString(),
    size: pageSize.toString(),
    search: deferredSearchQuery,
    all: String(isAdminModel),
    unread: String(onlyUnread),
  }).toString();
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const { data, isLoading, error, mutate } = useSWR<{
    list: UserEmailList[];
    total: number;
    totalInboxCount: number;
    totalUnreadCount: number;
  }>(
    `/api/email?${sidebarQuery}`,
    fetcher,
    { dedupingInterval: 5000 },
  );

  const { data: emailDomains, isLoading: isLoadingDomains } = useSWR<
    { domain_name: string; min_email_length: number }[]
  >("/api/domain?feature=email", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const hasEmailDomains = (emailDomains?.length ?? 0) > 0;

  useEffect(() => {
    if (!emailDomains || emailDomains.length === 0) {
      setDomainSuffix(null);
      return;
    }

    if (
      !domainSuffix ||
      !emailDomains.some((domain) => domain.domain_name === domainSuffix)
    ) {
      setDomainSuffix(emailDomains[0].domain_name);
    }
  }, [domainSuffix, emailDomains]);

  useEffect(() => {
    if (!isMobile && !selectedEmailAddress && data && data.list.length > 0) {
      onSelectEmail(data.list[0].emailAddress);
    }
  }, [data, isMobile, onSelectEmail, selectedEmailAddress]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, isAdminModel, onlyUnread]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const pageCount = Math.max(1, Math.ceil(data.total / pageSize));
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, data, pageSize]);

  const userEmails = data?.list || [];
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const handleSubmitEmail = async (emailSuffix: string) => {
    const normalizedEmailSuffix = emailSuffix.trim();
    const selectedDomainSuffix = domainSuffix?.trim();

    if (!hasEmailDomains || !selectedDomainSuffix) {
      toast.error(t("No domains configured"));
      return;
    }

    const limit_len =
      emailDomains?.find((d) => d.domain_name === selectedDomainSuffix)
        ?.min_email_length ?? 1;
    if (!normalizedEmailSuffix || normalizedEmailSuffix.length < limit_len) {
      toast.error(`Email address characters must be at least ${limit_len}`);
      return;
    }
    if (/[^a-zA-Z0-9_\-\.]/.test(normalizedEmailSuffix)) {
      toast.error("Invalid email address");
      return;
    }
    if (reservedAddressSuffix.includes(normalizedEmailSuffix)) {
      toast.error("Email address is reserved, please choose another one");
      return;
    }

    const fullEmailAddress = `${normalizedEmailSuffix}@${selectedDomainSuffix}`;

    startTransition(async () => {
      if (isEdit) {
        const editEmailId = userEmails.find(
          (email) => email.emailAddress === selectedEmailAddress,
        )?.id;
        if (!editEmailId) {
          toast.error(t("Please try again"));
          return;
        }
        const res = await fetch(`/api/email/${editEmailId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailAddress: fullEmailAddress,
          }),
        });
        if (res.ok) {
          await mutate();
          onSelectEmail(fullEmailAddress);
          setShowEmailModal(false);
          toast.success("Email updated successfully");
        } else {
          toast.error("Failed to update email", {
            description: await res.text(),
          });
        }
        return;
      } else {
        try {
          const res = await fetch("/api/email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              emailAddress: fullEmailAddress,
            }),
          });
          if (res.ok) {
            setCurrentPage(1);
            await mutate();
            onSelectEmail(fullEmailAddress);
            setShowEmailModal(false);
            toast.success("Email created successfully");
          } else {
            toast.error("Failed to create email", {
              description: await res.text(),
            });
          }
        } catch (error: unknown) {
          console.log("Error creating email:", error);
          toast.error("Error creating email");
        }
      }
    });
  };

  const handleOpenEditEmail = (
    email: Pick<UserEmailList, "id" | "emailAddress">,
  ) => {
    onSelectEmail(email.emailAddress);
    setDomainSuffix(email.emailAddress.split("@")[1]);
    setIsEdit(true);
    setShowEmailModal(true);
  };

  const handleDeleteEmail = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/email/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const deletedEmail = userEmails.find((email) => email.id === id);
          if (deletedEmail?.emailAddress === selectedEmailAddress) {
            onSelectEmail(null);
          }
          await mutate();
          setShowDeleteModal(false);
          setDeleteInput("");
          setEmailToDelete(null);
          toast.success("Email deleted successfully");
        } else {
          toast.error("Failed to delete email");
        }
      } catch (error) {
        console.log("Error deleting email:", error);
      }
    });
  };

  const confirmDelete = () => {
    if (!emailToDelete) return;

    const selectedEmail = userEmails.find(
      (email) => email.id === emailToDelete,
    );
    if (!selectedEmail) return;

    const expectedInput = `delete ${selectedEmail.emailAddress}`;
    if (deleteInput.trim() === expectedInput) {
      handleDeleteEmail(emailToDelete);
    } else {
      toast.error("Input does not match. Please type correctly.");
    }
  };

  const handleManualRefresh = async () => {
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
  };

  const isSidebarCollapsed = Boolean(isCollapsed);
  const shouldShowExpandedSidebar = !isSidebarCollapsed;

  return (
    <div
      className={cn(
        `flex h-full min-w-0 flex-col border-r transition-all`,
        className,
      )}
    >
      {/* Header */}
      <div className="border-b p-2 text-center">
        {isMobile && selectedEmailAddress && setIsMobileSidebarOpen && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-left">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("Selected mailbox")}</p>
              <p className="truncate text-sm font-medium text-foreground">
                {selectedEmailAddress}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              {t("Open inbox")}
            </Button>
          </div>
        )}

        <div
          className={cn(
            "mb-2 flex items-start justify-center gap-2",
            shouldShowExpandedSidebar && "flex-col sm:flex-row sm:items-center",
          )}
        >
          {shouldShowExpandedSidebar && (
            <div className="flex w-full items-center gap-2">
              <Button
                className="size-9 shrink-0 lg:size-8"
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label={t("Refresh email list")}
              >
                <Icons.refreshCw
                  size={15}
                  className={
                    isRefreshing || isLoading
                      ? "animate-spin stroke-muted-foreground"
                      : "stroke-muted-foreground"
                  }
                />
              </Button>
              <div className="relative w-full grow">
                <Label className="sr-only" htmlFor="email-search">
                  {t("Search emails")}
                </Label>
                <Input
                  id="email-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("Search emails")}
                  className="h-9 w-full border-border bg-background pl-8 text-xs placeholder:text-xs"
                />
                <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              </div>
            </div>
          )}
          {!isMobile && (
            <Button
              className={cn("px-1", shouldShowExpandedSidebar ? "size-8" : "size-9")}
              variant="outline"
              size="icon"
              onClick={() => setIsCollapsed(!isSidebarCollapsed)}
              aria-label={
                isSidebarCollapsed
                  ? t("Expand email sidebar")
                  : t("Collapse email sidebar")
              }
            >
              {isSidebarCollapsed ? (
                <PanelRightClose size={16} className="stroke-muted-foreground" />
              ) : (
                <PanelLeftClose size={16} className="stroke-muted-foreground" />
              )}
            </Button>
          )}
        </div>

        <div
          className={cn(
            "flex gap-2",
            shouldShowExpandedSidebar ? "flex-col sm:flex-row" : "justify-center",
          )}
        >
          <Button
            className={
              shouldShowExpandedSidebar
                ? "flex h-9 min-w-0 flex-1 items-center justify-center gap-2"
                : "mx-auto size-9 lg:size-8"
            }
            variant="default"
            size="icon"
            aria-label={t("Create New Email")}
            onClick={() => {
              setIsEdit(false);
              setShowEmailModal(true);
            }}
            disabled={!hasEmailDomains || isLoadingDomains}
          >
            <SquarePlus className="size-4" />
            {shouldShowExpandedSidebar && (
              <span className="truncate text-xs">{t("Create New Email")}</span>
            )}
          </Button>
          {isMobile && setIsMobileSidebarOpen && selectedEmailAddress && (
            <Button
              type="button"
              variant="outline"
              className="h-9 sm:w-auto"
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              {t("Open inbox")}
            </Button>
          )}
        </div>

        {shouldShowExpandedSidebar && (
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg text-xs text-muted-foreground">
            {/* Address */}
            <div className="flex flex-col items-center gap-1 rounded-md border bg-muted/40 px-1 pb-1 pt-2 transition-colors hover:bg-muted/70">
              <div className="flex items-center gap-1">
                <Icons.mail className="size-3" />
                <p className="line-clamp-1 text-start font-medium">
                  {t("Email Address")}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {nFormatter(data ? data.total : 0)}
              </p>
            </div>

            {/* Inbox Emails */}
            <div className="flex flex-col items-center gap-1 rounded-md border bg-muted/40 px-1 pb-1 pt-2 transition-colors hover:bg-muted/70">
              <div className="flex items-center gap-1">
                <Icons.inbox className="size-3" />
                <p className="line-clamp-1 text-start font-medium">
                  {t("Inbox Emails")}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {nFormatter(data ? data.totalInboxCount : 0)}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              aria-pressed={onlyUnread}
              aria-label={t("Filter unread emails")}
              className={cn(
                "relative h-auto min-h-11 flex-col items-center gap-1 rounded-md border bg-muted/40 px-1 pb-1 pt-2 transition-colors hover:bg-muted/70",
                onlyUnread && "bg-muted",
                { "col-span-2": user.role !== "ADMIN" },
              )}
              onClick={() => {
                setOnlyUnread(!onlyUnread);
              }}
            >
              <div className="flex items-center gap-1">
                <Icons.mailOpen className="size-3" />
                <p className="line-clamp-1 text-start font-medium">
                  {t("Unread Emails")}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {nFormatter(data ? data.totalUnreadCount : 0)}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute bottom-1 right-1">
                      <Icons.listFilter className="size-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t("Filter unread emails")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Button>

            {/* Admin Mode */}
            {user.role === "ADMIN" && (
              <div
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border bg-muted/40 px-1 pb-1 pt-2 transition-colors hover:bg-muted/70",
                  isAdminModel && "bg-muted",
                )}
              >
                <div className="flex items-center gap-1">
                  <Icons.lock className="size-3" />
                  <p className="line-clamp-1 text-start font-medium">
                    {t("Admin Mode")}
                  </p>
                </div>
                <Switch
                  className="scale-90"
                  checked={isAdminModel}
                  aria-label={t("Toggle admin mode")}
                  onCheckedChange={(v) => setAdminModel(v)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="scrollbar-hidden flex-1 overflow-y-scroll">
        {isLoading && (
          <div className="flex flex-col gap-1 px-1 pt-1">
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
            <Skeleton className="h-[60px] w-full rounded-lg" />
          </div>
        )}
        {error &&
          (isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 px-1 py-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleManualRefresh}
                aria-label={t("Refresh email list")}
              >
                <Icons.refreshCw className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-2">
              <EmptyPlaceholder className="max-h-none px-4 py-6 shadow-none">
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
          ))}
        {!error && !isLoading && userEmails && userEmails.length === 0 && (
          <>
            {shouldShowExpandedSidebar ? (
              <div className="flex h-full items-center justify-center">
                <EmptyPlaceholder className="shadow-none">
                  <EmptyPlaceholder.Icon name="mailPlus" />
                  <EmptyPlaceholder.Title>
                    {t("No emails")}
                  </EmptyPlaceholder.Title>
                  <EmptyPlaceholder.Description>
                    You don&apos;t have any email yet. Start creating email.
                  </EmptyPlaceholder.Description>
                </EmptyPlaceholder>
              </div>
            ) : (
              <div className="flex flex-col gap-1 px-1 pt-1">
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
                <Skeleton className="h-[55px] w-full rounded-lg" />
              </div>
            )}
          </>
        )}

        {userEmails.map((email) => (
          <div
            key={email.id}
            className={cn(
              "group m-1 rounded-lg border bg-background p-2 transition-colors hover:bg-muted/40",
              selectedEmailAddress === email.emailAddress && "bg-muted/60",
              isSidebarCollapsed && "flex items-center justify-center",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center justify-between gap-1 text-sm font-bold text-muted-foreground",
                isSidebarCollapsed &&
                  "size-10 justify-center rounded-xl bg-muted text-center text-foreground",
                selectedEmailAddress === email.emailAddress &&
                  isSidebarCollapsed &&
                  "bg-primary text-primary-foreground",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelectEmail(email.emailAddress)}
                aria-pressed={selectedEmailAddress === email.emailAddress}
                className={cn(
                  "h-auto min-w-0 flex-1 justify-start p-0 text-left text-sm font-bold text-foreground hover:bg-transparent",
                  isSidebarCollapsed &&
                    "size-full justify-center text-center text-inherit hover:bg-transparent",
                )}
              >
                <span className="min-w-0 flex-1 truncate" title={email.emailAddress}>
                  {isSidebarCollapsed
                    ? email.emailAddress.slice(0, 1).toLocaleUpperCase()
                    : email.emailAddress}
                </span>
              </Button>
              {shouldShowExpandedSidebar && (
                <div className="ml-2 flex shrink-0 items-center gap-1">
                  <SendEmailModal
                    emailAddress={email.emailAddress}
                    onSuccess={mutate}
                    triggerLabel={t("Send email")}
                    triggerButton={<Icons.send className="size-4 text-primary" />}
                    className={cn(
                      "size-9 shrink-0 rounded-md border border-transparent p-0 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
                      !isMobile
                        ? "hidden hover:bg-background group-hover:inline-flex"
                        : "",
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Edit email")}
                    className={cn(
                      "size-9 shrink-0 rounded-md border border-transparent p-0 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
                      !isMobile
                        ? "hidden hover:bg-background group-hover:inline-flex"
                        : "",
                    )}
                    onClick={() => {
                      handleOpenEditEmail(email);
                    }}
                  >
                    <PenLine aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Delete email")}
                    disabled={Boolean(email.deletedAt)}
                    className={cn(
                      "size-9 shrink-0 rounded-md border border-transparent p-0 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
                      !isMobile
                        ? "hidden hover:bg-background group-hover:inline-flex"
                        : "",
                    )}
                    onClick={() => {
                      if (!email.deletedAt) {
                        setEmailToDelete(email.id);
                        setShowDeleteModal(true);
                      }
                    }}
                  >
                    <Icons.trash aria-hidden="true" className="size-4" />
                  </Button>
                  <CopyButton
                    value={`${email.emailAddress}`}
                    aria-label={t("Copy email address")}
                    className={cn(
                      "size-9 shrink-0 rounded-md border border-transparent p-0",
                      "transition-colors hover:border-border hover:bg-background",
                    )}
                    title="Copy email address"
                  />
                </div>
              )}
            </div>
            {shouldShowExpandedSidebar && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelectEmail(email.emailAddress)}
                aria-label={t("Open email inbox")}
                className="mt-2 h-auto min-w-0 justify-between gap-2 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent"
              >
                <div className="flex min-w-0 items-center gap-1">
                  {email.unreadCount > 0 && (
                    <Badge variant="default">{email.unreadCount}</Badge>
                  )}
                  <span className="truncate">
                    {t("{email} recived", { email: email.count })}
                  </span>
                </div>
                <span className="min-w-0 truncate text-right">
                  {isAdminModel
                    ? `${email.user || email.email.slice(0, 5)} · `
                    : ""}
                  <TimeAgoIntl date={email.createdAt} />
                </span>
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {shouldShowExpandedSidebar && data && totalPages > 1 && (
        <PaginationWrapper
          className="m-0 scale-75"
          total={data.total}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          layout="center"
        />
      )}

      {/* 创建\编辑邮箱的 Modal */}
      {showEmailModal && (
        <Modal
          showModal={showEmailModal}
          setShowModal={setShowEmailModal}
          title={isEdit ? t("Edit email") : t("Create new email")}
        >
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              {isEdit ? t("Edit email") : t("Create new email")}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const emailAddressInput = e.currentTarget.elements.namedItem(
                  "emailAddress",
                );
                const emailAddress =
                  emailAddressInput instanceof HTMLInputElement
                    ? emailAddressInput.value
                    : "";
                handleSubmitEmail(emailAddress);
              }}
            >
              <div className="mb-4">
                <label
                  htmlFor="emailAddress"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  {t("Email Address")}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="emailAddress"
                    name="emailAddress"
                    type="text"
                    placeholder={t("Enter email prefix")}
                    className="w-full sm:rounded-r-none"
                    required
                    defaultValue={
                      isEdit ? selectedEmailAddress?.split("@")[0] || "" : ""
                    }
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  {isLoadingDomains ? (
                    <Skeleton className="h-9 w-full sm:w-1/3 sm:rounded-none sm:border-x-0 sm:shadow-inner" />
                  ) : (
                    <Select
                      onValueChange={(value: string) => {
                        setDomainSuffix(value);
                      }}
                      name="suffix"
                      defaultValue={
                        domainSuffix ||
                        emailDomains?.[0]?.domain_name ||
                        siteConfig.mailSupport.split("@")[1] ||
                        "orz.cm"
                      }
                      disabled={isEdit || !hasEmailDomains}
                    >
                      <SelectTrigger className="w-full sm:w-1/3 sm:rounded-none sm:border-x-0 sm:shadow-inner">
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailDomains && emailDomains.length > 0 ? (
                          emailDomains.map((v) => (
                            <SelectItem
                              key={v.domain_name}
                              value={v.domain_name}
                            >
                              @{v.domain_name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {t("No domains configured")}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    className="sm:rounded-l-none"
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={t("Generate random email prefix")}
                    disabled={isEdit || !hasEmailDomains}
                    onClick={() => {
                      (
                        document.getElementById(
                          "emailAddress",
                        ) as HTMLInputElement
                      ).value = randomName("", ".");
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailModal(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button type="submit" variant="default" disabled={isPending}>
                  {isEdit ? t("Update") : t("Create")}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* 删除邮箱的 Modal */}
      {showDeleteModal && (
        <Modal
          showModal={showDeleteModal}
          setShowModal={setShowDeleteModal}
          title={t("Delete email")}
        >
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold">{t("Delete email")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t(
                "You are about to delete the following email, once deleted, it cannot be recovered",
              )}
              . {t("All emails in inbox will be deleted at the same time")}.{" "}
              {t("Are you sure you want to continue?")}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("To confirm, please type")}{" "}
              <strong className="break-all">
                delete{" "}
                {userEmails.find((e) => e.id === emailToDelete)?.emailAddress}
              </strong>
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={`please input`}
              className="mb-4"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteInput("");
                  setEmailToDelete(null);
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={
                  isPending ||
                  deleteInput.trim() !==
                    `delete ${
                      userEmails.find((e) => e.id === emailToDelete)
                        ?.emailAddress
                    }`
                }
              >
                {t("Confirm Delete")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
