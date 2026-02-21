"use client";

import dynamic from "next/dynamic";

type AnalyticsPayload = {
  today: {
    rangeLabel: string;
    averageDailyPercent: number;
    participationPercent: number;
    residentsParticipated: number;
    totalAttendedResidents: number;
    oneOnOneNotes: number;
    carePlanReviews: number;
  };
  month: {
    rangeLabel: string;
    averageDailyPercent: number;
    participationPercent: number;
    residentsParticipated: number;
    totalAttendedResidents: number;
    oneOnOneNotes: number;
    carePlanReviews: number;
    volunteerHours: number;
  };
};

const AnalyticsCardClient = dynamic(
  () => import("@/components/dashboard/AnalyticsCardClient").then((mod) => mod.AnalyticsCardClient),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="skeleton shimmer h-10 w-44 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="skeleton shimmer h-28 rounded-2xl" />
          <div className="skeleton shimmer h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="skeleton shimmer h-16 rounded-xl" />
          <div className="skeleton shimmer h-16 rounded-xl" />
          <div className="skeleton shimmer h-16 rounded-xl" />
          <div className="skeleton shimmer h-16 rounded-xl" />
        </div>
      </div>
    )
  }
);

export function AnalyticsCardClientLazy({
  analytics
}: {
  analytics: AnalyticsPayload;
}) {
  return <AnalyticsCardClient analytics={analytics} />;
}

