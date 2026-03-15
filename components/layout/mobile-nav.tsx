"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { marketingConfig } from "@/config/marketing";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

import { ModeToggle } from "./mode-toggle";

export function NavMobile() {
  const t = useTranslations("System");
  const [open, setOpen] = useState(false);
  const links = marketingConfig.mainNav;
  const navId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (!open) {
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    document.body.style.overflow = "hidden";

    const focusFirstItem = window.requestAnimationFrame(() => {
      const focusable = navRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFirstItem);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        triggerRef.current?.focus();
        wasOpenRef.current = false;
      }
      return;
    }

    wasOpenRef.current = true;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!navRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        navRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((previous) => !previous)}
        aria-controls={navId}
        aria-expanded={open}
        aria-label={open ? t("Close navigation menu") : t("Open navigation menu")}
        className={cn(
          "fixed right-2 top-2.5 z-50 rounded-full p-2 transition-colors duration-200 hover:bg-muted focus:outline-none active:bg-muted md:hidden",
          open && "hover:bg-muted active:bg-muted",
        )}
      >
        {open ? (
          <X className="size-5 text-muted-foreground" />
        ) : (
          <Menu className="size-5 text-muted-foreground" />
        )}
      </button>

      {open ? (
        <nav
          id={navId}
          ref={navRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("Mobile navigation")}
          className="fixed inset-0 z-20 w-full overflow-auto bg-background px-5 py-16 lg:hidden"
        >
          <ul className="grid divide-y divide-muted">
            {links &&
              links.length > 0 &&
              links.map(({ title, href }) => (
                <li key={href} className="py-3">
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex w-full font-medium capitalize"
                  >
                    {t(title)}
                  </Link>
                </li>
              ))}

            <AuthAwareNavLinks onNavigate={() => setOpen(false)} />
          </ul>

          <div className="mt-5 flex items-center justify-end space-x-4">
            <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
              <Icons.github className="size-6" />
              <span className="sr-only">GitHub</span>
            </Link>
            <ModeToggle />
          </div>
        </nav>
      ) : null}
    </>
  );
}

function AuthAwareNavLinks({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations("System");
  const session = authClient.useSession();

  if (!session.data) {
    return (
      <li className="py-3">
        <Link
          href="/login"
          onClick={onNavigate}
          className="flex w-full font-medium capitalize"
        >
          {t("Sign in")}
        </Link>
      </li>
    );
  }

  return (
    <>
      {session.data.user.role === "ADMIN" ? (
        <li className="py-3">
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex w-full font-medium capitalize"
          >
            {t("Admin")}
          </Link>
        </li>
      ) : null}

      <li className="py-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex w-full font-medium capitalize"
        >
          {t("Dashboard")}
        </Link>
      </li>
    </>
  );
}
