"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";
import { cn, extractHost } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "../shared/icons";

export default function UrlShotenerExp() {
  const appHost = extractHost(siteConfig.url);
  const t = useTranslations("Landing");
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[2rem] border border-border/70 bg-background/95 p-4 shadow-[0_28px_100px_-56px_rgba(15,23,42,0.4)] sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
            {t("homeShortCardEyebrow")}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
            {t("homeShortCardTitle")}
          </h3>
        </div>
        <Link
          href="/dashboard/urls"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm", rounded: "full" }),
            "h-10 w-full border-border/80 bg-background px-4 text-sm font-medium shadow-none sm:w-auto",
          )}
        >
          {t("homeShortCardCta")}
          <Icons.arrowUpRight className="ml-2 size-4" />
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-3xl border border-border/70 bg-muted/30 p-2.5 sm:p-3">
          <div className="relative">
            <Input
              type="text"
              readOnly
              value="https://example.com/campaign/spring-launch?ref=wechat"
              aria-label={t("homeShortInputLabel")}
              className="h-12 rounded-xl border-border/70 bg-background pr-16 text-sm text-foreground shadow-none"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icons.arrowUpRight className="size-4" />
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-background p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {t("homeShortResultBadge")}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.24em] text-foreground/35">
                  {appHost}
                </span>
              </div>
              <p className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground" dir="ltr">
                {appHost}/spring
              </p>
              <div
                className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
                dir="ltr"
                title="https://example.com/campaign/spring-launch?ref=wechat"
              >
                <Icons.forwardArrow className="size-4 shrink-0" />
                <span className="truncate">
                  https://example.com/campaign/spring-launch?ref=wechat
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t("homeShortCopyAction")}
              >
                <Icons.copy className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t("homeShortQrAction")}
              >
                <Icons.qrcode className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            <PreviewStat
              label={t("homeShortStatOneLabel")}
              value={t("homeShortStatOneValue")}
            />
            <PreviewStat
              label={t("homeShortStatTwoLabel")}
              value={t("homeShortStatTwoValue")}
            />
            <PreviewStat
              label={t("homeShortStatThreeLabel")}
              value={t("homeShortStatThreeValue")}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/45 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
