"use client";

import { useState } from "react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Icons } from "../shared/icons";

export default function EmailManagerInnovate() {
  const [viewMode, setViewMode] = useState("inbox");
  const exampleMailbox = siteConfig.mailSupport.replace(/^[^@]+@/, "app@");

  return (
    <section className="mx-auto my-6 w-full max-w-xl space-y-4">
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
          Try it out
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {exampleMailbox.split("@")[1]}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
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
            className="size-4"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          Email Manager
        </div>
        <div className="grid w-full grid-cols-2 gap-1 rounded-full border border-border bg-muted/40 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode("inbox")}
            className={cn(
              "min-h-11 rounded-full px-3 py-1 text-sm font-medium transition-colors",
              viewMode === "inbox"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            Inbox
          </button>
          <button
            type="button"
            onClick={() => setViewMode("sent")}
            className={cn(
              "min-h-11 rounded-full px-3 py-1 text-sm font-medium transition-colors",
              viewMode === "sent"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            Sent
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <div className="flex items-center">
          <Input
            type="text"
            placeholder={`Search ${viewMode === "inbox" ? "received" : "sent"} emails...`}
            readOnly
            aria-label={`Search ${viewMode === "inbox" ? "received" : "sent"} emails`}
            className="h-12 rounded-xl border-border bg-background pr-14 text-sm text-foreground shadow-none"
          />
          <Link
            href="/emails"
            className={cn(
              buttonVariants({ size: "icon", rounded: "full" }),
              "absolute right-1.5 top-1/2 size-11 -translate-y-1/2",
            )}
            aria-label="Open email inbox"
          >
            <Icons.search className="size-4" />
          </Link>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <Icons.mail className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-all text-base font-semibold text-foreground sm:break-normal">
                    {viewMode === "inbox" ? "example@gmail.com" : exampleMailbox}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label="Copy email address"
                      type="button"
                    >
                      <Icons.copy className="size-4" />
                    </button>
                    <button
                      className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label="Open email QR code"
                      type="button"
                    >
                      <Icons.qrcode className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                  <Icons.forwardArrow className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {viewMode === "inbox" ? exampleMailbox : "example@gmail.com"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                <Icons.mail className="size-4" />
                <p>{viewMode === "inbox" ? "5.2K" : "3.8K"} emails</p>
              </div>
              <button
                className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="More email actions"
                type="button"
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
                    d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 19C11 19.5523 11.4477 20 12 20Z"
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
