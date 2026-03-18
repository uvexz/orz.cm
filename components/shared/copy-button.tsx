"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Icons } from "./icons";

interface CopyButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function CopyButton({
  value,
  className,
  onClick,
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false);
  const accessibleLabel = props["aria-label"] ?? "Copy";

  React.useEffect(() => {
    if (!hasCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [hasCopied]);

  const handleCopyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setHasCopied(true);
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={accessibleLabel}
      className={cn(
        "size-10 shrink-0 text-muted-foreground hover:text-foreground",
        hasCopied && "text-foreground",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          handleCopyValue(value);
        }
      }}
      {...props}
    >
      <span className="sr-only">{accessibleLabel}</span>
      {hasCopied ? (
        <Icons.check className="size-4" />
      ) : (
        <Icons.copy className="size-4" />
      )}
    </Button>
  );
}
