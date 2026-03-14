"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ShortUrlFormData } from "@/lib/short-urls/types";
import {
  addUrlPrefix,
  cn,
  expirationTime,
  extractHostname,
  nFormatter,
  removeUrlPrefix,
} from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { ClickableTooltip } from "@/components/ui/tooltip";
import { PageSectionEmptyState } from "@/components/shared/page-states";
import BlurImage from "@/components/shared/blur-image";
import { CopyButton } from "@/components/shared/copy-button";
import { Icons } from "@/components/shared/icons";
import { LinkInfoPreviewer } from "@/components/shared/link-previewer";
import { PaginationWrapper } from "@/components/shared/pagination";
import { TimeAgoIntl } from "@/components/shared/time-ago";

import UserUrlMetaInfo from "./meta";
import type { UrlListResponse, UrlListViewer } from "./url-list.types";

interface UrlListResultsProps {
  user: UrlListViewer;
  data?: UrlListResponse;
  isLoading: boolean;
  isPending: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  selectedUrl: ShortUrlFormData | null;
  currentListClickData: Record<string, number>;
  onEdit: (url: ShortUrlFormData) => void;
  onOpenQrCode: (url: ShortUrlFormData) => void;
  onToggleStats: (url: ShortUrlFormData) => void;
  onToggleStatus: (checked: boolean, id: string) => void;
}

const TABLE_COLUMN_COUNT = 8;

function TableColumnSkeleton() {
  return (
    <TableRow className="grid grid-cols-3 items-center sm:grid-cols-11">
      <TableCell className="col-span-1 sm:col-span-2">
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="col-span-1 sm:col-span-2">
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="col-span-1 hidden sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 hidden sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 hidden sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 hidden sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 hidden sm:flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="col-span-1 flex">
        <Skeleton className="h-5 w-16" />
      </TableCell>
    </TableRow>
  );
}

