import { Layers3, MapPin } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { getAnalyticsSnapshot, parseAnalyticsFiltersFromSearch } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsProgramsPage({
  searchParams
}: {
  searchParams?: AnalyticsSearchParams;
}) {
  const context = await requireModulePage("analyticsHeatmaps");
  const filters = parseAnalyticsFiltersFromSearch(searchParams);
  const snapshot = await getAnalyticsSnapshot({
    facilityId: context.facilityId,
    timeZone: context.timeZone,
    filters
  });

  return (
    <AnalyticsShell
      activeSection="programs"
      title="Analytics · Programs"
      subtitle="Program performance by title, category, and location."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Top Program Categories"
          description="Supportive attendance grouped by category."
          icon={Layers3}
          iconClassName="from-violet-500/35 to-fuchsia-500/10 text-violet-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.programs.categoryMix.slice(0, 12).map((category) => ({
              label: category.category,
              value: category.count
            }))}
            barColor="#8B5CF6"
          />
        </ChartCardGlass>

        <ChartCardGlass
          title="Top Locations"
          description="Where residents are most engaged."
          icon={MapPin}
          iconClassName="from-sky-500/35 to-cyan-500/10 text-sky-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.programs.locationMix.slice(0, 12).map((location) => ({
              label: location.location,
              value: location.count
            }))}
            barColor="#0EA5E9"
          />
        </ChartCardGlass>
      </div>

      <DrilldownListCard
        title="Top Programs"
        description="Most-attended programs in selected range."
        rows={snapshot.programs.topPrograms.map((program, index) => ({
          id: `${program.title}:${index}`,
          title: program.title,
          subtitle: `${program.category} · ${program.location}`,
          metric: String(program.attendedCount),
          metricLabel: "Supportive attendance",
          details: [
            { label: "Program", value: program.title },
            { label: "Category", value: program.category },
            { label: "Location", value: program.location },
            { label: "Supportive attendance", value: String(program.attendedCount) }
          ]
        }))}
        emptyLabel="No program attendance data found."
      />
    </AnalyticsShell>
  );
}
