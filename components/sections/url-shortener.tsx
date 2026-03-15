import Link from "next/link";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";
import { cn, extractHost } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Icons } from "../shared/icons";

export default function UrlShotenerExp() {
  const appHost = extractHost(siteConfig.url);
  const t = useTranslations("Landing");

  return (
    <section className="mx-auto mt-6 w-full max-w-xl space-y-4">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-link2 size-3.5 text-foreground"
          >
            <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
            <line x1="8" x2="16" y1="12" y2="12"></line>
          </svg>
          {t("Try it out")}
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {appHost}
        </span>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div className="flex items-center">
            <Input
              type="text"
              placeholder={t("Shorten any link")}
              readOnly
              aria-label={t("Shorten any link")}
              className="h-12 rounded-xl border-border bg-background pr-14 text-sm text-foreground shadow-none"
            />
            <Link
              href="/dashboard/urls"
              className={cn(
                buttonVariants({ size: "icon", rounded: "full" }),
                "absolute right-1.5 top-1/2 size-11 -translate-y-1/2",
              )}
              aria-label={t("Open URL dashboard")}
            >
              <Icons.arrowDown className="size-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    fill="white"
                  />
                  <path
                    d="M16.5 12C16.5 14.4853 14.4853 16.5 12 16.5C9.51472 16.5 7.5 14.4853 7.5 12C7.5 9.51472 9.51472 7.5 12 7.5C14.4853 7.5 16.5 9.51472 16.5 12Z"
                    fill="black"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p
                    className="truncate text-base font-bold text-foreground"
                    dir="ltr"
                    title={`${appHost}/try`}
                  >
                    {appHost}/try
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label={t("Copy short link")}
                    >
                      <Icons.copy className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label={t("Open QR code")}
                    >
                      <Icons.qrcode className="size-4" />
                    </button>
                  </div>
                </div>
                <div
                  className="mt-1 flex min-w-0 items-center gap-1 text-sm font-medium text-muted-foreground"
                  dir="ltr"
                  title={`${appHost}/dashboard`}
                >
                  <Icons.forwardArrow className="h-4 w-4 shrink-0" />
                  <span className="truncate">{appHost}/dashboard</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:self-auto">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <Icons.mousePointerClick className="size-4" />
                <p className="text-sm font-medium text-foreground">
                  12.6K <span>{t("clicks")}</span>
                </p>
              </div>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t("More actions")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-current"
                >
                  <path
                    d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
