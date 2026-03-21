"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "../shared/icons";

export default function EmailManagerInnovate() {
  const t = useTranslations("Landing");
  const reduceMotion = useReducedMotion();
  const exampleMailbox = siteConfig.mailSupport.replace(/^[^@]+@/, "hello@");

  const inboxItems = [
    {
      from: "Figma",
      subject: t("homeEmailMessageOne"),
      time: "2m",
      unread: true,
    },
    {
      from: "Notion",
      subject: t("homeEmailMessageTwo"),
      time: "8m",
      unread: false,
    },
    {
      from: "GitHub",
      subject: t("homeEmailMessageThree"),
      time: "13m",
      unread: false,
    },
  ];

  return (
    <motion.article
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
      className="rounded-[2rem] border border-border/70 bg-muted/25 p-4 shadow-[0_28px_100px_-56px_rgba(15,23,42,0.34)] sm:p-6"
    >
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
            {t("homeEmailCardEyebrow")}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
            {t("homeEmailCardTitle")}
          </h3>
        </div>
        <Link
          href="/emails"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm", rounded: "full" }),
            "h-10 w-full border-border/80 bg-background px-4 text-sm font-medium shadow-none sm:w-auto",
          )}
        >
          {t("homeEmailCardCta")}
          <Icons.arrowUpRight className="ml-2 size-4" />
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-3xl border border-border/70 bg-background p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {t("homeEmailReadyBadge")}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.24em] text-foreground/35">
                  {exampleMailbox.split("@")[1]}
                </span>
              </div>
              <p className="break-words pr-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
                {exampleMailbox}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("homeEmailHint")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t("homeEmailCopyAction")}
              >
                <Icons.copy className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={t("homeEmailOpenAction")}
              >
                <Icons.mailOpen className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {inboxItems.map((item) => (
              <div
                key={`${item.from}-${item.subject}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-muted/45 px-4 py-3"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
                  <Icons.mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {item.subject}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.from}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.unread ? (
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      {t("homeEmailUnreadBadge")}
                    </span>
                  ) : null}
                  <span className="text-xs font-medium text-foreground/42">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          <PreviewStat
            label={t("homeEmailStatOneLabel")}
            value={t("homeEmailStatOneValue")}
          />
          <PreviewStat
            label={t("homeEmailStatTwoLabel")}
            value={t("homeEmailStatTwoValue")}
          />
          <PreviewStat
            label={t("homeEmailStatThreeLabel")}
            value={t("homeEmailStatThreeValue")}
          />
        </div>
      </div>
    </motion.article>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
