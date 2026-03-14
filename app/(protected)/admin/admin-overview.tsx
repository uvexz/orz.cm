import {
  DashboardInfoCard,
  UserInfoCard,
} from "@/components/dashboard/dashboard-info-card";
import { InteractiveBarChart } from "@/components/charts/interactive-bar-chart";
import { DashboardHeader } from "@/components/dashboard/header";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import {
  PageSectionEmptyState,
  PageSectionSkeleton,
} from "@/components/shared/page-states";

import LogsTable from "../dashboard/scrape/logs";
import {
  DailyPVUVChart,
  LineChartMultiple,
  RadialShapeChart,
} from "./admin-charts";
import type { AdminDashboardData } from "./admin-page-data";

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

export function AdminOverview({ data }: { data: AdminDashboardData }) {
  return (
    <>
      <DashboardHeader heading="Admin Panel" text="" />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <Section fallbackClassName="h-32">
            <UserInfoCard
              userId={data.viewerId}
              title="Users"
              count={data.userCount}
              link="/admin/users"
            />
          </Section>
          <Section fallbackClassName="h-32">
            <DashboardInfoCard
              userId={data.viewerId}
              title="Short URLs"
              total={data.shortUrlStats.total}
              monthTotal={data.shortUrlStats.monthTotal}
              limit={data.shortUrlStats.limit}
              link="/admin/urls"
              icon="link"
            />
          </Section>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Section fallbackClassName="h-32">
            <DashboardInfoCard
              userId={data.viewerId}
              title="Emails"
              total={data.emailStats.total}
              monthTotal={data.emailStats.monthTotal}
              limit={data.emailStats.limit}
              link="/admin"
              icon="mail"
            />
          </Section>
          <Section fallbackClassName="h-32">
            <DashboardInfoCard
              userId={data.viewerId}
              title="Inbox"
              total={data.inboxStats.total}
              monthTotal={data.inboxStats.monthTotal}
              limit={data.inboxStats.limit}
              link="/admin"
              icon="inbox"
            />
          </Section>
        </div>
        <Section fallbackClassName="h-[380px]">
          <InteractiveBarChart />
        </Section>
        <Section fallbackClassName="min-h-[342px]">
          {data.requestStats.length > 0 ? (
            <DailyPVUVChart data={data.requestStats} />
          ) : (
            <PageSectionEmptyState
              icon="lineChart"
              title="No request stats"
              description="Scraping and open API requests will appear here after traffic arrives."
              className="min-h-[342px] rounded-lg border"
            />
          )}
        </Section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Section fallbackClassName="h-[320px]">
            <RadialShapeChart
              totalUser={data.apiKeyStats.totalUser}
              total={data.apiKeyStats.total}
            />
          </Section>
          <Section fallbackClassName="h-[320px]">
            <LineChartMultiple
              chartData={data.qrScreenshotStats}
              type1="qrcode"
              type2="screenshot"
            />
          </Section>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Section fallbackClassName="h-[320px]">
            <LineChartMultiple
              chartData={data.screenshotMetaStats}
              type1="screenshot"
              type2="meta-info"
            />
          </Section>
          <Section fallbackClassName="h-[320px]">
            <LineChartMultiple
              chartData={data.markdownTextStats}
              type1="markdown"
              type2="text"
            />
          </Section>
        </div>
        <Section fallbackClassName="h-[400px]">
          <LogsTable
            userId={data.viewerId}
            target="/api/v1/scraping/admin/logs"
          />
        </Section>
      </div>
    </>
  );
}
