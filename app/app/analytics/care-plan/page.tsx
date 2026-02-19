import { ClipboardList, FileCheck2 } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { getAnalyticsSnapshot, parseAnalyticsFiltersFromSearch } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsCarePlanPage({
  searchParams
}: {
  searchParams?: AnalyticsSearchParams;
}) {
  const context = await requireModulePage("analyticsHeatmaps");
  const filters = parseAnalyticsFiltersFromSearch(searchParams);
  const snapshot = await getAnalyticsSnapshot({
    facilityId: context.facilityId,
    timeZone: context.facility.timezone,
    filters
  });

  return (
    <AnalyticsShell
      activeSection="care-plan"
      title="Analytics · Care Plan"
      subtitle="Plan coverage, review cadence, and outcome signals in one place."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Care Plan Coverage"
          description="Residents by care-plan status."
          icon={ClipboardList}
          iconClassName="from-indigo-500/35 to-sky-500/10 text-indigo-700"
        >
          <AnalyticsBarChartLazy
            data={[
              { label: "No Plan", value: snapshot.carePlan.counts.noPlan },
              { label: "Active", value: snapshot.carePlan.counts.active },
              { label: "Due Soon", value: snapshot.carePlan.counts.dueSoon },
              { label: "Overdue", value: snapshot.carePlan.counts.overdue },
              { label: "Archived", value: snapshot.carePlan.counts.archived }
            ]}
            barColor="#4F46E5"
          />
        </ChartCardGlass>

        <ChartCardGlass
          title="Review Outcomes"
          description="Care plan review results in selected date range."
          icon={FileCheck2}
          iconClassName="from-emerald-500/35 to-teal-500/10 text-emerald-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.carePlan.reviewResults.map((row) => ({
              label: row.result,
              value: row.count
            }))}
            barColor="#10B981"
          />
        </ChartCardGlass>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DrilldownListCard
          title="Upcoming Reviews"
          description="Residents whose active plans are due soon or overdue."
          rows={snapshot.carePlan.upcomingReviews.map((review) => ({
            id: review.carePlanId,
            title: review.residentName,
            subtitle: `Room ${review.room}`,
            metric: review.status === "OVERDUE" ? "Overdue" : "Due Soon",
            metricLabel: new Date(review.nextReviewDate).toLocaleDateString(),
            details: [
              { label: "Resident", value: `${review.residentName} (${review.room})` },
              { label: "Status", value: review.status === "OVERDUE" ? "Overdue" : "Due soon" },
              { label: "Next review", value: new Date(review.nextReviewDate).toLocaleString() },
              { label: "Care plan ID", value: review.carePlanId }
            ]
          }))}
          emptyLabel="No due-soon or overdue reviews in this range."
        />

        <DrilldownListCard
          title="Focus Area Mix"
          description="Most common focus areas from active care plans."
          rows={snapshot.carePlan.focusAreas.map((focus) => ({
            id: focus.label,
            title: focus.label,
            metric: String(focus.count),
            metricLabel: "Plans",
            details: [
              { label: "Focus area", value: focus.label },
              { label: "Active plans", value: String(focus.count) }
            ]
          }))}
          emptyLabel="No focus areas found."
        />
      </div>
    </AnalyticsShell>
  );
}
