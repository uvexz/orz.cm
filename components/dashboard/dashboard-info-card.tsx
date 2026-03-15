import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { nFormatter } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CountUp from "@/components/dashboard/count-up";
import { Icons } from "@/components/shared/icons";

export async function UserInfoCard({
  userId,
  title,
  total,
  count,
  link,
  icon = "users",
}: {
  userId: string;
  title: string;
  total?: number;
  count: number;
  link: string;
  icon?: keyof typeof Icons;
}) {
  const Icon = Icons[icon || "arrowRight"];
  const t = await getTranslations("Components");
  return (
    <Card className="group border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Link
            className="font-semibold text-foreground/80 transition-colors duration-200 group-hover:text-foreground"
            href={link}
          >
            {t(title)}
          </Link>
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {[-1, undefined].includes(count) ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <div className="flex items-end gap-2 text-2xl font-bold">
            <CountUp count={count} />
            {total !== undefined && (
              <span className="align-top text-base text-muted-foreground">
                / {total}
              </span>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("total")}</p>
      </CardContent>
    </Card>
  );
}

export async function DashboardInfoCard({
  userId,
  title,
  total,
  monthTotal,
  limit,
  link,
  icon = "users",
}: {
  userId: string;
  title: string;
  total?: number;
  monthTotal: number;
  limit: number;
  link: string;
  icon?: keyof typeof Icons;
}) {
  // const t = useTranslations("Components");
  const t = await getTranslations("Components");
  const Icon = Icons[icon || "arrowRight"];
  return (
    <Card className="group animate-fade-in border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Link
            className="font-semibold text-foreground/80 transition-colors duration-200 group-hover:text-foreground"
            href={link}
          >
            {t(title)}
          </Link>
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {[-1, undefined].includes(total) ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <div className="flex items-end gap-2 text-2xl font-bold">
            <CountUp count={monthTotal} />
            {total !== undefined && (
              <p className="align-top text-base text-muted-foreground">
                / {nFormatter(limit)}{" "}
                <span className="text-xs">({t("monthly")})</span>
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t("total")}: {total}
        </p>
      </CardContent>
    </Card>
  );
}

export async function HeroCard({
  total,
  monthTotal,
  limit,
}: {
  total: number;
  monthTotal: number;
  limit: number;
}) {
  // const t = useTranslations("Components");
  const t = await getTranslations("Components");
  return (
    <div className="group relative mb-4 h-full w-full shrink-0 origin-left overflow-hidden rounded-lg border border-border bg-card px-5 py-5 text-left">
      <div className="flex flex-row items-center justify-between">
        <Link
          href="/emails"
          className="text-lg font-bold text-foreground transition-colors duration-200 group-hover:text-foreground/80"
        >
          {t("Email box")}
        </Link>
        <Icons.mail className="size-4 text-muted-foreground" />
      </div>

      <div className="mt-1">
        {[-1, undefined].includes(total) ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <div className="flex items-end gap-2 text-2xl font-bold">
            <CountUp count={monthTotal} />
            {total !== undefined && (
              <p className="align-top text-base text-muted-foreground">
                / {nFormatter(limit)}{" "}
                <span className="text-xs">({t("monthly")})</span>
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t("total")}: {total}
        </p>
      </div>
    </div>
  );
}

export async function StaticInfoCard({
  title,
  desc,
  link,
  icon = "users",
}: {
  title: string;
  desc?: string;
  link: string;
  icon?: keyof typeof Icons;
}) {
  const Icon = Icons[icon || "arrowRight"];
  const t = await getTranslations("Components");
  return (
    <Card className="group border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Link
            className="font-semibold text-foreground/80 transition-colors duration-200 group-hover:text-foreground"
            href={link}
          >
            {t(title)}
          </Link>
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {desc && <p className="text-xs text-muted-foreground">{t(desc)}</p>}
      </CardContent>
    </Card>
  );
}
