"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import type { ShortUrlFormData } from "@/lib/short-urls/types";
import { fetcher, cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";
import { UrlStatus } from "@/components/dashboard/status-card";
import { FormType } from "@/components/forms/url-form";

import { UrlListModals } from "./url-list-modals";
import { UrlListResults } from "./url-list-results";
import { UrlListToolbar } from "./url-list-toolbar";
import type {
  UrlListProps,
  UrlListResponse,
  UrlListSearchParams,
  UrlListSearchType,
} from "./url-list.types";
import { buildUrlListQuery } from "./url-list.types";

export default function UserUrlsList({ user, action }: UrlListProps) {
  const pathname = usePathname();
  const t = useTranslations("List");
  const [currentView, setCurrentView] = useState<string>("List");
  const [isShowForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FormType>("add");
  const [currentEditUrl, setCurrentEditUrl] = useState<ShortUrlFormData | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isShowQrcode, setShowQrcode] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<ShortUrlFormData | null>(null);
  const [searchParams, setSearchParams] = useState<UrlListSearchParams>({
    slug: "",
    target: "",
    userName: "",
  });
  const [isPending, startTransition] = useTransition();
  const [statusPendingIds, setStatusPendingIds] = useState<Record<string, boolean>>(
    {},
  );
  const [currentListClickData, setCurrentListClickData] = useState<
    Record<string, number>
  >({});

  const [searchType, setSearchType] = useState<UrlListSearchType>("slug");
  const deferredSearchParams = useDeferredValue(searchParams);

  const { mutate } = useSWRConfig();
  const listQuery = useMemo(
    () => buildUrlListQuery(action, currentPage, pageSize, deferredSearchParams),
    [action, currentPage, pageSize, deferredSearchParams],
  );
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;
  const { data, error, isLoading } = useSWR<UrlListResponse, Error>(
    listQuery,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const currentListIds = useMemo(() => {
    return (
      data?.list
        ?.map((item) => item.id)
        .filter((id): id is string => Boolean(id)) ?? []
    );
  }, [data?.list]);
  const currentListIdsKey = currentListIds.join(",");

  useEffect(() => {
    if (!currentListIdsKey) {
      setCurrentListClickData({});
      return;
    }

    let isActive = true;

    startTransition(async () => {
      try {
        const res = await fetch(action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: currentListIds }),
        });
        if (!res.ok) {
          throw new Error((await res.text()) || t("Please try again"));
        }
        if (!isActive) {
          return;
        }
        const nextData = (await res.json()) as Record<string, number>;
        setCurrentListClickData(nextData);
      } catch {
        if (isActive) {
          setCurrentListClickData({});
        }
      }
    });

    return () => {
      isActive = false;
    };
  }, [action, currentListIds, currentListIdsKey, startTransition, t]);

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
    if (!selectedUrl?.id || data?.list?.some((item) => item.id === selectedUrl.id)) {
      return;
    }

    setSelectedUrl(null);
    setCurrentView("List");
    setShowQrcode(false);
  }, [data?.list, selectedUrl, setShowQrcode]);

  const handleRefresh = () => {
    void mutate(listQuery);
  };

  const handleChangeStatu = async (checked: boolean, id: string) => {
    if (!id) {
      return;
    }

    setStatusPendingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const res = await fetch(`/api/url/update/active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          active: checked ? 1 : 0,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || t("Please try again"));
      }

      toast.success(t("Status updated"));
      void mutate(listQuery);
    } catch (error: unknown) {
      toast.error(t("Activation failed"), {
        description: getErrorMessage(error, t("Please try again")),
      });
    } finally {
      setStatusPendingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const currentSearchValue = searchParams[searchType];

  const handleSearchValueChange = (value: string) => {
    setCurrentPage(1);
    setSearchParams({
      slug: searchType === "slug" ? value : "",
      target: searchType === "target" ? value : "",
      userName: searchType === "userName" ? value : "",
    });
  };

  const handleSearchTypeChange = (value: UrlListSearchType) => {
    setSearchType(value);
    setCurrentPage(1);
    setSearchParams({
      slug: "",
      target: "",
      userName: "",
    });
  };

  const handleOpenAddForm = () => {
    setCurrentEditUrl(null);
    setFormType("add");
    setShowForm(true);
  };

  const handleOpenEditForm = (short: ShortUrlFormData) => {
    setCurrentEditUrl(short);
    setFormType("edit");
    setShowForm(true);
  };

  const handleOpenQrCode = (short: ShortUrlFormData) => {
    setSelectedUrl(short);
    setShowQrcode(true);
  };

  const handleToggleStats = (short: ShortUrlFormData) => {
    if (!short.id) {
      return;
    }

    const shortId = short.id;
    setSelectedUrl(short);
    setCurrentView((view) => (view === shortId ? "List" : shortId));
  };

  return (
    <>
      <Tabs
        className={cn(
          "space-y-3 rounded-lg",
          pathname === "/dashboard" && "border p-6",
        )}
        value={currentView}
      >
        <UrlListToolbar
          onChangeView={setCurrentView}
          selectedUrlLabel={
            selectedUrl?.id ? { id: selectedUrl.id, url: selectedUrl.url } : null
          }
          searchType={searchType}
          searchValue={currentSearchValue}
          onSearchTypeChange={handleSearchTypeChange}
          onSearchValueChange={handleSearchValueChange}
          onClearSearch={() => handleSearchValueChange("")}
          userRole={user.role}
          data={data?.list || []}
          isLoading={isLoading}
          error={error}
          onRefresh={handleRefresh}
          onAddUrl={handleOpenAddForm}
          showCreateAction={!action.includes("admin")}
          showDashboardHeading={pathname === "/dashboard"}
        />

        {pathname !== "/dashboard" && <UrlStatus action={action} />}

        <UrlListResults
          user={user}
          data={data}
          isLoading={isLoading}
          isPending={isPending}
          error={error}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          selectedUrl={selectedUrl}
          currentListClickData={currentListClickData}
          statusPendingIds={statusPendingIds}
          onRetry={handleRefresh}
          onEdit={handleOpenEditForm}
          onOpenQrCode={handleOpenQrCode}
          onToggleStats={handleToggleStats}
          onToggleStatus={handleChangeStatu}
        />
      </Tabs>

      <UrlListModals
        user={user}
        selectedUrl={selectedUrl}
        isShowQrcode={isShowQrcode}
        setShowQrcode={setShowQrcode}
        isShowForm={isShowForm}
        setShowForm={setShowForm}
        formType={formType}
        currentEditUrl={currentEditUrl}
        action={action}
        onRefresh={handleRefresh}
        title={{
          qrCode: t("QR Code Design"),
          add: t("Create short link"),
          edit: t("Edit short link"),
        }}
      />
    </>
  );
}
