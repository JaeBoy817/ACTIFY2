import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  Download,
  FileText,
  Filter,
  HandHeart,
  Layers3,
  NotebookPen,
  Search,
  UserCheck2,
  UserX,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { AnalyticsBarChartLazy } from "@/components/analytics/charts/AnalyticsBarChartLazy";
import { AnalyticsLineChartLazy } from "@/components/analytics/charts/AnalyticsLineChartLazy";
import {
  analyticsDashboardFiltersToQueryString,
  getAnalyticsDashboardSnapshot,
  parseAnalyticsDashboardFilters,
  type AnalyticsDashboardDocTypeFilter,
  type AnalyticsDashboardFilters,
  type AnalyticsDashboardParticipationScope,
  type AnalyticsDashboardPreset,
  type AnalyticsDashboardResidentStatusFilter,
  type AnalyticsDashboardSnapshot
} from "@/lib/analytics/dashboard-command-center";
import { requireModulePage } from "@/lib/page-guards";
import { formatInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;
type ResidentSort = "follow-up" | "low-to-high" | "high-to-low" | "name";

const PANEL =
  "rounded-[1.35rem] border border-[#2f4672]/90 bg-[linear-gradient(180deg,#0b1629_0%,#0a1325_52%,#080f1d_100%)] shadow-[0_28px_48px_-36px_rgba(37,99,235,0.72)]";
const PANEL_SOFT =
  "rounded-2xl border border-[#34517f]/90 bg-[linear-gradient(180deg,rgba(20,39,68,0.82)_0%,rgba(11,23,43,0.9)_100%)]";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9db6df]";

const RESIDENT_SORT_OPTIONS: Array<{ value: ResidentSort; label: string }> = [
  { value: "follow-up", label: "Follow-Up Priority" },
  { value: "low-to-high", label: "Lowest Participation" },
  { value: "high-to-low", label: "Highest Participation" },
  { value: "name", label: "Resident Name" }
];

