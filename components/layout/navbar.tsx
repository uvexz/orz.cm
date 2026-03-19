"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { marketingConfig } from "@/config/marketing";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { useScroll } from "@/hooks/use-scroll";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

import { ModeToggle } from "./mode-toggle";

interface NavBarProps {
  scroll?: boolean;
  large?: boolean;
}

export function NavBar({ scroll = false }: NavBarProps) {
  const scrolled = useScroll(50);
  const links = marketingConfig.mainNav;

  const t = useTranslations("System");

  return (
    <header
      className={`sticky top-0 z-40 flex w-full justify-center bg-background/60 backdrop-blur-xl transition-all ${
        scroll ? (scrolled ? "border-b" : "bg-transparent") : "border-b"
      }`}
    >
      <MaxWidthWrapper className="flex h-14 items-center justify-between py-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-1.5">
            <Icons.logo />
            <h1
              style={{ fontFamily: "Bahamas Bold" }}
              className="text-2xl font-bold"
            >
              {siteConfig.name}
            </h1>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {links && links.length > 0 ? (
            <nav className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 p-1 md:flex">
              {links.map((item, index) => (
                <Link
                  key={index}
                  href={item.disabled ? "#" : item.href}
                  prefetch={true}
                  className={cn(
                    "flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-foreground/62 transition-colors hover:bg-muted hover:text-foreground",
                    item.disabled && "cursor-not-allowed opacity-80",
                  )}
                >
                  {t(item.title)}
                </Link>
              ))}
            </nav>
          ) : null}

          <Link href="/dashboard" className="hidden md:block">
            <Button
              variant="outline"
              size="sm"
              rounded="full"
              className="border-border/80 bg-background/80 px-4 shadow-none"
            >
              {t("Dashboard")}
            </Button>
          </Link>
          <div className="hidden md:flex">
            <ModeToggle />
          </div>
          {/* {session ? (
            <div className="hidden md:flex">
              <UserAccountNav />
            </div>
          ) : status === "unauthenticated" ? (
            <Link href="login">
              <Button
                className="hidden gap-2 px-4 md:flex"
                variant="default"
                size="sm"
                rounded="lg"
              >
                <span>Sign in</span>
                <Icons.arrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <Skeleton className="hidden h-9 w-24 rounded-xl lg:flex" />
          )} */}
        </div>
      </MaxWidthWrapper>
    </header>
  );
}
