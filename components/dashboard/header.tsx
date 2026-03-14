import { useTranslations } from "next-intl";

interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  const t = useTranslations("Components");
  return (
    <div className="flex items-center justify-between">
      <div className="grid gap-1">
        <h1 className="font-heading text-2xl font-semibold">{t(heading)}</h1>

        <p className="text-sm text-muted-foreground">
          {text && <span>{t(text)}.</span>}
        </p>
      </div>
      {children}
    </div>
  );
}
