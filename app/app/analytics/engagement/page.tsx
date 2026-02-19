import { Activity, GaugeCircle, Layers } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { InsightChip } from "@/components/analytics/InsightChip";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { AnalyticsLineChartLazy } from "@/components/analytics/charts/AnalyticsLineChartLazy";
import { getAnalyticsSnapshot, parseAnalyticsFiltersFromSearch } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsEngagementPage({
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
      activeSection="engagement"
      title="Analytics · Engagement"
      subtitle="Engagement scoring, category distribution, and participation behavior over time."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Weekly Engagement Score"
          description="Weighted by PRESENT/ACTIVE/LEADING rules from settings."
          icon={GaugeCircle}
          iconClassName="from-indigo-500/35 to-cyan-500/10 text-indigo-700"
        >
          <AnalyticsLineChartLazy
            data={snapshot.engagement.weeklyScores.map((row) => ({
              label: row.label,
              value: row.score
            }))}
            lineColor="#7C3AED"
          />
        </ChartCardGlass>

        <ChartCardGlass
          title="Category Mix"
          description="Supportive attendance grouped by activity template category."
          icon={Layers}
          iconClassName="from-sky-500/35 to-violet-500/10 text-sky-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.engagement.categoryMix.slice(0, 12).map((entry) => ({
              label: entry.category,
              value: entry.count
            }))}
            barColor="#0EA5E9"
          />
        </ChartCardGlass>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCardGlass
          title="Insight Highlights"
          description="Fast readout designed for quick standups."
          icon={Activity}
          iconClassName="from-emerald-500/35 to-teal-500/10 text-emerald-700"
        >
          <div className="flex flex-wrap gap-2">
            {snapshot.engagement.insightChips.map((chip) => (
              <InsightChip key={chip.label} tone={chip.tone} label={chip.label} />
            ))}
          </div>
        </ChartCardGlass>

        <DrilldownListCard
          title="Barrier Changes"
          description="Compare current range versus the prior period."
          rows={snapshot.engagement.topBarriers.map((barrier) => ({
            id: barrier.barrier,
            title: barrier.barrier.replaceAll("_", " "),
            subtitle: `${barrier.previousCount} in prior period`,
            metric: String(barrier.count),
            metricLabel: barrier.delta === 0 ? "No change" : barrier.delta > 0 ? `+${barrier.delta}` : `${barrier.delta}`,
            details: [
              { label: "Barrier", value: barrier.barrier.replaceAll("_", " ") },
              { label: "Current count", value: String(barrier.count) },
              { label: "Previous count", value: String(barrier.previousCount) },
              { label: "Delta", value: barrier.delta > 0 ? `+${barrier.delta}` : `${barrier.delta}` },
              { label: "Engagement average", value: snapshot.engagement.averageEngagementScore.toFixed(2) }
            ]
          }))}
          emptyLabel="No barriers to compare in this range."
        />
      </div>
    </AnalyticsShell>
  );
}
