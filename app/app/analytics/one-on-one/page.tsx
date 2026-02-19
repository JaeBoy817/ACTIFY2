import { MessageCircleHeart, Smile } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { DrilldownListCard } from "@/components/analytics/DrilldownListCard";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { getAnalyticsSnapshot, parseAnalyticsFiltersFromSearch } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsOneOnOnePage({
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

  const delta = snapshot.oneOnOne.totalNotes - snapshot.oneOnOne.previousTotalNotes;

  return (
    <AnalyticsShell
      activeSection="one-on-one"
      title="Analytics · 1:1 Notes"
      subtitle={`Focused documentation trends. ${delta >= 0 ? "+" : ""}${delta} notes vs prior period.`}
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCardGlass
          title="Mood Breakdown"
          description="Mood/affect coded from 1:1 notes."
          icon={Smile}
          iconClassName="from-amber-500/35 to-rose-500/10 text-amber-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.oneOnOne.moodBreakdown.map((row) => ({
              label: row.label,
              value: row.count
            }))}
            barColor="#F59E0B"
          />
        </ChartCardGlass>

        <ChartCardGlass
          title="Response Mix"
          description="Resident response type trend for 1:1 interactions."
          icon={MessageCircleHeart}
          iconClassName="from-rose-500/35 to-fuchsia-500/10 text-rose-700"
        >
          <AnalyticsBarChartLazy
            data={snapshot.oneOnOne.responseBreakdown.map((row) => ({
              label: row.label,
              value: row.count
            }))}
            barColor="#EC4899"
          />
        </ChartCardGlass>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DrilldownListCard
          title="Residents with Most 1:1 Notes"
          description="Sorted by note count in selected range."
          rows={snapshot.oneOnOne.topResidents.map((row) => ({
            id: row.residentId,
            title: row.residentName,
            subtitle: `Room ${row.room}`,
            metric: String(row.notesCount),
            metricLabel: "Notes",
            details: [
              { label: "Resident", value: row.residentName },
              { label: "Room", value: row.room },
              { label: "1:1 notes", value: String(row.notesCount) },
              { label: "Last 1:1", value: new Date(row.lastNoteAt).toLocaleString() }
            ]
          }))}
          emptyLabel="No 1:1 notes found in this range."
        />

        <DrilldownListCard
          title="Recent 1:1 Notes"
          description="Latest resident-specific notes with quick preview."
          rows={snapshot.oneOnOne.recentNotes.map((note) => ({
            id: note.id,
            title: note.residentName,
            subtitle: `${note.room} · ${new Date(note.createdAt).toLocaleString()}`,
            metric: note.response,
            metricLabel: note.mood,
            details: [
              { label: "Resident", value: `${note.residentName} (${note.room})` },
              { label: "Created", value: new Date(note.createdAt).toLocaleString() },
              { label: "Response", value: note.response },
              { label: "Mood", value: note.mood },
              { label: "Narrative", value: note.narrativePreview || "No narrative preview." }
            ]
          }))}
          emptyLabel="No recent notes."
        />
      </div>
    </AnalyticsShell>
  );
}
