import { BarChart3, ClipboardCheck } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { AnalyticsLineChartLazy } from "@/components/analytics/charts/AnalyticsLineChartLazy";
import { parseAnalyticsFiltersFromSearch, getAnalyticsSnapshot } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsAttendancePage({
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
      activeSection="attendance"
      title="Analytics · Attendance"
      subtitle="Participation, attendance status mix, and barrier patterns for the selected filters."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Attendance Status Mix"
          description="Present, Active, Leading, Refused, and No Show counts."
          icon={ClipboardCheck}
          iconClassName="from-emerald-500/35 to-cyan-500/10 text-emerald-700"
        >
          <AnalyticsBarChartLazy
            data={[
              { label: "Present", value: snapshot.attendance.counts.present },
              { label: "Active", value: snapshot.attendance.counts.active },
              { label: "Leading", value: snapshot.attendance.counts.leading },
              { label: "Refused", value: snapshot.attendance.counts.refused },
              { label: "No Show", value: snapshot.attendance.counts.noShow }
            ]}
            barColor="#10B981"
          />
        </ChartCardGlass>

        <ChartCardGlass
          title="Daily Participation %"
          description="Unique residents marked supportive each day."
          icon={BarChart3}
          iconClassName="from-indigo-500/35 to-sky-500/10 text-indigo-700"
        >
          <AnalyticsLineChartLazy
            data={snapshot.attendance.dailyParticipation.map((row) => ({
              label: row.label,
              value: row.participationPercent
            }))}
            lineColor="#5C7CFA"
          />
        </ChartCardGlass>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DrilldownListCard
          title="Top Attendees"
          description="Sorted by supportive attendance count."
          rows={snapshot.attendance.topAttendees.slice(0, 400).map((resident) => ({
            id: resident.residentId,
            title: resident.residentName,
            subtitle: `Room ${resident.room}`,
            metric: String(resident.attendedCount),
            metricLabel: "Supportive",
            details: [
              { label: "Resident", value: resident.residentName },
              { label: "Room", value: resident.room },
              { label: "Supportive attendance", value: String(resident.supportiveCount) }
            ]
          }))}
          emptyLabel="No attendance records found."
        />

        <DrilldownListCard
          title="Barrier Distribution"
          description="Barrier count and period-over-period deltas."
          rows={snapshot.attendance.topBarriers.map((barrier) => ({
            id: barrier.barrier,
            title: barrier.barrier.replaceAll("_", " "),
            subtitle: `${barrier.previousCount} in previous period`,
            metric: String(barrier.count),
            metricLabel: barrier.delta === 0 ? "No change" : barrier.delta > 0 ? `+${barrier.delta}` : `${barrier.delta}`,
            details: [
              { label: "Barrier", value: barrier.barrier.replaceAll("_", " ") },
              { label: "Current period", value: String(barrier.count) },
              { label: "Previous period", value: String(barrier.previousCount) },
              { label: "Delta", value: barrier.delta > 0 ? `+${barrier.delta}` : String(barrier.delta) }
            ]
          }))}
          emptyLabel="No barriers documented in this range."
        />
      </div>
    </AnalyticsShell>
  );
}
