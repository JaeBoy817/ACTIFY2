"use client";

import dynamic from "next/dynamic";

const BarChartClient = dynamic(
  () => import("@/components/analytics/charts/AnalyticsBarChart").then((module) => module.AnalyticsBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-xl bg-white/55" />
  }
);

export function AnalyticsBarChartLazy({
  data,
  barColor,
  horizontal
}: {
  data: Array<{ label: string; value: number }>;
  barColor?: string;
  horizontal?: boolean;
}) {
  return <BarChartClient data={data} barColor={barColor} horizontal={horizontal} />;
}
