import { HandHeart, NotebookPen } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { getAnalyticsSnapshot, parseAnalyticsFiltersFromSearch } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsStaffVolunteersPage({
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
      activeSection="staff-volunteers"
      title="Analytics · Staff + Volunteers"
      subtitle="Documentation and support coverage by team members and volunteers."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Staff Note Contributions"
          description="Total progress notes authored in selected range."
          icon={NotebookPen}
          iconClassName="from-indigo-500/35 to-violet-500/10 text-indigo-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.staffVolunteers.staffActivity.slice(0, 12).map((row) => ({
              label: row.label,
              value: row.notesCount
            }))}
            barColor="#6366F1"
          />
        </ChartCardGlass>

        <ChartCardGlass
          title="Volunteer Visit Volume"
          description={`${snapshot.staffVolunteers.volunteerTotals.visits} visits · ${snapshot.staffVolunteers.volunteerTotals.hours.toFixed(1)} hours`}
          icon={HandHeart}
          iconClassName="from-emerald-500/35 to-teal-500/10 text-emerald-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.staffVolunteers.volunteerActivity.slice(0, 12).map((row) => ({
              label: row.label,
              value: row.visits
            }))}
            barColor="#10B981"
          />
        </ChartCardGlass>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DrilldownListCard
          title="Staff Detail"
          description="Open each row for notes contribution details."
          rows={snapshot.staffVolunteers.staffActivity.map((row) => ({
            id: row.id,
            title: row.label,
            metric: String(row.notesCount),
            metricLabel: "Notes",
            details: [
              { label: "Team member", value: row.label },
              { label: "Notes authored", value: String(row.notesCount) }
            ]
          }))}
          emptyLabel="No staff note activity found."
        />

        <DrilldownListCard
          title="Volunteer Detail"
          description="Visit and hour totals by volunteer."
          rows={snapshot.staffVolunteers.volunteerActivity.map((row) => ({
            id: row.id,
            title: row.label,
            metric: String(row.visits),
            metricLabel: `${row.hours.toFixed(1)} hrs`,
            details: [
              { label: "Volunteer", value: row.label },
              { label: "Visits", value: String(row.visits) },
              { label: "Hours", value: row.hours.toFixed(1) }
            ]
          }))}
          emptyLabel="No volunteer activity found."
        />
      </div>
    </AnalyticsShell>
  );
}
