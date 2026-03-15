"use client";

import { useState, useTransition } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Icons } from "../shared/icons";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { Input } from "../ui/input";
import dynamic from "next/dynamic";
const EmailEditor = dynamic(() => import("./EmailEditor").then((mod) => mod.EmailEditor), { ssr: false });

interface SendEmailModalProps {
  className?: string;
  emailAddress: string | null;
  triggerButton?: React.ReactNode; // 自定义触发按钮
  triggerLabel?: string;
  onSuccess?: () => void; // 发送成功后的回调
}

export function SendEmailModal({
  className,
  emailAddress,
  triggerButton,
  triggerLabel,
  onSuccess,
}: SendEmailModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    to: "",
    subject: "",
    html: "",
    text: "",
  });
  const [isPending, startTransition] = useTransition();

  const t = useTranslations("Email");

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const openModal = (
    event?: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => {
    event?.stopPropagation();
    setIsOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error(t("No email address selected"));
      return;
    }

    const trimmedTo = sendForm.to.trim();
    const trimmedSubject = sendForm.subject.trim();
    const trimmedText = sendForm.text.trim();

    if (!trimmedTo || !trimmedSubject || !sendForm.html.trim()) {
      toast.error(t("Please fill in all required fields"));
      return;
    }

    if (trimmedText.length < 10) {
      toast.error(t("Email content must be at least 10 characters"));
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailAddress,
            to: trimmedTo,
            subject: trimmedSubject,
            html: sendForm.html,
            text: trimmedText,
          }),
        });

        if (response.ok) {
          toast.success(t("Email sent successfully"));
          setIsOpen(false);
          setSendForm({ to: "", subject: "", html: "", text: "" });
          onSuccess?.();
        } else {
          toast.error(t("Failed to send email"), {
            description: await response.text(),
          });
        }
      } catch (error: unknown) {
        toast.error(t("Error sending email"), {
          description: getErrorMessage(error, t("Please try again")),
        });
      }
    });
  };

  return (
    <>
      {triggerButton ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={triggerLabel}
          onClick={openModal}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              openModal(event);
            }
          }}
        >
          {triggerButton}
        </div>
      ) : (
        <Button
          className={className}
          variant="ghost"
          size="sm"
          aria-label={triggerLabel ?? t("Send Email")}
          onClick={() => setIsOpen(true)}
        >
          <Icons.send size={17} />
        </Button>
      )}

      <Drawer
        handleOnly
        open={isOpen}
        direction="right"
        onOpenChange={setIsOpen}
      >
        <DrawerContent className="fixed bottom-0 right-0 top-0 h-[calc(100vh)] w-full rounded-none sm:max-w-5xl">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-1">
              {t("Send Email")}{" "}
              <Button
                className="ml-auto"
                onClick={handleSendEmail}
                disabled={isPending}
                variant="ghost"
              >
                {isPending ? (
                  <Icons.spinner className="size-4 animate-spin" />
                ) : (
                  <Icons.send className="size-4 text-blue-600" />
                )}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">
                  <Icons.close className="size-5" />
                </Button>
              </DrawerClose>
            </DrawerTitle>
          </DrawerHeader>
          <div className="scrollbar-hidden space-y-1 overflow-y-auto px-4 pb-4">
            <div className="flex items-center justify-between border-b">
              <label className="text-nowrap text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("Subject")}
              </label>
              <Input
                value={sendForm.subject}
                onChange={(e) =>
                  setSendForm({ ...sendForm, subject: e.target.value })
                }
                placeholder={t("Your subject")}
                className="border-none"
              />
            </div>
            <div className="flex items-center justify-between border-b">
              <label className="text-nowrap text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("From")}
              </label>
              <Input
                value={emailAddress || ""}
                disabled
                className="border-none"
              />
            </div>
            <div className="flex items-center justify-between border-b">
              <label className="text-nowrap text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("To")}
              </label>
              <Input
                value={sendForm.to}
                onChange={(e) =>
                  setSendForm({ ...sendForm, to: e.target.value })
                }
                placeholder="recipient@example.com"
                className="border-none"
              />
            </div>
            <div>
              <EmailEditor
                onGetEditorValue={(e, t) =>
                  setSendForm({ ...sendForm, html: e, text: t })
                }
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
