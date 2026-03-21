"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export default function BlurImage(props: ComponentProps<typeof Image>) {
  const [isLoading, setLoading] = useState(true);

  return (
    <Image
      {...props}
      alt={props.alt}
      className={cn(
        props.className,
        "duration-300 ease-out",
        isLoading ? "blur-sm scale-105" : "blur-0 scale-100",
      )}
      onLoad={() => setLoading(false)}
    />
  );
}

export function BlurImg(props) {
  const [isLoading, setLoading] = useState(true);

  return (
    <img
      {...props}
      alt={props.alt}
      className={cn(
        props.className,
        "duration-300 ease-out",
        isLoading ? "blur-md scale-105" : "blur-0 scale-100",
      )}
      onLoad={() => setLoading(false)}
    />
  );
}
