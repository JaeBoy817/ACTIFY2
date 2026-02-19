"use client";

import dynamic from "next/dynamic";

type TopAttendeesPoint = {
  label: string;
  count: number;
};

const TopAttendeesBarChart = dynamic(
  () => import("@/components/app/top-attendees-bar-chart").then((module) => module.TopAttendeesBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted/50" />
  }
);

export function TopAttendeesBarChartLazy({
  data
}: {
  data: TopAttendeesPoint[];
}) {
  return <TopAttendeesBarChart data={data} />;
}

