import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";
import { constructMetadata, cn } from "@/lib/utils";
import EmailManagerInnovate from "@/components/sections/email";
import UrlShotenerExp from "@/components/sections/url-shortener";
import { Icons } from "@/components/shared/icons";
import { buttonVariants } from "@/components/ui/button";

export const metadata = constructMetadata({
  title: `${siteConfig.name} - 短链接与临时邮箱`,
  description: "更快分享链接，更快拿到临时邮箱。首页只保留两个高频入口：短链接与临时邮箱。",
});

export default async function IndexPage() {
  const t = await getTranslations("Landing");

  const featurePills = [
    t("homeFeatureFast"),
    t("homeFeatureInstant"),
    t("homeFeatureLight"),
  ];

  const shortLinkItems = [
    {
      icon: Icons.link,
      title: t("homeShortCapabilityOneTitle"),
      description: t("homeShortCapabilityOneDescription"),
    },
    {
      icon: Icons.copy,
      title: t("homeShortCapabilityTwoTitle"),
      description: t("homeShortCapabilityTwoDescription"),
    },
    {
      icon: Icons.lineChart,
      title: t("homeShortCapabilityThreeTitle"),
      description: t("homeShortCapabilityThreeDescription"),
    },
    {
      icon: Icons.qrcode,
      title: t("homeShortCapabilityFourTitle"),
      description: t("homeShortCapabilityFourDescription"),
    },
  ];

  const emailItems = [
    {
      icon: Icons.mailPlus,
      title: t("homeEmailCapabilityOneTitle"),
      description: t("homeEmailCapabilityOneDescription"),
    },
    {
      icon: Icons.inbox,
      title: t("homeEmailCapabilityTwoTitle"),
      description: t("homeEmailCapabilityTwoDescription"),
    },
    {
      icon: Icons.clock,
      title: t("homeEmailCapabilityThreeTitle"),
      description: t("homeEmailCapabilityThreeDescription"),
    },
    {
      icon: Icons.shieldCheck,
      title: t("homeEmailCapabilityFourTitle"),
      description: t("homeEmailCapabilityFourDescription"),
    },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_68%)]" />
      <div className="absolute inset-x-0 top-24 h-px bg-border/60" />

      <div className="container relative space-y-16 pb-20 pt-14 sm:space-y-24 sm:pt-20 md:pb-32 lg:space-y-28">
        <section className="grid gap-8 border-b border-border/70 pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-end lg:gap-14 lg:pb-20">
          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-5">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/90 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-foreground/70 uppercase">
                {t("homeEyebrow")}
              </span>
              <h1 className="max-w-5xl text-balance font-satoshi text-[clamp(3.25rem,9vw,7rem)] font-black leading-[0.94] tracking-tight text-foreground">
                <span className="block">{t("homeTitlePrimary")}</span>
                <span className="mt-3 block text-foreground/55">
                  {t("homeTitleSecondary")}
                </span>
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {t("homeDescription")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/dashboard/urls"
                className={cn(
                  buttonVariants({ size: "lg", rounded: "full" }),
                  "h-12 w-full px-6 text-sm font-semibold sm:w-auto",
                )}
              >
                {t("homePrimaryCta")}
                <Icons.arrowUpRight className="ml-2 size-4" />
              </Link>
              <Link
                href="/emails"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg", rounded: "full" }),
                  "h-11 justify-center px-3 text-sm font-semibold text-foreground/72 hover:bg-muted/70 hover:text-foreground sm:h-12 sm:px-5",
                )}
              >
                {t("homeSecondaryCta")}
                <Icons.arrowRight className="ml-2 size-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/70 pt-5 sm:pt-6">
              {featurePills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground/72"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:pb-1">
            <div className="rounded-[1.75rem] border border-border/70 bg-background/90 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.32)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
                {t("homeAsideEyebrow")}
              </p>
              <div className="mt-5 space-y-4">
                <div className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                  <p className="text-base font-semibold text-foreground">
                    {t("homeAsideShortTitle")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t("homeAsideShortDescription")}
                  </p>
                </div>
                <div className="border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                  <p className="text-base font-semibold text-foreground">
                    {t("homeAsideEmailTitle")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t("homeAsideEmailDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
                {t("homePreviewEyebrow")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
                {t("homePreviewTitle")}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-right">
              {t("homePreviewDescription")}
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start">
            <div id="short-links" className="scroll-mt-24">
              <UrlShotenerExp />
            </div>
            <div id="temp-email" className="scroll-mt-24 lg:pt-10">
              <EmailManagerInnovate />
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-y border-border/70 py-14 sm:gap-14 sm:py-16 lg:grid-cols-2 lg:gap-20 lg:py-20">
          <CapabilitySection
            eyebrow={t("homeShortSectionEyebrow")}
            title={t("homeShortSectionTitle")}
            description={t("homeShortSectionDescription")}
            items={shortLinkItems}
          />
          <CapabilitySection
            eyebrow={t("homeEmailSectionEyebrow")}
            title={t("homeEmailSectionTitle")}
            description={t("homeEmailSectionDescription")}
            items={emailItems}
          />
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-muted/30 p-6 sm:p-10 lg:p-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
                {t("homeClosingEyebrow")}
              </p>
              <h2 className="max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl md:text-4xl">
                {t("homeClosingTitle")}
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {t("homeClosingDescription")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "lg", rounded: "full" }),
                  "h-12 px-6 text-sm font-semibold",
                )}
              >
                {t("homeClosingPrimaryCta")}
              </Link>
              <Link
                href={`mailto:${siteConfig.mailSupport}`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg", rounded: "full" }),
                  "h-12 px-2 text-sm font-semibold text-foreground/72 hover:bg-transparent hover:text-foreground",
                )}
              >
                {t("homeClosingSecondaryCta")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

type CapabilitySectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{
    icon: ComponentType<LucideProps>;
    title: string;
    description: string;
  }>;
};

function CapabilitySection({
  eyebrow,
  title,
  description,
  items,
}: CapabilitySectionProps) {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/45">
          {eyebrow}
        </p>
        <h3 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          {title}
        </h3>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="border-y border-border/70">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="grid gap-3 border-b border-border/70 py-5 last:border-b-0 sm:grid-cols-[auto_1fr] sm:gap-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-base font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
