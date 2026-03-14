"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useSWR from "swr";

import { fetcher } from "@/lib/utils";

import { Icons } from "../shared/icons";
import { Button } from "../ui/button";

interface NotificationConfigResponse {
  system_notification: string | boolean | null;
}

export function Notification() {
  const [isVisible, setIsVisible] = useState(true);

  const { data, isLoading, error } = useSWR<NotificationConfigResponse>(
    "/api/configs?key=system_notification",
    fetcher,
    { dedupingInterval: 30000 },
  );

  const handleClose = () => {
    setIsVisible(false);
  };

  const notification =
    typeof data?.system_notification === "string" ? data.system_notification : "";

  if (error || isLoading || !notification) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          className="relative flex max-h-48 w-full items-center justify-center bg-muted text-sm text-primary"
        >
          <div
            className="flex-1 px-8 py-2.5 text-center"
            dangerouslySetInnerHTML={{ __html: notification }}
          />

          <Button
            onClick={handleClose}
            variant={"ghost"}
            size={"icon"}
            className="absolute right-1.5 top-[18px] flex size-6 -translate-y-1/2 items-center justify-center"
          >
            <Icons.close className="size-4 text-primary" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
