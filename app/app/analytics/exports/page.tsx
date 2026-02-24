import Link from "next/link";
import { Download, FileDown, FileSpreadsheet, FileText } from "lucide-react";

import { AnalyticsShell } from "@/components/analytics/AnalyticsShell";
import { ChartCardGlass } from "@/components/analytics/ChartCardGlass";
import { getAnalyticsSnapshot, parseAnalyticsFiltersFromSearch } from "@/lib/analytics/service";
import { requireModulePage } from "@/lib/page-guards";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsExportsPage({
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
      activeSection="exports"
      title="Analytics · Exports"
      subtitle="Quick handoff for PDFs and CSVs without leaving the analytics flow."
      rangeLabel={snapshot.range.label}
      filters={filters}
      options={snapshot.options}
      kpis={snapshot.kpis}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCardGlass
          title="Monthly Report"
          description="Open the full reporting workspace with current month context."
          icon={FileText}
          iconClassName="from-indigo-500/35 to-violet-500/10 text-indigo-700"
        >
          <Link
            href={snapshot.exports.monthlyReportPath}
            className="inline-flex h-10 items-center rounded-lg border border-white/35 bg-white/75 px-4 text-sm font-medium text-foreground transition hover:bg-white/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Open Report Workspace
          </Link>
        </ChartCardGlass>

        <ChartCardGlass
          title="Attendance CSV"
          description="Download monthly attendance summary as CSV."
          icon={FileSpreadsheet}
          iconClassName="from-emerald-500/35 to-teal-500/10 text-emerald-700"
        >
          <a
            href={snapshot.exports.attendanceCsvPath}
            className="inline-flex h-10 items-center rounded-lg border border-white/35 bg-white/75 px-4 text-sm font-medium text-foreground transition hover:bg-white/90"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download CSV
          </a>
        </ChartCardGlass>

        <ChartCardGlass
          title="Export Notes"
          description="Exports honor current analytics filters for scoped drilldowns and summaries."
          icon={Download}
          iconClassName="from-sky-500/35 to-indigo-500/10 text-sky-700"
        >
          <ul className="space-y-2 text-sm text-foreground/80">
            <li>Date range and filter scope persist in export links.</li>
            <li>Use Reports workspace for PDF layouts and chart-rich summaries.</li>
            <li>Use CSV for downstream auditing and spreadsheet workflows.</li>
          </ul>
        </ChartCardGlass>
      </div>
    </AnalyticsShell>
  );
}
