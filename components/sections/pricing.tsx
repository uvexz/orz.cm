"use client";

import type React from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import useSWR from "swr";

import { siteConfig } from "@/config/site";
import { PlanQuotaFormData } from "@/lib/dto/plan";
import { cn, fetcher, nFormatter } from "@/lib/utils";

import { Icons } from "../shared/icons";
import { buttonVariants } from "../ui/button";

const getBenefits = (plan: PlanQuotaFormData) => [
  {
    text: `${nFormatter(plan.slTrackedClicks)} tracked clicks/mo`,
    checked: true,
    icon: <Icons.mousePointerClick className="size-4" />,
  },
  {
    text: `${nFormatter(plan.slNewLinks)} new links/mo`,
    checked: true,
    icon: <Icons.link className="size-4" />,
  },
  {
    text: `${plan.slAnalyticsRetention}-day analytics retention`,
    checked: true,
    icon: <Icons.calendar className="size-4" />,
  },
  {
    text: `Customize short link QR code`,
    checked: plan.slCustomQrCodeLogo,
    icon: <Icons.qrcode className="size-4" />,
  },
  {
    text: `${nFormatter(plan.emEmailAddresses)} email addresses/mo`,
    checked: true,
    icon: <Icons.mail className="size-4" />,
  },
  {
    text: `${nFormatter(plan.emSendEmails)} send emails/mo`,
    checked: true,
    icon: <Icons.send className="size-4" />,
  },
  {
    text: `${plan.slDomains === 1 ? "One" : plan.slDomains} domain${plan.slDomains > 1 ? "s" : ""}`,
    checked: true,
    icon: <Icons.globe className="size-4" />,
  },
  {
    text: "Advanced analytics",
    checked: plan.slAdvancedAnalytics,
    icon: <Icons.lineChart className="size-4" />,
  },
  {
    text: `${plan.appSupport.charAt(0).toUpperCase() + plan.appSupport.slice(1)} support`,
    checked: true,
    icon: <Icons.help className="size-4" />,
  },
  {
    text: "Open API Access",
    checked: plan.appApiAccess,
    icon: <Icons.unplug className="size-4" />,
  },
];

export const PricingSection = () => {
  const t = useTranslations("Landing");
  const { data: plan } = useSWR<{
    total: number;
    list: PlanQuotaFormData[];
  }>(`/api/plan?all=1`, fetcher);

  return (
    <section
      id="pricing"
      className="relative border-y bg-muted/20 text-foreground"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 text-center md:px-8">
        <div className="mb-12 space-y-3">
          <h2 className="text-center text-xl font-semibold leading-tight sm:text-3xl sm:leading-tight md:text-4xl md:leading-tight">
            {t("pricingTitle")}
          </h2>
          <p className="text-center text-base text-muted-foreground md:text-lg">
            {t("pricingDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plan && (
            <PriceCard
              tier={t("freeTier")}
              price={t("freePrice")}
              bestFor={t("freeBestFor")}
              CTA={
                <Link
                  href={"/dashboard"}
                  className={cn(buttonVariants({ variant: "default" }), "w-full")}
                >
                  {t("getStartedFree")}
                </Link>
              }
              benefits={getBenefits(plan.list[0])}
            />
          )}
          {plan && (
            <PriceCard
              tier={t("enterpriseTier")}
              price={t("enterprisePrice")}
              bestFor={t("enterpriseBestFor")}
              CTA={
                <Link
                  href={`mailto:${siteConfig.mailSupport}`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  {t("contactUs")}
                </Link>
              }
              benefits={getBenefits(plan.list[plan.list.length - 1])}
            />
          )}
        </div>

        <Link
          href="/dashboard"
          prefetch={true}
          className={cn(
            buttonVariants({ rounded: "xl", size: "lg" }),
            "mx-auto mt-16 px-4 text-[15px] font-semibold",
          )}
        >
          {t("Try the cloud version")}
        </Link>
      </div>
    </section>
  );
};

const PriceCard = ({ tier, price, bestFor, CTA, benefits }: PriceCardProps) => {
  return (
    <Card>
      <div className="flex flex-col items-start border-b border-border pb-6 text-left">
        <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {tier}
        </span>
        <span className="mb-2 inline-block text-4xl font-medium text-foreground">
          {price}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {bestFor}
        </span>
      </div>

      <div className="space-y-3 py-9">
        {benefits.map((b, i) => (
          <Benefit {...b} key={i} />
        ))}
      </div>

      {CTA}
    </Card>
  );
};

const Benefit = ({ text, checked, icon }: BenefitType) => {
  return (
    <div className="flex items-center gap-3">
      {checked ? (
        <span className="grid size-5 place-content-center">{icon}</span>
      ) : (
        <span className="grid size-5 place-content-center rounded-full bg-muted text-sm text-muted-foreground">
          <X className="h-3 w-3" />
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        {text}
      </span>
    </div>
  );
};

const Card = ({ className, children, style = {} }: CardProps) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
        delay: 0.25,
      }}
      style={style}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-border bg-background p-6 text-left",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

type PriceCardProps = {
  tier: string;
  price: string;
  bestFor: string;
  CTA: ReactNode;
  benefits: BenefitType[];
};

type CardProps = {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

type BenefitType = {
  text: string;
  checked: boolean;
  icon: ReactNode;
};
