"use client";

import dynamic from "next/dynamic";

export const LineChartMultiple = dynamic(
  () =>
    import("../../admin/line-chart-multiple").then(
      (mod) => mod.LineChartMultiple,
    ),
  { ssr: false },
);

export const DailyPVUVChart = dynamic(
  () => import("./daily-chart").then((mod) => mod.DailyPVUVChart),
  { ssr: false },
);
