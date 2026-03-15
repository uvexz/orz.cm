"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import pkg from "package.json";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "../ui/button";

interface VersionNotifierProps {
  currentVersion?: string;
  githubRepo?: string;
  className?: string;
}

const VersionNotifier: React.FC<VersionNotifierProps> = ({
  currentVersion = pkg.version,
  githubRepo = new URL(siteConfig.links.github).pathname.replace(/^\//, ""),
  className = "",
}) => {
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [showUpdate, setShowUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const t = useTranslations("Setting");

  const compareVersions = (v1: string, v2: string): boolean => {
    const normalize = (v: string) => v.replace(/^v/, "").split(".").map(Number);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return true;
      if (a < b) return false;
    }
    return false;
  };

  const checkVersion = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setHasError(false);
    try {
      const response = await fetch(
        `https://api.github.com/repos/${githubRepo}/releases/latest`,
      );
      if (!response.ok) {
        throw new Error(`GitHub releases request failed: ${response.status}`);
      }

      const data = await response.json();
      setLatestVersion(data.tag_name);

      const hasUpdate = compareVersions(data.tag_name, currentVersion);
      const dismissed =
        localStorage.getItem(`dismissed-${data.tag_name}`) === "true";

      setShowUpdate(hasUpdate && !dismissed);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissUpdate = () => {
    localStorage.setItem(`dismissed-${latestVersion}`, "true");
    setShowUpdate(false);
  };

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={checkVersion}
        disabled={isLoading}
        variant={"outline"}
        size={"sm"}
        aria-busy={isLoading}
        className={`ml-auto rounded-full border-border/70 bg-background/80 text-xs shadow-sm transition-colors duration-200 hover:bg-accent/60 ${className}`}
      >
        <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
        {t("Check for updates")}
      </Button>
      {hasError && !showUpdate ? (
        <p className="max-w-56 text-right text-xs text-muted-foreground">
          {t("Unable to check for updates")}
        </p>
      ) : null}
      {showUpdate && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div
            aria-live="polite"
            className="rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <span className="text-sm font-medium text-foreground">
                  🎉 {t("New version available", { version: latestVersion })}
                </span>
                <p className="text-xs text-muted-foreground">
                  v{currentVersion} {"->"} {latestVersion}
                </p>
              </div>
              <Button
                onClick={() => setShowUpdate(false)}
                className="size-9 shrink-0 rounded-full px-0 text-muted-foreground"
                aria-label={t("Dismiss")}
                variant={"ghost"}
                size={"icon"}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`https://github.com/${githubRepo}/releases/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "flex-1 justify-center rounded-full",
                )}
              >
                {t("Update now")}
              </a>
              <Button
                onClick={dismissUpdate}
                variant={"outline"}
                size={"sm"}
                className="rounded-full"
              >
                {t("Dismiss")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionNotifier;
