"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import useSWR from "swr";

import { siteConfig } from "@/config/site";
import { cn, extractHost, fetcher } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Separator } from "../ui/separator";
import EmailManagerExp from "./email";
import PreviewLanding from "./preview-landing";
import UrlShortener from "./url-shortener";

const sectionEyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground";
const sectionTitleClass =
  "mb-4 text-xl font-semibold tracking-tight text-foreground md:text-3xl";
const featureTriggerClass =
  "flex min-h-11 w-full items-center py-3 text-left text-sm font-medium text-foreground transition-colors hover:text-foreground/70";
const featureMediaFrameClass =
  "order-first rounded-3xl border border-border/70 bg-muted/20 p-4 sm:p-6 lg:order-none";
const featureMediaInnerClass =
  "flex min-h-[220px] size-full items-center justify-center sm:min-h-[260px]";
const featureMediaImageClass =
  "h-auto w-full max-w-[260px] object-contain sm:max-w-[350px]";

export default function HeroLanding({
  userId,
}: {
  userId: string | undefined;
}) {
  const t = useTranslations("Landing");

  const {
    data: shortDomains,
    error,
  } = useSWR<{ domain_name: string }[]>(
    "/api/domain?feature=short",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    },
  );
  const domainLabels =
    shortDomains?.length && !error
      ? shortDomains.map((domain) => domain.domain_name)
      : [extractHost(siteConfig.url)];

  return (
    <section className="relative space-y-6 py-12 sm:py-16">
      <div className="container flex max-w-screen-lg flex-col gap-6">
        <h1 className="max-w-4xl text-balance font-satoshi text-[40px] font-black leading-[1.15] tracking-tight sm:text-5xl md:text-6xl md:leading-[1.15]">
          {t("onePlatformPowers")}
          <span className="mt-2 block text-foreground/72">
            {t("endlessSolutions")}
          </span>
        </h1>

        <p className="max-w-2xl text-balance text-muted-foreground sm:text-lg">
          {t("platformDescription")}
        </p>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            prefetch={true}
            className={cn(
              buttonVariants({ rounded: "xl", size: "lg" }),
              "px-4 text-[15px] font-semibold",
            )}
          >
            <span>{userId ? t("Dashboard") : t("signInForFree")}</span>
          </Link>
          <Link
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ rounded: "xl", size: "lg", variant: "outline" }),
              "gap-2 self-start bg-background px-4 text-[15px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <span>GitHub</span>
            <Icons.github className="size-4" />
          </Link>
        </div>

        <PreviewLanding />

        <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
          <p className={sectionEyebrowClass}>{t("Activated Domains")}</p>
          {domainLabels.slice(0, 8).map((domain) => (
            <span
              key={domain}
              className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground"
            >
              {domain}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingImages() {
  const t = useTranslations("Landing");
  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="max-w-2xl space-y-3 text-left">
          <h2 className={sectionEyebrowClass}>
            {t("FEATURES")}
          </h2>
          <p className="text-balance text-2xl font-semibold text-foreground">
            {"All In One Means"}
          </p>
        </div>

        {/* Short Link Service */}
        <div className="mt-16 grid gap-12 sm:px-12 lg:grid-cols-12 lg:gap-24 lg:px-0">
          <div className="items-start px-2 py-4 text-left lg:col-span-5">
            <h3 className={sectionTitleClass}>
              {t("shortLinkService")}
            </h3>
            <p className="font-semibold text-muted-foreground">
              {t("shortLinkDescription")}
            </p>

            <div className="mt-6">
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.link className="mr-2 size-4" /> {t("customSuffix")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("customSuffixDetail", {
                    defaultValue:
                      "Create personalized short links with custom suffixes for better branding",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.lineChart className="mr-2 size-4" />{" "}
                  {t("realtimeStats")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("realtimeStatsDetail", {
                    defaultValue:
                      "Track visitor counts, geographic locations, and device information in real-time",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.pwdKey className="mr-2 size-4" />{" "}
                  {t("passwordProtection")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("passwordProtectionDetail", {
                    defaultValue:
                      "Add password protection to sensitive short links for enhanced security",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.clock className="mr-2 size-4" />
                  {t("linkExpiration")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("linkExpirationDetail", {
                    defaultValue:
                      "Set custom expiration dates for temporary links and campaigns",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.qrcode className="mr-2 size-4" />
                  {t("customQRCode")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("customQRCodeDetail", {
                    defaultValue:
                      "Generate customizable QR codes for your short links",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.braces className="mr-2 size-4" />
                  {t("shortLinkOpenAPI")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("shortLinkOpenAPIDetail", {
                    defaultValue:
                      "Create and manage short links programmatically via REST API",
                  })}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div className={cn(featureMediaFrameClass, "lg:col-span-7")}>
            <div className={featureMediaInnerClass}>
              <Image
                className={featureMediaImageClass}
                alt={t("exampleImageAlt")}
                src="/_static/landing/link.svg"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAACCSURBVBhXZYzBCgIxDEQnTdPau+hveBB/XtiLn+NJQdoNS2Orq6zuO0zgZRhSVbvegeAJGx7hvUeMAUSEzu1RUesEKuNkIgyrFaoFzB4i8i1+cDEwXHOuRc65lbVpe38XuPm+YMdIKa3WOj9F60vWcj0IOg8Xy7ngdDxgv9vO+h/gCZNAKuSRdQ2rAAAAAElFTkSuQmCC"
                width={280}
                height={280}
              />
            </div>
          </div>
        </div>

        {/* Domain Email Service */}
        <div className="mt-16 grid gap-12 sm:px-12 lg:grid-cols-12 lg:gap-24 lg:px-0">
          <div className="items-start px-2 py-4 text-left lg:col-span-5">
            <h3 className={sectionTitleClass}>
              {t("domainEmail")}
            </h3>
            <p className="font-semibold text-muted-foreground">
              {t("domainEmailDescription")}
            </p>

            <div className="mt-6">
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.mail className="mr-2 size-4" />
                  {t("customEmailPrefix")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("customEmailPrefixDetail", {
                    defaultValue:
                      "Create email addresses with custom prefixes using your domain",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.mailPlus className="mr-2 size-4" />
                  {t("unlimitedMailboxes")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("unlimitedMailboxesDetail", {
                    defaultValue:
                      "Create as many email addresses as you need for different purposes",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.inbox className="mr-2 size-4" />
                  {t("unlimitedReceiving")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("unlimitedReceivingDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.send className="mr-2 size-4" />
                  {t("flexibleSending")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("flexibleSendingDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.mailOpen className="mr-2 size-4" />
                  {t("emailForwarding")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("emailForwardingDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.braces className="mr-2 size-4" />
                  {t("emailOpenAPI")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("emailOpenAPIDetail")}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div className={cn(featureMediaFrameClass, "lg:col-span-7")}>
            <div className={featureMediaInnerClass}>
              <Image
                className={featureMediaImageClass}
                alt={t("exampleImageAlt")}
                src="/_static/landing/email.svg"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAACCSURBVBhXZYzBCgIxDEQnTdPau+hveBB/XtiLn+NJQdoNS2Orq6zuO0zgZRhSVbvegeAJGx7hvUeMAUSEzu1RUesEKuNkIgyrFaoFzB4i8i1+cDEwXHOuRc65lbVpe38XuPm+YMdIKa3WOj9F60vWcj0IOg8Xy7ngdDxgv9vO+h/gCZNAKuSRdQ2rAAAAAElFTkSuQmCC"
                width={280}
                height={280}
              />
            </div>
          </div>
        </div>

        {/* Subdomain Hosting Service */}
        <div className="mt-16 grid gap-12 sm:px-12 lg:grid-cols-12 lg:gap-24 lg:px-0">
          <div className="items-start px-2 py-4 text-left lg:col-span-5">
            <h3 className={sectionTitleClass}>
              {t("subdomainHosting")}
            </h3>
            <p className="font-semibold text-muted-foreground">
              {t("subdomainDescription")}
            </p>

            <div className="mt-6">
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.cloudflare className="mr-2 size-4" />
                  {t("cloudflareHosting")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("cloudflareHostingDetail", {
                    defaultValue:
                      "Leverage Cloudflare's global infrastructure for fast and reliable DNS hosting",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.globe className="mr-2 size-4" />
                  {t("multiDomainSync")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("multiDomainSyncDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.puzzle className="mr-2 size-4" />
                  {t("flexibleDNSConfig")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("flexibleDNSConfigDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.globeLock className="mr-2 size-4" />
                  {t("antiAbuseManagement")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("antiAbuseManagementDetail")}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div className={cn(featureMediaFrameClass, "lg:col-span-7")}>
            <div className={featureMediaInnerClass}>
              <Image
                className={featureMediaImageClass}
                alt={t("exampleImageAlt")}
                src="/_static/landing/hosting.svg"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAACCSURBVBhXZYzBCgIxDEQnTdPau+hveBB/XtiLn+NJQdoNS2Orq6zuO0zgZRhSVbvegeAJGx7hvUeMAUSEzu1RUesEKuNkIgyrFaoFzB4i8i1+cDEwXHOuRc65lbVpe38XuPm+YMdIKa3WOj9F60vWcj0IOg8Xy7ngdDxgv9vO+h/gCZNAKuSRdQ2rAAAAAElFTkSuQmCC"
                width={280}
                height={280}
              />
            </div>
          </div>
        </div>

        {/* File Storage Service */}
        <div className="mt-16 grid gap-12 sm:px-12 lg:grid-cols-12 lg:gap-24 lg:px-0">
          <div className="items-start px-2 py-4 text-left lg:col-span-5">
            <h3 className={sectionTitleClass}>
              {t("fileStorage")}
            </h3>
            <p className="font-semibold text-muted-foreground">
              {t("fileStorageDescription")}
            </p>

            <div className="mt-6">
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.globe className="mr-2 size-4" />
                  {t("s3Compatible")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("s3CompatibleDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.dashboard className="mr-2 size-4" />
                  {t("multipleBuckets")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("multipleBucketsDetail", {
                    defaultValue:
                      "Configure multiple storage buckets within a single cloud provider for better organization",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.fileText className="mr-2 size-4" />
                  {t("uploadSizeLimit")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("uploadSizeLimitDetail", {
                    defaultValue:
                      "Set and adjust maximum file upload sizes based on your requirements",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.hand className="mr-2 size-4" />
                  {t("multipleUploadMethods")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("multipleUploadMethodsDetail", {
                    defaultValue:
                      "Upload files using drag-and-drop, batch uploads, or paste from clipboard",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.trash className="mr-2 size-4" />
                  {t("batchDelete")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("batchDeleteDetail", {
                    defaultValue:
                      "Delete multiple files at once for efficient file management",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.qrcode className="mr-2 size-4" />
                  {t("quickShortLink")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("quickShortLinkDetail", {
                    defaultValue:
                      "Instantly generate short links and QR codes for your stored files",
                  })}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div className={cn(featureMediaFrameClass, "lg:col-span-7")}>
            <div className={featureMediaInnerClass}>
              <Image
                className={featureMediaImageClass}
                alt={t("exampleImageAlt")}
                src="/_static/landing/domain.svg"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAACCSURBVBhXZYzBCgIxDEQnTdPau+hveBB/XtiLn+NJQdoNS2Orq6zuO0zgZRhSVbvegeAJGx7hvUeMAUSEzu1RUesEKuNkIgyrFaoFzB4i8i1+cDEwXHOuRc65lbVpe38XuPm+YMdIKa3WOj9F60vWcj0IOg8Xy7ngdDxgv9vO+h/gCZNAKuSRdQ2rAAAAAElFTkSuQmCC"
                width={280}
                height={280}
              />
            </div>
          </div>
        </div>

        {/* Open API Service */}
        <div className="mt-16 grid gap-12 sm:px-12 lg:grid-cols-12 lg:gap-24 lg:px-0">
          <div className="items-start px-2 py-4 text-left lg:col-span-5">
            <h3 className={sectionTitleClass}>
              {t("openAPI")}
            </h3>
            <p className="font-semibold text-muted-foreground">
              {t("openAPIDescription")}
            </p>

            <div className="mt-6">
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.scanQrCode className="mr-2 size-4" />
                  {t("websiteMetadata")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("websiteMetadataDetail", {
                    defaultValue:
                      "Extract metadata such as title, description, and Open Graph tags from any website",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.camera className="mr-2 size-4" />
                  {t("websiteScreenshot")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("websiteScreenshotDetail", {
                    defaultValue:
                      "Capture high-quality screenshots of any website for previews and documentation",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.qrcode className="mr-2 size-4" />
                  {t("websiteQRCode")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("websiteQRCodeDetail", {
                    defaultValue:
                      "Convert any website URL into a scannable QR code",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.monitorDown className="mr-2 size-4" />
                  {t("websiteConversion")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("websiteConversionDetail", {
                    defaultValue:
                      "Convert website content to Markdown or plain text format for easy integration",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.braces className="mr-2 size-4" />
                  {t("apiKeyMechanism")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("apiKeyMechanismDetail")}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div className={cn(featureMediaFrameClass, "lg:col-span-7")}>
            <div className={featureMediaInnerClass}>
              <Image
                className={featureMediaImageClass}
                alt={t("exampleImageAlt")}
                src="/_static/landing/screenshot.svg"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAACCSURBVBhXZYzBCgIxDEQnTdPau+hveBB/XtiLn+NJQdoNS2Orq6zuO0zgZRhSVbvegeAJGx7hvUeMAUSEzu1RUesEKuNkIgyrFaoFzB4i8i1+cDEwXHOuRc65lbVpe38XuPm+YMdIKa3WOj9F60vWcj0IOg8Xy7ngdDxgv9vO+h/gCZNAKuSRdQ2rAAAAAElFTkSuQmCC"
                width={280}
                height={280}
              />
            </div>
          </div>
        </div>

        {/* Permission Management Module */}
        <div className="mt-16 grid gap-12 sm:px-12 lg:grid-cols-12 lg:gap-24 lg:px-0">
          <div className="items-start px-2 py-4 text-left lg:col-span-5">
            <h3 className={sectionTitleClass}>
              {t("permissionManagement")}
            </h3>
            <p className="font-semibold text-muted-foreground">
              {t("permissionManagementDescription")}
            </p>

            <div className="mt-6">
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.lineChart className="mr-2 size-4" />
                  {t("dataVisualization")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("dataVisualizationDetail", {
                    defaultValue:
                      "View comprehensive dashboard with charts showing usage trends and analytics",
                  })}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.cog className="mr-2 size-4" />
                  {t("serviceConfiguration")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("serviceConfigurationDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.users className="mr-2 size-4" />
                  {t("userManagement")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("userManagementDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.shieldCheck className="mr-2 size-4" />
                  {t("loginMethods")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("loginMethodsDetail")}
                </CollapsibleContent>
              </Collapsible>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className={featureTriggerClass}>
                  <Icons.databaseZap className="mr-2 size-4" />
                  {t("resourceManagement")}
                  <Icons.chevronDown className="ml-auto size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 text-sm text-muted-foreground">
                  {t("resourceManagementDetail")}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <div className={cn(featureMediaFrameClass, "lg:col-span-7")}>
            <div className={featureMediaInnerClass}>
              <Image
                className={featureMediaImageClass}
                alt={t("exampleImageAlt")}
                src="/_static/landing/info.svg"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAGCAYAAAD68A/GAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxMAAAsTAQCanBgAAACCSURBVBhXZYzBCgIxDEQnTdPau+hveBB/XtiLn+NJQdoNS2Orq6zuO0zgZRhSVbvegeAJGx7hvUeMAUSEzu1RUesEKuNkIgyrFaoFzB4i8i1+cDEwXHOuRc65lbVpe38XuPm+YMdIKa3WOj9F60vWcj0IOg8Xy7ngdDxgv9vO+h/gCZNAKuSRdQ2rAAAAAElFTkSuQmCC"
                width={280}
                height={280}
              />
            </div>
          </div>
        </div>
      </div>

      <TechStackGrid />

      <DynamicData />

      <div className="mx-auto my-12 grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <UrlShortener />
        <EmailManagerExp />
      </div>
    </>
  );
}

export function DynamicData() {
  const t = useTranslations("Landing");
  return (
    <div>
      <div className="mx-auto mt-10 max-w-5xl space-y-8 px-6 md:space-y-16">
        <div className="max-w-2xl space-y-3 text-left">
          <h2 className={sectionEyebrowClass}>
            {t("STATS")}
          </h2>
          <div className="text-balance text-2xl text-foreground">
            <span style={{ fontFamily: "Bahamas Bold" }}>
              {siteConfig.name} Cloud
            </span>{" "}
            in
            numbers
          </div>
        </div>
        <div className="grid grid-cols-2 gap-12 divide-y-0 text-center md:grid-cols-4 md:gap-2 md:divide-x">
          <div className="space-y-4">
            <div className="text-5xl font-bold text-foreground">2.5K+</div>
            <p>{t("Happy Customers")}</p>
          </div>
          <div className="space-y-4">
            <div className="text-5xl font-bold text-foreground">6.2K+</div>
            <p>{t("Short Links")}</p>
          </div>
          <div className="space-y-4">
            <div className="text-5xl font-bold text-foreground">2M+</div>
            <p>{t("Tracked Clicks")}</p>
          </div>
          <div className="space-y-4">
            <div className="text-5xl font-bold text-foreground">40K+</div>
            <p>{t("Inbox Emails")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TechStackGrid() {
  const t = useTranslations("Landing");
  const items = [
    {
      icon: "N",
      title: "Next.js",
      description: "The most popular full stack React framework.",
    },
    {
      icon: "🔐",
      title: "Next Auth",
      description: "The best open source authentication library.",
    },
    {
      icon: "🗂️",
      title: "Drizzle ORM",
      description: "TypeScript-first SQL toolkit for relational databases.",
    },
    {
      icon: "✏️",
      title: "Shadcn UI",
      description: "Open source components for building modern websites.",
    },
    {
      icon: "🎨",
      title: "Tailwind CSS",
      description: "The CSS framework for rapid UI development.",
    },
    {
      icon: "☁️",
      title: "Cloudflare",
      description: "The best open source cloud platform.",
    },
    {
      icon: "▲",
      title: "Vercel",
      description: "The best open source hosting platform.",
    },
    {
      icon: "📧",
      title: "Resend/Brevo",
      description: "The best email service.",
    },
  ];

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      <div className="max-w-2xl space-y-3 text-left">
        <h2 className={sectionEyebrowClass}>
          {t("TECH STACK")}
        </h2>
        <p className="text-balance text-2xl font-semibold text-foreground">
          {t("Build with your favorite tech stack")}
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="border-t border-border pt-4"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/70 text-lg font-bold text-foreground">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {item.title}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardItem({
  bgColor = "bg-yellow-400",
  rotate = "rotate-12",
  icon,
}: {
  bgColor?: string;
  rotate?: string;
  icon: ReactNode;
}) {
  return (
    <>
      <div
        className={
          `${bgColor} ${rotate}` +
          " flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl text-xl transition-all hover:rotate-0 md:h-20 md:w-20"
        }
      >
        <span className="font-bold text-slate-100 md:scale-150">{icon}</span>
      </div>
    </>
  );
}
