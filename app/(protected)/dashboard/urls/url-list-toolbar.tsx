"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/shared/icons";

import { UrlExporter } from "./export";
import type {
  UrlListResponse,
  UrlListSearchType,
  UrlListViewer,
} from "./url-list.types";

interface UrlListToolbarProps {
  onChangeView: (view: string) => void;
  selectedUrlLabel?: {
    id: string;
    url: string;
  } | null;
  searchType: UrlListSearchType;
  searchValue: string;
  onSearchTypeChange: (value: UrlListSearchType) => void;
  onSearchValueChange: (value: string) => void;
  onClearSearch: () => void;
  userRole: UrlListViewer["role"];
  data: UrlListResponse["list"];
  isLoading: boolean;
  onRefresh: () => void;
  onAddUrl: () => void;
  showCreateAction: boolean;
  showDashboardHeading: boolean;
}

export function UrlListToolbar({
  onChangeView,
  selectedUrlLabel,
  searchType,
  searchValue,
  onSearchTypeChange,
  onSearchValueChange,
  onClearSearch,
  userRole,
  data,
  isLoading,
  onRefresh,
  onAddUrl,
  showCreateAction,
  showDashboardHeading,
}: UrlListToolbarProps) {
  const t = useTranslations("List");

  const searchOptions = [
    { value: "slug", label: t("Link Slug") },
    { value: "target", label: t("Link Target") },
    ...(userRole === "ADMIN"
      ? [{ value: "userName" as const, label: t("Username") }]
      : []),
  ];

  const placeholderMap: Record<UrlListSearchType, string> = {
    slug: `${t("Search by slug")}...`,
    target: `${t("Search by target")}...`,
    userName: `${t("Search by username")}...`,
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {showDashboardHeading ? (
        <h2 className="mr-auto text-lg font-semibold">{t("Short URLs")}</h2>
      ) : null}
      <TabsList>
        <TabsTrigger onClick={() => onChangeView("List")} value="List">
          <Icons.list className="size-4" />
        </TabsTrigger>
        <TabsTrigger onClick={() => onChangeView("Grid")} value="Grid">
          <Icons.layoutGrid className="size-4" />
        </TabsTrigger>
        {selectedUrlLabel ? (
          <TabsTrigger
            className="flex items-center gap-1 text-muted-foreground"
            value={selectedUrlLabel.id}
            onClick={() => onChangeView(selectedUrlLabel.id)}
          >
            <Icons.lineChart className="size-4" />
            {selectedUrlLabel.url}
          </TabsTrigger>
        ) : null}
      </TabsList>
      <div className="flex items-center justify-end gap-3">
        <div className="ml-auto flex items-center">
          <Select
            value={searchType}
            onValueChange={(value: UrlListSearchType) => onSearchTypeChange(value)}
          >
            <SelectTrigger className="h-10 w-[85px] rounded-r-none bg-muted text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {searchOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-sm"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Input
              className="h-10 rounded-l-none border-l-0 pr-8 text-sm"
              placeholder={placeholderMap[searchType]}
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
            />
            {searchValue ? (
              <Button
                className="absolute right-2 top-1/2 h-6 -translate-y-1/2 rounded-full px-1 text-gray-500 hover:text-gray-700"
                onClick={onClearSearch}
                variant="ghost"
              >
                <Icons.close className="size-3" />
              </Button>
            ) : null}
          </div>
        </div>
        <UrlExporter data={data} />
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (
            <Icons.refreshCw className="size-4 animate-spin" />
          ) : (
            <Icons.refreshCw className="size-4" />
          )}
        </Button>
        {showCreateAction ? (
          <Button className="flex shrink-0 gap-1" variant="default" onClick={onAddUrl}>
            <Icons.add className="size-4" />
            <span className="hidden sm:inline">{t("Add URL")}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
