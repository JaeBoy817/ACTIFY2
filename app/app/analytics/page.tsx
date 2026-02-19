import { AlertTriangle, BarChart3, Users } from "lucide-react";

import { AnalyticsHubTiles } from "@/components/analytics/AnalyticsHubTiles";
import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { InsightChip } from "@/components/analytics/InsightChip";
import { AnalyticsLineChartLazy } from "@/components/analytics/charts/AnalyticsLineChartLazy";
import { parseAnalyticsFiltersFromSearch, getAnalyticsSnapshot } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsHubPage({
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

  const dailySeries = snapshot.attendance.dailyParticipation.map((row) => ({
    label: row.label,
    value: row.participationPercent
  }));

  return (
    <AnalyticsShell
      activeSection="hub"
      title="Analytics"
      subtitle="One clear analytics hub with fast drilldowns by attendance, engagement, 1:1, care plans, and programs."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
      showDailyMotivation
    >
      <AnalyticsHubTiles />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCardGlass
          title="Participation Trend"
          description="Daily unique participation percentage in selected range."
          icon={BarChart3}
          iconClassName="from-indigo-500/35 to-sky-500/10 text-indigo-700"
        >
          <AnalyticsLineChartLazy data={dailySeries} lineColor="#5C7CFA" />
        </ChartCardGlass>

        <ChartCardGlass
          title="Barrier Highlights"
          description="Highest documented barriers compared to previous period."
          icon={AlertTriangle}
          iconClassName="from-rose-500/35 to-orange-500/10 text-rose-700"
        >
          <div className="flex flex-wrap gap-2">
            {snapshot.engagement.topBarriers.slice(0, 6).map((barrier) => (
              <InsightChip
                key={barrier.barrier}
                tone={barrier.delta > 0 ? "rose" : barrier.delta < 0 ? "emerald" : "amber"}
                label={`${barrier.barrier.replaceAll("_", " ")} · ${barrier.count}`}
              />
            ))}
            {snapshot.engagement.topBarriers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No barrier activity found in this range.</p>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            {snapshot.engagement.insightChips.map((chip) => (
              <InsightChip key={chip.label} tone={chip.tone} label={chip.label} />
            ))}
          </div>
        </ChartCardGlass>
      </div>

      <DrilldownListCard
        title="Top Attendees"
        description="Residents with the highest supportive attendance counts."
        rows={snapshot.attendance.topAttendees.slice(0, 200).map((resident) => ({
          id: resident.residentId,
          title: resident.residentName,
          subtitle: `Room ${resident.room}`,
          metric: String(resident.attendedCount),
          metricLabel: "Attended",
          details: [
            { label: "Resident", value: resident.residentName },
            { label: "Room", value: resident.room },
            { label: "Supportive attendance", value: String(resident.supportiveCount) },
            { label: "Total attended entries", value: String(resident.attendedCount) }
          ]
        }))}
        emptyLabel="No attendance rows found for this range."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Coverage Snapshot"
          description="Current placement of analytics data across focused subsections."
          icon={Users}
          iconClassName="from-emerald-500/35 to-sky-500/10 text-emerald-700"
        >
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>Attendance: status counts, top attendees, barriers, daily participation, engagement trend.</li>
            <li>Engagement: scoring averages, barrier deltas, category mix, weekly scoring.</li>
            <li>1:1: note volume, follow-up rate, response/mood mix, resident breakdown.</li>
            <li>Care Plan: no-plan coverage, due-soon/overdue, review result trends, focus-area mix.</li>
            <li>Programs: top program attendance, category and location performance.</li>
            <li>Staff + Volunteers: note contribution and visit-hours distribution.</li>
          </ul>
        </ChartCardGlass>
      </div>
    </AnalyticsShell>
  );
}
