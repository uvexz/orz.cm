import * as React from "react";
import Link from "next/link";
import pkg from "package.json";

import { footerLinks, siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/layout/mode-toggle";

// import { NewsletterForm } from "../forms/newsletter-form";
import GitHubStarsWithSuspense from "../shared/github-star-wrapper";
import { Icons } from "../shared/icons";

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn("bg-background", className)}>
      <div className="py-4">
        <div className="container flex max-w-6xl items-center justify-between">
          <div
            className="mx-3 mt-auto flex items-center gap-1 pb-3 pt-6 font-mono text-xs text-muted-foreground/90"
            style={{ fontFamily: "Bahamas Bold" }}
          >
            Copyright {new Date().getFullYear()} &copy;
            <Link
              href={siteConfig.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              {siteConfig.name}
            </Link>
            <Link
              href={`${siteConfig.links.github}/releases/latest`}
              target="_blank"
              rel="noreferrer"
              className="font-thin underline-offset-2 hover:underline"
            >
              v{pkg.version}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={siteConfig.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-1"
            >
              <Icons.github className="size-5" />
            </Link>
            <ModeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
