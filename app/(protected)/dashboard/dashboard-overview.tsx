import {
  DashboardInfoCard,
  HeroCard,
} from "@/components/dashboard/dashboard-info-card";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { PageSectionSkeleton } from "@/components/shared/page-states";

import UserUrlsList from "./urls/url-list";
import type { DashboardOverviewData } from "./dashboard-page-data";

function Section({
  children,
  fallbackClassName,
}: {
  children: React.ReactNode;
  fallbackClassName: string;
}) {
  return (
    <ErrorBoundary
      fallback={<PageSectionSkeleton className={fallbackClassName} />}
    >
      {children}
    </ErrorBoundary>
  );
}

export function DashboardOverview({
  data,
}: {
  data: DashboardOverviewData;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <Section fallbackClassName="h-32">
          <HeroCard
            total={data.emailStats.total}
            monthTotal={data.emailStats.monthTotal}
            limit={data.plan.emEmailAddresses}
          />
        </Section>
        <Section fallbackClassName="h-32">
          <DashboardInfoCard
            userId={data.user.id}
            title="Short URLs"
            total={data.shortUrlStats.total}
            monthTotal={data.shortUrlStats.monthTotal}
            limit={data.plan.slNewLinks}
            link="/dashboard/urls"
            icon="link"
          />
        </Section>
      </div>
      <Section fallbackClassName="h-[400px]">
        <UserUrlsList user={data.user} action="/api/url" />
      </Section>
    </div>
  );
}
