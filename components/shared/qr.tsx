"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { debounce } from "lodash-es";
import { useTranslations } from "next-intl";
import { HexColorPicker } from "react-colorful";

import { siteConfig } from "@/config/site";
import { getQRAsCanvas, getQRAsSVGDataUri, getQRData } from "@/lib/qr";
import { DEFAULT_QR_LOGO } from "@/lib/qr/constants";
import { extractHost } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import BlurImage from "./blur-image";
import { CopyButton } from "./copy-button";
import { Icons } from "./icons";

export default function QRCodeEditor({
  user,
  url,
}: {
  user: { id: string; apiKey: string; team: string };
  url: string;
}) {
  const t = useTranslations("List");
  const fgColorInputId = useId();
  const bgColorInputId = useId();
  const logoSwitchId = useId();
  const sectionLabelClassName = "text-sm font-medium text-foreground";
  const sectionPanelClassName =
    "rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4";
  const [params, setParams] = useState({
    key: user.apiKey,
    url,
    logo: "",
    size: 600,
    level: "Q",
    fgColor: "#d1ffb5",
    bgColor: "#000000",
    margin: 2,
    hideLogo: false,
  });

  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const generateQrCodeUrl = () => {
    const queryParams = new URLSearchParams({
      key: params.key,
      url: params.url,
      size: params.size.toString(),
      level: params.level,
      fgColor: params.fgColor,
      bgColor: params.bgColor,
      margin: params.margin.toString(),
      hideLogo: params.hideLogo.toString(),
    });

    if (params.logo) {
      queryParams.set("logo", params.logo);
    }

    return `/api/v1/scraping/qrcode?${queryParams.toString()}`;
  };

  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      logo: localStorage.getItem("qr-logo") || "",
      fgColor: localStorage.getItem("qr-color-fgColor") || "#d1ffb5",
      bgColor: localStorage.getItem("qr-color-bgColor") || "#000000",
      hideLogo: localStorage.getItem("qr-hide-logo") === "true",
    }));
  }, []);

  useEffect(() => {
    setQrCodeUrl(generateQrCodeUrl());
  }, [params]);

  const handleColorChange = useMemo(
    () =>
      debounce((color: string, type: "fgColor" | "bgColor") => {
        setParams((prev) => ({ ...prev, [type]: color }));
        localStorage.setItem(`qr-color-${type}`, color);
      }, 300),
    [],
  );

  const handleChangeUrl = useMemo(
    () =>
      debounce((value: string) => {
        setParams((prev) => ({ ...prev, url: value }));
      }, 300),
    [],
  );

  const handleChangeLogo = useMemo(
    () =>
      debounce((value: string) => {
        setParams((prev) => ({ ...prev, logo: value }));
        localStorage.setItem("qr-logo", value);
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      handleColorChange.cancel();
      handleChangeUrl.cancel();
      handleChangeLogo.cancel();
    };
  }, [handleChangeLogo, handleChangeUrl, handleColorChange]);

  const handleToggleLogo = (v: boolean) => {
    setParams((prev) => ({ ...prev, hideLogo: !v }));
    localStorage.setItem("qr-hide-logo", (!v).toString());
  };

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${extractHost(params.url).replace(".", "-")}-qrcode.${extension}`;
    anchorRef.current.click();
  }

  const renderColorSwatch = useCallback(
    (color: string, type: "fgColor" | "bgColor", label: string) => {
      const isSelected = params[type] === color;

      return (
        <button
          key={color}
          type="button"
          aria-label={`${label}: ${color}`}
          aria-pressed={isSelected}
          className="size-10 rounded-full border border-border/70 shadow-sm transition-transform duration-200 ease-out hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            backgroundColor: color,
            boxShadow: isSelected ? `0 0 0 2px ${color}` : undefined,
          }}
          onClick={() => handleColorChange(color, type)}
        />
      );
    },
    [handleColorChange, params],
  );

  const colorOptions = [
    "#000000", // Black
    "#c73e33", // Red-orange
    "#df6547", // Light orange
    "#f4b3d7", // Pink
    "#f6cf54", // Light yellow
    "#49a065", // Green
    "#2146b7", // Blue
    "#ae49bf", // Purple
    "#ffffff",
  ];

  const qrData = useMemo(
    () =>
      url
        ? getQRData({
            url: params.url,
            bgColor: params.bgColor,
            fgColor: params.fgColor,
            logo: params.logo,
            size: params.size,
            level: params.level,
            margin: params.margin,
            hideLogo: params.hideLogo,
          })
        : null,
    [url, params],
  );

  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-border/70 bg-background/95 p-4 shadow-sm sm:p-5">
      <h2 className="mb-5 text-base font-semibold tracking-tight">
        {t("QR Code Design")}
      </h2>

      {/* QR Code Preview */}
      <div className={sectionPanelClassName}>
        <div className="flex items-center gap-2">
          <h3 className={sectionLabelClassName}>
            {t("Preview")}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("Download QR code")}
                className="ml-auto size-10 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Icons.download className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                asChild
                onClick={async () => {
                  qrData && download(await getQRAsSVGDataUri(qrData), "svg");
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icons.media className="size-4" />
                  <span className="font-semibold">{t("Download SVG")}</span>
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                onClick={async () => {
                  qrData &&
                    download(
                      (await getQRAsCanvas(qrData, "image/png")) as string,
                      "png",
                    );
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icons.media className="size-4" />
                  <span className="font-semibold">{t("Download PNG")}</span>
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                onClick={async () => {
                  qrData &&
                    download(
                      (await getQRAsCanvas(qrData, "image/jpeg")) as string,
                      "jpg",
                    );
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icons.media className="size-4" />
                  <span className="font-semibold">{t("Download JPG")}</span>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a
            className="hidden"
            download={`${params.url}-qrcode.svg`}
            ref={anchorRef}
          />

          <CopyButton
            aria-label={t("Copy QR code link")}
            value={`${siteConfig.url}${qrCodeUrl}`}
            className="size-10 rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground"
          />
        </div>
        <div className="relative mt-3 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/30">
          <div
            aria-hidden="true"
            className="absolute inset-0 h-full w-full bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] opacity-50 [background-size:8px_9px]"
          ></div>
          <div
            className="flex size-full items-center justify-center"
            style={{ filter: "blur(0px)", opacity: 1, willChange: "auto" }}
          >
            <Suspense
              fallback={<Skeleton className="h-32 w-32 rounded shadow" />}
            >
              {qrCodeUrl && (
                <BlurImage
                  src={qrCodeUrl}
                  alt="Preview of your QR code"
                  width={128}
                  height={128}
                  className="h-auto max-w-full rounded-lg"
                />
              )}
            </Suspense>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label className={sectionLabelClassName} htmlFor="qr-destination-url">
          {t("Url")}
        </Label>
        <Input
          id="qr-destination-url"
          className="w-full sm:w-3/5"
          type="text"
          placeholder="https://example.com"
          defaultValue={params.url}
          onChange={(e) => handleChangeUrl(e.target.value)}
        />
      </div>

      <div className={`mt-4 ${sectionPanelClassName}`}>
        <div className="flex items-center gap-2">
          <Label className={sectionLabelClassName} htmlFor={logoSwitchId}>
            {t("Logo")}
          </Label>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("Display your logo in the center of the QR code")}
                  className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <Icons.help className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-left">
                {t("Display your logo in the center of the QR code")}.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Switch
            id={logoSwitchId}
            className="ml-auto"
            checked={!params.hideLogo}
            onCheckedChange={(v) => handleToggleLogo(v)}
          />
        </div>
        <details className="group mt-3 rounded-xl border border-border/60 bg-background/80 px-3 py-3">
          <summary className="flex w-full list-none cursor-pointer items-center gap-2 [&::-webkit-details-marker]:hidden">
            <h3 className={sectionLabelClassName}>
              {t("Custom Logo")}
            </h3>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span>
                    <Badge
                    variant={"outline"}
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    <Icons.crown className="mr-1 size-3" />
                    Premium
                  </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-left">
                  {t("Customize your QR code logo")}.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Icons.chevronDown className="ml-auto size-4 transition-transform duration-200 ease-out group-open:rotate-180" />
          </summary>
          <Input
            className="mt-3"
            type="text"
            placeholder="https://example.com/logo.png"
            disabled={params.hideLogo}
            defaultValue={params.logo || DEFAULT_QR_LOGO}
            onChange={(e) => handleChangeLogo(e.target.value)}
          />
        </details>
      </div>

      <details className={`group mt-4 ${sectionPanelClassName}`}>
        <summary className="flex w-full list-none cursor-pointer items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <h3 className={sectionLabelClassName}>
            {t("Front Color")}
          </h3>
          <Icons.chevronDown className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-180" />
        </summary>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="relative flex h-10 w-full shrink-0 rounded-lg shadow-sm sm:w-40">
                  <div
                    className="h-full w-10 rounded-l-lg border"
                    data-state="closed"
                    style={{
                      backgroundColor: params.fgColor,
                      borderColor: params.fgColor,
                    }}
                  ></div>
                  <Label className="sr-only" htmlFor={fgColorInputId}>
                    {t("Front Color")}
                  </Label>
                  <input
                    id={fgColorInputId}
                    aria-label={t("Front Color")}
                    className="block w-full rounded-r-lg border-2 border-l-0 bg-background pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    spellCheck="false"
                    defaultValue={params.fgColor}
                    name="front-color"
                    style={{ borderColor: params.fgColor }}
                    onChange={(e) =>
                      handleColorChange(e.target.value, "fgColor")
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <HexColorPicker
                  color={params.fgColor}
                  onChange={(color) => handleColorChange(color, "fgColor")}
                />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-wrap items-center gap-2">
            {colorOptions.map((color) =>
              renderColorSwatch(color, "fgColor", t("Front Color")),
            )}
          </div>
        </div>
      </details>

      <details className={`group mt-4 ${sectionPanelClassName}`} open={true}>
        <summary className="flex w-full list-none cursor-pointer items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <h3 className={sectionLabelClassName}>
            {t("Background Color")}
          </h3>
          <Icons.chevronDown className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-180" />
        </summary>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="relative flex h-10 w-full shrink-0 rounded-lg shadow-sm sm:w-40">
                  <div
                    className="h-full w-10 rounded-l-lg border"
                    data-state="closed"
                    style={{
                      backgroundColor: params.bgColor,
                      borderColor: params.bgColor,
                    }}
                  ></div>
                  <Label className="sr-only" htmlFor={bgColorInputId}>
                    {t("Background Color")}
                  </Label>
                  <input
                    id={bgColorInputId}
                    aria-label={t("Background Color")}
                    className="block w-full rounded-r-lg border-2 border-l-0 bg-background pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    spellCheck="false"
                    defaultValue={params.bgColor}
                    name="background-color"
                    style={{ borderColor: params.bgColor }}
                    onChange={(e) =>
                      handleColorChange(e.target.value, "bgColor")
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="p-3">
                <HexColorPicker
                  color={params.bgColor}
                  onChange={(color) => handleColorChange(color, "bgColor")}
                />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-wrap items-center gap-2">
            {colorOptions.map((color) =>
              renderColorSwatch(color, "bgColor", t("Background Color")),
            )}
          </div>
        </div>
      </details>

      {/* Api Key Mask */}
      {!user.apiKey && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/80 px-4 backdrop-blur-sm">
          <div className="max-w-xs rounded-2xl border border-border/70 bg-background px-5 py-4 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              {t("Please create a api key before use this feature")}.
            </p>

            <Link href={"/dashboard/settings"}>
              <Button className="mt-4">{t("Create Api Key")}</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
