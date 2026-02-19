"use client";

import dynamic from "next/dynamic";

type EngagementTrendPoint = {
  label: string;
  score: number;
};

const EngagementTrendChart = dynamic(
  () => import("@/components/app/engagement-trend-chart").then((module) => module.EngagementTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/50" />
  }
);

export function EngagementTrendChartLazy({
  data
}: {
  data: EngagementTrendPoint[];
}) {
  return <EngagementTrendChart data={data} />;
}

