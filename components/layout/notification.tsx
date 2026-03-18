"use client";

import { useEffect, useState } from "react";

import { Icons } from "../shared/icons";
import { Button } from "../ui/button";

interface NotificationConfigResponse {
  system_notification: string | boolean | null;
}

export function Notification() {
  const [notification, setNotification] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadNotification = async () => {
      try {
        const response = await fetch("/api/configs?key=system_notification", {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as NotificationConfigResponse;
        const nextNotification =
          typeof data.system_notification === "string"
            ? data.system_notification
            : "";

        setNotification(nextNotification);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("[Notification] Failed to load system notification", error);
        }
      }
    };

    const idleCallback =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => {
            void loadNotification();
          }, { timeout: 1500 })
        : null;
    const timeoutId =
      idleCallback === null
        ? window.setTimeout(() => {
            void loadNotification();
          }, 250)
        : null;

    return () => {
      controller.abort();

      if (idleCallback !== null) {
        window.cancelIdleCallback(idleCallback);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!notification || !isVisible) return null;

  return (
    <div className="relative flex max-h-48 w-full items-center justify-center border-b bg-muted/40 text-sm text-foreground">
      <div
        className="flex-1 px-8 py-2.5 text-center"
        dangerouslySetInnerHTML={{ __html: notification }}
      />

      <Button
        onClick={handleClose}
        variant={"ghost"}
        size={"icon"}
        aria-label="Dismiss notification"
        title="Dismiss notification"
        className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <Icons.close className="size-4" />
      </Button>
    </div>
  );
}
