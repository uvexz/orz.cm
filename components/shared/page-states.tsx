import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

import { EmptyPlaceholder } from "./empty-placeholder";
import { Icons } from "./icons";

interface PageSectionSkeletonProps {
  className: string;
}

export function PageSectionSkeleton({
  className,
}: PageSectionSkeletonProps) {
  return <Skeleton className={cn("w-full rounded-lg", className)} />;
}

interface PageSectionEmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Icons;
  className?: string;
}

export function PageSectionEmptyState({
  title,
  description,
  icon = "settings",
  className,
}: PageSectionEmptyStateProps) {
  return (
    <EmptyPlaceholder className={cn("shadow-none", className)}>
      <EmptyPlaceholder.Icon name={icon} />
      <EmptyPlaceholder.Title>{title}</EmptyPlaceholder.Title>
      <EmptyPlaceholder.Description>{description}</EmptyPlaceholder.Description>
    </EmptyPlaceholder>
  );
}
