"use client";

import dynamic from "next/dynamic";

export const DailyPVUVChart = dynamic(
  () =>
    import("../dashboard/scrape/daily-chart").then(
      (mod) => mod.DailyPVUVChart,
    ),
  { ssr: false },
);

export const RadialShapeChart = dynamic(
  () => import("./api-key-active-chart").then((mod) => mod.RadialShapeChart),
  { ssr: false },
);

export const LineChartMultiple = dynamic(
  () => import("./line-chart-multiple").then((mod) => mod.LineChartMultiple),
  { ssr: false },
);