export function UrlListResults({
  user,
  data,
  isLoading,
  isPending,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  selectedUrl,
  currentListClickData,
  onEdit,
  onOpenQrCode,
  onToggleStats,
  onToggleStatus,
}: UrlListResultsProps) {
  const { isMobile } = useMediaQuery();
  const t = useTranslations("List");

  const renderEmpty = () => (
    <PageSectionEmptyState
      icon="link"
      title={t("No urls")}
      description="You don't have any url yet. Start creating url."
      className="col-span-full"
    />
  );

  const renderEmptyRow = () => (
    <TableRow>
      <TableCell colSpan={TABLE_COLUMN_COUNT} className="p-6">
        {renderEmpty()}
      </TableCell>
    </TableRow>
  );

  const renderClicks = (short: ShortUrlFormData) => (
    <>
      <Icons.mousePointerClick className="size-[14px]" />
      {isPending ? (
        <Skeleton className="h-4 w-6 rounded" />
      ) : (
        <p className="text-xs font-medium text-gray-700 dark:text-gray-50">
          {(short.id && nFormatter(currentListClickData[short.id], 2)) || "-"}
        </p>
      )}
    </>
  );

  const renderStats = (short: ShortUrlFormData) => (
    <UserUrlMetaInfo
      user={{
        id: user.id,
        name: user.name,
        team: user.team,
      }}
      action="/api/url/meta"
      urlId={short.id!}
    />
  );

  const renderPagination = () =>
    data && Math.ceil(data.total / pageSize) > 1 ? (
      <PaginationWrapper
        layout={isMobile ? "right" : "split"}
        total={data.total}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    ) : null;

  return (
    <>
      <TabsContent className="mt-0 space-y-3" value="List">
        <Table>
          <TableHeader className="bg-gray-100/50 dark:bg-primary-foreground">
            <TableRow className="grid grid-cols-3 items-center sm:grid-cols-11">
              <TableHead className="col-span-1 flex items-center font-bold sm:col-span-2">
                {t("Slug")}
              </TableHead>
              <TableHead className="col-span-1 flex items-center font-bold sm:col-span-2">
                {t("Target")}
              </TableHead>
              <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                {t("User")}
              </TableHead>
              <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                {t("Enabled")}
              </TableHead>
              <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                {t("Expiration")}
              </TableHead>
              <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                {t("Clicks")}
              </TableHead>
              <TableHead className="col-span-1 hidden items-center font-bold sm:flex">
                {t("Updated")}
              </TableHead>
              <TableHead className="col-span-1 flex items-center font-bold sm:col-span-2">
                {t("Actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <TableColumnSkeleton />
                <TableColumnSkeleton />
                <TableColumnSkeleton />
                <TableColumnSkeleton />
                <TableColumnSkeleton />
              </>
            ) : data?.list?.length ? (
              data.list.map((short) => (
                <TableRow
                  className="grid grid-cols-3 items-center sm:grid-cols-11"
                  key={short.id}
                >
                  <TableCell className="col-span-1 flex items-center gap-1 sm:col-span-2">
                    <Link
                      className="overflow-hidden text-ellipsis whitespace-normal text-slate-600 hover:text-blue-400 hover:underline dark:text-slate-400"
                      href={`https://${short.prefix}/${short.url}${short.password ? `?password=${short.password}` : ""}`}
                      target="_blank"
                      prefetch={false}
                      title={short.url}
                    >
                      <Badge variant="outline">
                        {short.prefix}/{short.url}
                      </Badge>
                    </Link>
                    <CopyButton
                      value={`${short.prefix}/${short.url}${short.password ? `?password=${short.password}` : ""}`}
                      className={cn(
                        "size-[25px]",
                        "duration-250 transition-all group-hover:opacity-100",
                      )}
                    />
                    {short.password ? (
                      <Icons.lock className="size-3 text-neutral-600 dark:text-neutral-400" />
                    ) : null}
                  </TableCell>
                  <TableCell className="col-span-1 flex items-center justify-start sm:col-span-2">
                    <LinkInfoPreviewer
                      apiKey={user.apiKey}
                      url={addUrlPrefix(short.target)}
                      formatUrl={removeUrlPrefix(short.target)}
                    />
                  </TableCell>
                  <TableCell className="col-span-1 hidden truncate sm:flex">
                    <ClickableTooltip
                      className="cursor-pointer truncate"
                      content={
                        <div className="px-2 py-1">
                          <p>{short.user?.name}</p>
                          <p>{short.user?.email}</p>
                        </div>
                      }
                    >
                      {short.user?.name || short.user?.email}
                    </ClickableTooltip>
                  </TableCell>
                  <TableCell className="col-span-1 hidden sm:flex">
                    <Switch
                      checked={short.active === 1}
                      onCheckedChange={(value) =>
                        onToggleStatus(value, short.id || "")
                      }
                    />
                  </TableCell>
                  <TableCell className="col-span-1 hidden sm:flex">
                    {expirationTime(short.expiration, short.updatedAt)}
                  </TableCell>
                  <TableCell className="col-span-1 hidden truncate sm:flex">
                    <div className="flex items-center gap-1 rounded-lg border bg-gray-50 px-2 py-1 dark:bg-gray-600/50">
                      {renderClicks(short)}
                    </div>
                  </TableCell>
                  <TableCell className="col-span-1 hidden truncate sm:flex">
                    <TimeAgoIntl date={short.updatedAt as Date} />
                  </TableCell>
                  <TableCell className="col-span-1 flex items-center gap-1 sm:col-span-2">
                    <Button
                      className="h-7 px-1 text-xs hover:bg-slate-100 dark:hover:text-primary-foreground sm:px-1.5"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(short)}
                    >
                      <p className="hidden text-nowrap sm:block">{t("Edit")}</p>
                      <PenLine className="mx-0.5 size-4 sm:ml-1 sm:size-3" />
                    </Button>
                    <Button
                      className="h-7 px-1 text-xs hover:bg-slate-100 dark:hover:text-primary-foreground"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenQrCode(short)}
                    >
                      <Icons.qrcode className="mx-0.5 size-4" />
                    </Button>
                    <Button
                      className="h-7 px-1 text-xs hover:bg-slate-100 dark:hover:text-primary-foreground"
                      size="sm"
                      variant="outline"
                      onClick={() => onToggleStats(short)}
                    >
                      <Icons.lineChart className="mx-0.5 size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              renderEmptyRow()
            )}
          </TableBody>
        </Table>
        {renderPagination()}
      </TabsContent>

      <TabsContent className="mt-0 space-y-3" value="Grid">
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <Skeleton key={value} className="h-24 w-full" />
              ))}
            </>
          ) : data?.list?.length ? (
            data.list.map((short) => (
              <div
                className={cn(
                  "h-24 rounded-lg border p-1 shadow-inner dark:bg-neutral-800",
                )}
                key={short.id}
              >
                <div className="flex h-full flex-col rounded-lg border border-dotted bg-white px-3 py-1.5 backdrop-blur-lg dark:bg-black">
                  <div className="flex items-center justify-between gap-1">
                    <BlurImage
                      src={`https://unavatar.io/${extractHostname(short.target)}?fallback=https://orz.cm/logo.png`}
                      alt="logo"
                      width={30}
                      height={30}
                      className="rounded-md"
                    />
                    <div className="ml-2 mr-auto flex flex-col justify-between truncate">
                      <div className="flex items-center">
                        <Link
                          className="overflow-hidden text-ellipsis whitespace-normal text-sm font-semibold text-slate-600 hover:text-blue-400 hover:underline dark:text-slate-300"
                          href={`https://${short.prefix}/${short.url}${short.password ? `?password=${short.password}` : ""}`}
                          target="_blank"
                          prefetch={false}
                          title={short.url}
                        >
                          {short.prefix}/{short.url}
                        </Link>
                        <CopyButton
                          value={`https://${short.prefix}/${short.url}${short.password ? `?password=${short.password}` : ""}`}
                          className={cn(
                            "size-[25px]",
                            "duration-250 transition-all group-hover:opacity-100",
                          )}
                        />
                        <Button
                          className="duration-250 size-[26px] p-1.5 text-foreground transition-all hover:border hover:text-foreground dark:text-foreground"
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenQrCode(short)}
                        >
                          <Icons.qrcode className="size-4" />
                        </Button>
                        {short.password ? (
                          <Icons.lock className="size-3 text-neutral-600 dark:text-neutral-400" />
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 overflow-hidden truncate text-sm text-muted-foreground">
                        <Icons.forwardArrow className="size-4 shrink-0 text-gray-400" />
                        <LinkInfoPreviewer
                          apiKey={user.apiKey}
                          url={short.target}
                          formatUrl={removeUrlPrefix(short.target)}
                        />
                      </div>
                    </div>

                    <div className="ml-2 flex items-center gap-1 rounded-md border bg-gray-50 px-2 py-1 dark:bg-gray-600/50">
                      {renderClicks(short)}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="size-[25px] p-1.5" size="sm" variant="ghost">
                          <Icons.moreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                          <Button
                            className="flex w-full items-center gap-2"
                            size="sm"
                            variant="ghost"
                            onClick={() => onToggleStats(short)}
                          >
                            <Icons.lineChart className="size-4" />
                            {t("Analytics")}
                          </Button>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Button
                            className="flex w-full items-center gap-2"
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(short)}
                          >
                            <PenLine className="size-4" />
                            {t("Edit URL")}
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-auto flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                    <ClickableTooltip
                      className="cursor-pointer truncate"
                      content={
                        <div className="px-2 py-1">
                          <p>{short.user?.name}</p>
                          <p>{short.user?.email}</p>
                        </div>
                      }
                    >
                      {short.user?.name || short.user?.email}
                    </ClickableTooltip>
                    <Separator className="h-4/5" orientation="vertical" />
                    {short.expiration !== "-1" ? (
                      <>
                        <span>
                          Expiration:{" "}
                          {expirationTime(short.expiration, short.updatedAt)}
                        </span>
                        <Separator className="h-4/5" orientation="vertical" />
                      </>
                    ) : null}
                    <TimeAgoIntl date={short.updatedAt as Date} />
                    <Switch
                      className="scale-[0.6]"
                      checked={short.active === 1}
                      onCheckedChange={(value) =>
                        onToggleStatus(value, short.id || "")
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            renderEmpty()
          )}
        </section>

        {renderPagination()}
      </TabsContent>

      {selectedUrl?.id ? (
        <TabsContent value={selectedUrl.id}>{renderStats(selectedUrl)}</TabsContent>
      ) : null}
    </>
  );
}
