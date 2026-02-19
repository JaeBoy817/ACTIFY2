"use client";

import dynamic from "next/dynamic";

const LineChartClient = dynamic(
  () => import("@/components/analytics/charts/AnalyticsLineChart").then((module) => module.AnalyticsLineChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-white/55" />
  }
);

export function AnalyticsLineChartLazy({
  data,
  lineColor
}: {
  data: Array<{ label: string; value: number }>;
  lineColor?: string;
}) {
  return <LineChartClient data={data} lineColor={lineColor} />;
}