function readSearchValue(source: AnalyticsSearchParams | undefined, key: string) {
  const value = source?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseResidentSort(value: string | null): ResidentSort {
  if (value === "low-to-high") return "low-to-high";
  if (value === "high-to-low") return "high-to-low";
  if (value === "name") return "name";
  return "follow-up";
}

function toWholeNumber(value: number) {
  return Number(value.toFixed(0));
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function formatDateTime(iso: string | null, timeZone: string) {
  if (!iso) return "No activity logged";
  return formatInTimeZone(new Date(iso), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildAnalyticsHref(
  filters: AnalyticsDashboardFilters,
  extras: {
    residentQ: string;
    residentSort: ResidentSort;
  },
  patchFilters?: Partial<AnalyticsDashboardFilters>,
  patchExtras?: Partial<{ residentQ: string; residentSort: ResidentSort }>
) {
  const nextFilters = {
    ...filters,
    ...(patchFilters ?? {})
  };
  const nextExtras = {
    ...extras,
    ...(patchExtras ?? {})
  };

  const params = new URLSearchParams(analyticsDashboardFiltersToQueryString(nextFilters));
  if (nextExtras.residentQ.trim().length > 0) params.set("residentQ", nextExtras.residentQ.trim());
  if (nextExtras.residentSort !== "follow-up") params.set("residentSort", nextExtras.residentSort);

  const query = params.toString();
  return query.length > 0 ? `/app/analytics?${query}` : "/app/analytics";
}

function trendToneForDelta(deltaValue: number) {
  if (deltaValue > 0) return "up" as const;
  if (deltaValue < 0) return "down" as const;
  return "flat" as const;
}

function trendClass(tone: "up" | "down" | "flat") {
  if (tone === "up") return "text-emerald-100";
  if (tone === "down") return "text-rose-100";
  return "text-[#bdd2f4]";
}

function trendIcon(tone: "up" | "down" | "flat") {
  if (tone === "up") return <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />;
  if (tone === "down") return <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />;
  return <BarChart3 className="h-3.5 w-3.5" aria-hidden />;
}

function valueFromKpi(snapshot: AnalyticsDashboardSnapshot, key: string) {
  return snapshot.kpis.find((item) => item.key === key)?.value ?? "0";
}

function numericFromKpi(snapshot: AnalyticsDashboardSnapshot, key: string) {
  const value = valueFromKpi(snapshot, key);
  const normalized = value.replaceAll("%", "").replaceAll(",", "").trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function residentTrendChip(trend: "up" | "down" | "flat") {
  if (trend === "up") return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  if (trend === "down") return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  return "border-blue-400/45 bg-blue-500/16 text-blue-100";
}

function residentTrendLabel(trend: "up" | "down" | "flat") {
  if (trend === "up") return "Improving";
  if (trend === "down") return "Declining";
  return "Stable";
}

export default async function AnalyticsHubPage({
  searchParams
}: {
  searchParams?: AnalyticsSearchParams;
}) {
  const context = await requireModulePage("analyticsHeatmaps");
  const filters = parseAnalyticsDashboardFilters(searchParams, context.timeZone);
  const snapshot = await getAnalyticsDashboardSnapshot({
    facilityId: context.facilityId,
    timeZone: context.timeZone,
    filters
  });

  const residentQ = readSearchValue(searchParams, "residentQ") ?? "";
  const residentSort = parseResidentSort(readSearchValue(searchParams, "residentSort"));

  const extras = {
    residentQ,
    residentSort
  };

  const presetOptions: Array<{ value: AnalyticsDashboardPreset; label: string }> = [
    { value: "this-month", label: "This Month" },
    { value: "last-month", label: "Last Month" },
    { value: "quarter", label: "Quarter" },
    { value: "custom", label: "Custom" }
  ];

  const scopeOptions: Array<{ value: AnalyticsDashboardParticipationScope; label: string }> = [
    { value: "all", label: "All Participation" },
    { value: "group", label: "Group" },
    { value: "one-to-one", label: "1:1" }
  ];

  const statusOptions: Array<{ value: AnalyticsDashboardResidentStatusFilter; label: string }> = [
    { value: "all-active", label: "Active Eligible" },
    { value: "active", label: "Active" },
    { value: "bed-bound", label: "Bed Bound" },
    { value: "hospitalized", label: "Hospitalized" },
    { value: "on-leave", label: "On Leave" },
    { value: "inactive", label: "Inactive" },
    { value: "all", label: "All Statuses" }
  ];

  const docTypeOptions: Array<{ value: AnalyticsDashboardDocTypeFilter; label: string }> = [
    { value: "all", label: "All Docs" },
    { value: "progress", label: "Progress Notes" },
    { value: "one-to-one", label: "1:1 Notes" },
    { value: "uda", label: "UDA" },
    { value: "mds", label: "MDS" },
    { value: "care-plan", label: "Care Plan" }
  ];

  const groupCount = snapshot.charts.groupVsOneToOne.find((row) => row.label === "Group")?.value ?? 0;
  const oneToOneCount = snapshot.charts.groupVsOneToOne.find((row) => row.label === "1:1")?.value ?? 0;
  const totalProgramming = groupCount + oneToOneCount;
  const groupPercent = percent(groupCount, totalProgramming);
  const oneToOnePercent = percent(oneToOneCount, totalProgramming);

  const participationRate = numericFromKpi(snapshot, "participation-rate");
  const residentsEngaged = toWholeNumber(numericFromKpi(snapshot, "residents-engaged"));
  const followUpNeeded = toWholeNumber(numericFromKpi(snapshot, "follow-up"));
  const notesCompleted = snapshot.documentation.progressCompleted + snapshot.documentation.oneToOneCompleted;
  const docsCompletedTotal =
    snapshot.documentation.progressCompleted +
    snapshot.documentation.oneToOneCompleted +
    snapshot.documentation.udaCompleted +
    snapshot.documentation.mdsCompleted +
    snapshot.documentation.carePlanUpdatesCompleted;

  const completionBreakdown = [
    { key: "completed", label: "Completed", value: docsCompletedTotal, tone: "bg-emerald-400" },
    { key: "overdue", label: "Overdue", value: snapshot.documentation.overdueCount, tone: "bg-rose-400" },
    { key: "follow-up", label: "Follow-Up Needed", value: snapshot.insights.residentsNeedingOutreach, tone: "bg-amber-300" },
    { key: "lag", label: "1:1 Coverage Gap", value: snapshot.insights.oneToOneCompletionLag, tone: "bg-blue-300" }
  ];

  const completionTotal = Math.max(completionBreakdown.reduce((total, row) => total + row.value, 0), 1);
  const completionRate = snapshot.insights.documentationCompletionRate;

  const completedDeg = (completionBreakdown[0].value / completionTotal) * 360;
  const overdueDeg = (completionBreakdown[1].value / completionTotal) * 360;
  const followUpDeg = (completionBreakdown[2].value / completionTotal) * 360;
  const lagDeg = (completionBreakdown[3].value / completionTotal) * 360;
  const donutStyle = {
    background: `conic-gradient(#34d399 0deg ${completedDeg}deg,#fb7185 ${completedDeg}deg ${completedDeg + overdueDeg}deg,#fbbf24 ${completedDeg + overdueDeg}deg ${completedDeg + overdueDeg + followUpDeg}deg,#60a5fa ${
      completedDeg + overdueDeg + followUpDeg
    }deg ${completedDeg + overdueDeg + followUpDeg + lagDeg}deg,#334155 ${completedDeg + overdueDeg + followUpDeg + lagDeg}deg 360deg)`
  };

  const noteVolumeData = [
    { label: "Progress", value: snapshot.documentation.progressCompleted },
    { label: "1:1", value: snapshot.documentation.oneToOneCompleted },
    { label: "UDA", value: snapshot.documentation.udaCompleted },
    { label: "MDS", value: snapshot.documentation.mdsCompleted },
    { label: "Care Plan", value: snapshot.documentation.carePlanUpdatesCompleted }
  ];

  const residentSearchToken = residentQ.toLowerCase();
  const filteredResidents = snapshot.residents.rows.filter((row) => {
    if (!residentSearchToken) return true;
    return (
      row.residentName.toLowerCase().includes(residentSearchToken) ||
      row.room.toLowerCase().includes(residentSearchToken) ||
      row.unitName.toLowerCase().includes(residentSearchToken) ||
      row.preferredCategory.toLowerCase().includes(residentSearchToken)
    );
  });

  const sortedResidents = [...filteredResidents].sort((a, b) => {
    if (residentSort === "name") {
      return a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
    }

    if (residentSort === "high-to-low") {
      if (a.participationCount === b.participationCount) {
        return a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
      }
      return b.participationCount - a.participationCount;
    }

    if (residentSort === "low-to-high") {
      if (a.participationCount === b.participationCount) {
        return a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
      }
      return a.participationCount - b.participationCount;
    }

    if (a.followUpFlag !== b.followUpFlag) return a.followUpFlag ? -1 : 1;
    if (a.participationCount === b.participationCount) {
      return a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
    }
    return a.participationCount - b.participationCount;
  });

  const residentHighlights = sortedResidents.slice(0, 8);
  const hasChartData =
    snapshot.charts.dailyTrend.some((row) => row.value > 0) ||
    snapshot.charts.groupVsOneToOne.some((row) => row.value > 0) ||
    snapshot.charts.categoryPerformance.some((row) => row.value > 0);

  const compareLabel = snapshot.compareRange?.label ?? "Previous period";
  const comparisonDelta = snapshot.comparison.previous
    ? Number((participationRate - snapshot.comparison.previous.monthParticipationRate).toFixed(1))
    : 0;
  const comparisonTone = trendToneForDelta(comparisonDelta);

  const engagementDistribution = [
    { label: "Highly engaged", value: snapshot.residents.buckets.highlyEngaged, color: "bg-emerald-300" },
    { label: "Moderately engaged", value: snapshot.residents.buckets.moderatelyEngaged, color: "bg-blue-300" },
    { label: "Low engagement", value: snapshot.residents.buckets.lowEngagement, color: "bg-amber-300" },
    { label: "No participation", value: snapshot.residents.buckets.noParticipation, color: "bg-rose-300" }
  ];

  const comparisonNote = snapshot.comparison.enabled && snapshot.comparison.previous
    ? `${comparisonDelta > 0 ? "+" : ""}${comparisonDelta.toFixed(1)} pts vs ${compareLabel}`
    : "Comparison is currently off";

  return (
    <div className="space-y-5">
      <TopContentHeader
        eyebrow="Activity Department Insights"
        title="Analytics"
        subtitle="See participation, documentation volume, and resident engagement trends in one calm command center."
        icon={BarChart3}
        accentGradientClasses="from-cyan-300 to-violet-400"
        actions={
          <>
            <Link
              href={buildAnalyticsHref(filters, extras, { compare: !filters.compare })}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition",
                filters.compare
                  ? "border-violet-300/50 bg-violet-500/16 text-violet-100"
                  : "border-[#3b5d93] bg-[#173158] text-[#d3e3ff] hover:bg-[#1e3d69]"
              )}
            >
              Compare: {filters.compare ? "On" : "Off"}
            </Link>
            <Link
              href={`/app/reports?month=${snapshot.range.selectedMonth}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#4a6ea7] bg-[#224579] px-3 text-xs font-semibold text-white transition hover:bg-[#2a5492]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export Report
            </Link>
          </>
        }
      >
        <div className={cn(PANEL_SOFT, "grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center")}>
          <div>
            <p className={META_LABEL}>Selected Date Window</p>
            <p className="mt-1 text-base font-semibold text-white">{snapshot.range.label}</p>
            <p className="mt-1 text-xs text-[#a8c1e8]">
              Month totals are isolated to this period only. Prior months are excluded unless compare mode is enabled.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                trendClass(comparisonTone),
                comparisonTone === "up" && "border-emerald-300/40 bg-emerald-500/16",
                comparisonTone === "down" && "border-rose-300/40 bg-rose-500/16",
                comparisonTone === "flat" && "border-[#3d5f97] bg-[#173158]"
              )}
            >
              {trendIcon(comparisonTone)}
              {comparisonNote}
            </span>
          </div>
        </div>
      </TopContentHeader>

      <section className={cn(PANEL, "p-4")} aria-label="Analytics controls">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={META_LABEL}>Filters & Date Controls</p>
            <h2 className="mt-1 text-base font-bold text-white">Period, scope, and resident highlights</h2>
          </div>
          <Link
            href="/app/analytics"
            className="inline-flex h-9 items-center rounded-full border border-[#3d5f97] bg-[#18335c] px-3 text-xs font-semibold text-[#d7e5ff] hover:bg-[#1f4071]"
          >
            Reset all
          </Link>
        </div>
        <form method="get" className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Resident Search
            <div className="mt-1 flex h-10 items-center rounded-full border border-[#3b5d92] bg-[#11243f] px-3">
              <Search className="h-3.5 w-3.5 text-[#87a4d4]" aria-hidden />
              <input
                type="text"
                name="residentQ"
                defaultValue={residentQ}
                placeholder="Name, room, unit..."
                className="h-full w-full bg-transparent px-2 text-sm normal-case text-[#e2ecff] placeholder:text-[#7f9ac8] focus:outline-none"
              />
            </div>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Resident Sort
            <select
              name="residentSort"
              defaultValue={residentSort}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {RESIDENT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Preset
            <select
              name="preset"
              defaultValue={filters.preset}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {presetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Month
            <input
              type="month"
              name="month"
              defaultValue={filters.selectedMonth}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Custom From
            <input
              type="date"
              name="from"
              defaultValue={filters.customFrom ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Custom To
            <input
              type="date"
              name="to"
              defaultValue={filters.customTo ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Compare
            <select
              name="compare"
              defaultValue={filters.compare ? "1" : "0"}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="0">Off</option>
              <option value="1">On</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Unit
            <select
              name="unitId"
              defaultValue={filters.unitId ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All units</option>
              {snapshot.options.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Category
            <select
              name="category"
              defaultValue={filters.activityCategory ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All categories</option>
              {snapshot.options.categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Participation Scope
            <select
              name="participationScope"
              defaultValue={filters.participationScope}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Resident Status
            <select
              name="residentStatus"
              defaultValue={filters.residentStatus}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Documentation Type
            <select
              name="docType"
              defaultValue={filters.docType}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {docTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9eb7df]">
            Staff Member
            <select
              name="staffId"
              defaultValue={filters.staffId ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#3b5d92] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All staff</option>
              {snapshot.options.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end justify-end gap-2 md:col-span-2 xl:col-span-6">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#5075af] bg-[#244a82] px-4 text-xs font-semibold text-white transition hover:bg-[#2b5999]"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Apply analytics filters
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Participation This Month"
          value={`${participationRate.toFixed(1)}%`}
          detail={`${residentsEngaged} residents engaged in selected period`}
          accent="from-cyan-300/30 to-blue-500/25"
          icon={Users}
        />
        <SummaryCard
          label="Notes Completed"
          value={String(notesCompleted)}
          detail={`${snapshot.documentation.progressCompleted} progress + ${snapshot.documentation.oneToOneCompleted} 1:1 notes`}
          accent="from-violet-300/30 to-fuchsia-500/25"
          icon={NotebookPen}
        />
        <SummaryCard
          label="Group vs 1:1 Balance"
          value={`${groupPercent.toFixed(0)}% / ${oneToOnePercent.toFixed(0)}%`}
          detail={`${groupCount} group logs · ${oneToOneCount} 1:1 logs`}
          accent="from-blue-300/30 to-indigo-500/25"
          icon={Layers3}
        />
        <SummaryCard
          label="Residents Engaged"
          value={`${residentsEngaged} of ${snapshot.residents.rows.length}`}
          detail="Unique residents with qualifying participation"
          accent="from-emerald-300/30 to-teal-500/25"
          icon={UserCheck2}
        />
        <SummaryCard
          label="Follow-Ups Needed"
          value={String(followUpNeeded)}
          detail={`${snapshot.insights.residentsNeedingOutreach} residents need outreach attention`}
          accent="from-amber-300/30 to-orange-500/25"
          icon={UserX}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Participation Trends</p>
              <h3 className="mt-1 text-base font-bold text-white">How engagement is trending</h3>
              <p className="mt-1 text-xs text-[#a8c0e7]">Daily participation activity across the selected period.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {presetOptions.map((option) => (
                <Link
                  key={option.value}
                  href={buildAnalyticsHref(filters, extras, { preset: option.value })}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold transition",
                    filters.preset === option.value
                      ? "border-[#5c84c5] bg-[#23487e] text-white"
                      : "border-[#38598f] bg-[#173158] text-[#cbddfa] hover:border-[#4f74ad] hover:text-white"
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <AnalyticsLineChartLazy data={snapshot.charts.dailyTrend} lineColor="#6EA8FF" />
          </div>
          {!hasChartData ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#3c5f95] bg-[#10223f] p-4 text-sm text-[#b6cbec]">
              No participation data is available for this range yet.
            </div>
          ) : null}
        </article>

        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>Monthly Completion Snapshot</p>
          <h3 className="mt-1 text-base font-bold text-white">How under control this month is</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
            <div className="relative mx-auto h-44 w-44">
              <div className="h-full w-full rounded-full p-3" style={donutStyle}>
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-[#35547f] bg-[#0d1b32]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9cb6df]">Completion</p>
                  <p className="mt-1 text-3xl font-black text-white">{completionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {completionBreakdown.map((entry) => (
                <div key={entry.key} className={cn(PANEL_SOFT, "flex items-center justify-between px-3 py-2")}>
                  <span className="inline-flex items-center gap-2 text-sm text-[#d6e5ff]">
                    <span className={cn("h-2.5 w-2.5 rounded-full", entry.tone)} aria-hidden />
                    {entry.label}
                  </span>
                  <span className="text-sm font-semibold text-white">{entry.value}</span>
                </div>
              ))}
              <p className="text-xs text-[#9eb8df]">
                Current period totals are isolated to {snapshot.range.label}. Prior periods are only shown in compare mode.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>Group vs 1:1 Balance</p>
          <h3 className="mt-1 text-base font-bold text-white">Programming mix in selected period</h3>
          <div className="mt-3 rounded-xl border border-[#35527f] bg-[#10223f] p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-[#b5cbec]">
              <span>Group programming</span>
              <span>{groupPercent.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#1a3158]">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: `${groupPercent}%` }} />
            </div>
            <div className="mb-2 mt-3 flex items-center justify-between text-xs text-[#b5cbec]">
              <span>1:1 programming</span>
              <span>{oneToOnePercent.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#1a3158]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-500"
                style={{ width: `${oneToOnePercent}%` }}
              />
            </div>
          </div>
          <div className="mt-3">
            <AnalyticsBarChartLazy data={snapshot.charts.groupVsOneToOne} barColor="#7C8BFF" />
          </div>
        </article>

        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>Documentation Volume</p>
          <h3 className="mt-1 text-base font-bold text-white">Completed documentation by type</h3>
          <div className="mt-3">
            <AnalyticsBarChartLazy data={noteVolumeData} barColor="#22c55e" />
          </div>
          <p className="mt-2 text-xs text-[#9db7df]">
            Notes and workflow completions for the selected range, with no carry-over from prior months.
          </p>
        </article>

        <article className={cn(PANEL, "p-4")}>
          <p className={META_LABEL}>Category Performance</p>
          <h3 className="mt-1 text-base font-bold text-white">Which activity types are performing best</h3>
          <div className="mt-3">
            <AnalyticsBarChartLazy
              data={
                snapshot.charts.categoryPerformance.length > 0
                  ? snapshot.charts.categoryPerformance
                  : [{ label: "No category data", value: 0 }]
              }
              horizontal
              barColor="#60a5fa"
            />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <article className={cn(PANEL, "p-4")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>Resident Highlights</p>
              <h3 className="mt-1 text-base font-bold text-white">Engagement watchlist and action board</h3>
              <p className="mt-1 text-xs text-[#a8c0e7]">
                Prioritizes residents who need follow-up, then surfaces trend and participation context.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center rounded-full border border-[#3c5e95] bg-[#173158] px-3 text-[11px] font-semibold text-[#d6e5ff]">
                {residentHighlights.length} shown
              </span>
            </div>
          </div>

          {residentHighlights.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-6 text-center">
              <p className="text-base font-semibold text-white">No resident highlights in this view.</p>
              <p className="mt-2 text-sm text-[#a9c1e7]">Try clearing resident search or adjusting filters.</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {residentHighlights.map((row) => (
                <article key={row.residentId} className={cn(PANEL_SOFT, "p-3")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.residentName}</p>
                      <p className="text-xs text-[#9fb8e0]">
                        Room {row.room} · {row.unitName}
                      </p>
                    </div>
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", residentTrendChip(row.trend))}>
                      {residentTrendLabel(row.trend)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#c7daf7]">
                    <div>
                      <p className="text-[#95afd8]">Participation</p>
                      <p className="font-semibold text-white">{row.participationCount} logs</p>
                    </div>
                    <div>
                      <p className="text-[#95afd8]">Preferred category</p>
                      <p className="font-semibold text-white">{row.preferredCategory}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[#95afd8]">Last participation</p>
                      <p className="font-semibold text-white">{formatDateTime(row.lastParticipatedDate, context.timeZone)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        row.followUpFlag
                          ? "border-amber-300/40 bg-amber-500/16 text-amber-100"
                          : "border-emerald-300/40 bg-emerald-500/16 text-emerald-100"
                      )}
                    >
                      {row.followUpFlag ? "Follow-Up Needed" : "Current"}
                    </span>
                    <Link
                      href={`/app/residents?residentId=${row.residentId}`}
                      className="inline-flex rounded-full border border-[#3f649c] bg-[#1a3a68] px-2 py-0.5 text-[11px] font-semibold text-[#dbe8ff] hover:bg-[#214678]"
                    >
                      Open Resident
                    </Link>
                    <Link
                      href={`/app/documentation?tab=ONE_TO_ONE&residentId=${row.residentId}`}
                      className="inline-flex rounded-full border border-[#3f649c] bg-[#1a3a68] px-2 py-0.5 text-[11px] font-semibold text-[#dbe8ff] hover:bg-[#214678]"
                    >
                      Add 1:1 Note
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <article className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Resident Engagement Summary</p>
            <h3 className="mt-1 text-base font-bold text-white">Who is engaged and who needs attention</h3>
            <div className="mt-3 space-y-2">
              {engagementDistribution.map((bucket) => (
                <div key={bucket.label} className={cn(PANEL_SOFT, "px-3 py-2")}>
                  <div className="flex items-center justify-between text-sm text-[#d6e5ff]">
                    <span>{bucket.label}</span>
                    <span className="font-semibold text-white">{bucket.value}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1b325a]">
                    <div
                      className={cn("h-full rounded-full", bucket.color)}
                      style={{ width: `${percent(bucket.value, snapshot.residents.rows.length)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>This Month at a Glance</p>
            <h3 className="mt-1 text-base font-bold text-white">Key takeaways</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#d1e2ff]">
              <li className={cn(PANEL_SOFT, "px-3 py-2")}>
                Participation rate is <strong className="text-white">{participationRate.toFixed(1)}%</strong> for {snapshot.range.label}.
              </li>
              <li className={cn(PANEL_SOFT, "px-3 py-2")}>
                <strong className="text-white">{snapshot.insights.mostAttendedCategory}</strong> is currently the strongest category.
              </li>
              <li className={cn(PANEL_SOFT, "px-3 py-2")}>
                <strong className="text-white">{snapshot.insights.residentsNeedingOutreach}</strong> residents have low/no engagement and should be reviewed.
              </li>
              <li className={cn(PANEL_SOFT, "px-3 py-2")}>
                Best participation day was <strong className="text-white">{snapshot.insights.bestAttendanceDay}</strong>.
              </li>
              <li className={cn(PANEL_SOFT, "px-3 py-2")}>
                Documentation completion is <strong className="text-white">{completionRate.toFixed(1)}%</strong> with{" "}
                <strong className="text-white">{snapshot.documentation.overdueCount}</strong> overdue items.
              </li>
            </ul>
          </article>

          <article className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Monthly Counts</p>
            <h3 className="mt-1 text-base font-bold text-white">Current month scorecard</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MetricPill label="Group attendance logs" value={groupCount} icon={Users} />
              <MetricPill label="1:1 visits logged" value={oneToOneCount} icon={HandHeart} />
              <MetricPill label="Notes completed" value={notesCompleted} icon={NotebookPen} />
              <MetricPill label="Workflow completed" value={docsCompletedTotal} icon={FileText} />
              <MetricPill label="Follow-ups needed" value={followUpNeeded} icon={UserX} />
              <MetricPill label="Overdue items" value={snapshot.documentation.overdueCount} icon={CalendarClock} />
            </div>
          </article>

          <article className={cn(PANEL, "p-4")}>
            <p className={META_LABEL}>Quick Actions</p>
            <h3 className="mt-1 text-base font-bold text-white">Move from insight to action</h3>
            <div className="mt-3 grid gap-2">
              <QuickActionLink href="/app/reports" label="Open Reports" icon={Download} />
              <QuickActionLink href="/app/attendance" label="Open Attendance" icon={Users} />
              <QuickActionLink href="/app/documentation" label="Open Documentation" icon={NotebookPen} />
              <QuickActionLink href="/app/residents" label="Residents Needing Follow-Up" icon={UserX} />
              <QuickActionLink href="/app/calendar" label="Open Calendar" icon={CalendarClock} />
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  accent
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <article className={cn(PANEL, "relative overflow-hidden p-3")}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r", accent)} />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs text-[#a8c0e8]">{detail}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#3e5f96] bg-[#17335d] text-[#d9e8ff]">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </article>
  );
}

function MetricPill({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className={cn(PANEL_SOFT, "px-3 py-2")}>
      <p className="text-[11px] text-[#9eb7df]">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-lg font-bold text-white">
        <Icon className="h-4 w-4 text-[#8eb0e5]" aria-hidden />
        {value}
      </p>
    </div>
  );
}

function QuickActionLink({
  href,
  label,
  icon: Icon
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between rounded-xl border border-[#3d5f97] bg-[#17345f] px-3 py-2 text-sm font-semibold text-[#d8e7ff] transition hover:bg-[#1f4374]"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
