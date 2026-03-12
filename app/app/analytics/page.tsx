import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  Download,
  Filter,
  Layers3,
  NotebookPen,
  Sparkles,
  Users,
  UserX
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
  type AnalyticsDashboardResidentStatusFilter
} from "@/lib/analytics/dashboard-command-center";
import { requireModulePage } from "@/lib/page-guards";
import { formatInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

const PANEL =
  "rounded-[1.35rem] border border-[#243a61]/90 bg-[linear-gradient(180deg,#0d172b_0%,#0b1427_54%,#08101f_100%)] shadow-[0_28px_48px_-36px_rgba(37,99,235,0.75)]";
const PANEL_INNER = "rounded-xl border border-[#304872] bg-[#0e1a30]";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#95aed8]";

function withPatch(base: AnalyticsDashboardFilters, patch: Partial<AnalyticsDashboardFilters>) {
  const merged = { ...base, ...patch };
  return `/app/analytics?${analyticsDashboardFiltersToQueryString(merged)}`;
}

function toneClassForDelta(tone: "up" | "down" | "flat") {
  if (tone === "up") return "text-emerald-200";
  if (tone === "down") return "text-rose-200";
  return "text-[#a8bfe7]";
}

function trendIcon(tone: "up" | "down" | "flat") {
  if (tone === "up") return <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />;
  if (tone === "down") return <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />;
  return <BarChart3 className="h-3.5 w-3.5" aria-hidden />;
}

function residentTrendChip(trend: "up" | "down" | "flat") {
  if (trend === "up") {
    return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  }
  if (trend === "down") {
    return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  }
  return "border-blue-400/45 bg-blue-500/16 text-blue-100";
}

function formatDate(iso: string | null, timeZone: string) {
  if (!iso) return "Not recorded";
  return formatInTimeZone(new Date(iso), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function hiddenDateScopeFields(filters: AnalyticsDashboardFilters) {
  return (
    <>
      <input type="hidden" name="preset" value={filters.preset} />
      <input type="hidden" name="month" value={filters.selectedMonth} />
      {filters.customFrom ? <input type="hidden" name="from" value={filters.customFrom} /> : null}
      {filters.customTo ? <input type="hidden" name="to" value={filters.customTo} /> : null}
      {filters.compare ? <input type="hidden" name="compare" value="1" /> : null}
    </>
  );
}

function hiddenFilterFields(filters: AnalyticsDashboardFilters) {
  return (
    <>
      {filters.unitId ? <input type="hidden" name="unitId" value={filters.unitId} /> : null}
      {filters.activityCategory ? <input type="hidden" name="category" value={filters.activityCategory} /> : null}
      {filters.participationScope !== "all" ? (
        <input type="hidden" name="participationScope" value={filters.participationScope} />
      ) : null}
      {filters.residentStatus !== "all-active" ? (
        <input type="hidden" name="residentStatus" value={filters.residentStatus} />
      ) : null}
      {filters.participationLevel ? <input type="hidden" name="participationLevel" value={filters.participationLevel} /> : null}
      {filters.responseType ? <input type="hidden" name="responseType" value={filters.responseType} /> : null}
      {filters.mood ? <input type="hidden" name="mood" value={filters.mood} /> : null}
      {filters.staffId ? <input type="hidden" name="staffId" value={filters.staffId} /> : null}
      {filters.docType !== "all" ? <input type="hidden" name="docType" value={filters.docType} /> : null}
    </>
  );
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

  const presetOptions: Array<{ value: AnalyticsDashboardPreset; label: string }> = [
    { value: "this-month", label: "This Month" },
    { value: "last-month", label: "Last Month" },
    { value: "quarter", label: "Quarter" },
    { value: "custom", label: "Custom Range" }
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

  const hasChartData =
    snapshot.charts.dailyTrend.some((row) => row.value > 0) ||
    snapshot.charts.groupVsOneToOne.some((row) => row.value > 0) ||
    snapshot.charts.categoryPerformance.some((row) => row.value > 0);

  return (
    <div className="space-y-4">
      <TopContentHeader
        eyebrow="Operations Analytics"
        title="Analytics"
        subtitle="Monthly command center for participation performance, documentation completion, and resident follow-up visibility."
        icon={BarChart3}
        accentGradientClasses="from-cyan-300 to-blue-500"
        actions={
          <>
            <Link
              href={withPatch(filters, { compare: !filters.compare })}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition",
                filters.compare
                  ? "border-violet-400/45 bg-violet-500/16 text-violet-100"
                  : "border-[#355687] bg-[#142f57] text-[#d5e4ff] hover:bg-[#193963]"
              )}
            >
              Compare: {filters.compare ? "On" : "Off"}
            </Link>
            <Link
              href={`/app/reports?month=${snapshot.range.selectedMonth}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#3f649b] bg-[#1d3d70] px-3 text-xs font-semibold text-white hover:bg-[#245089]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export
            </Link>
            <a
              href="#analytics-filters"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#355687] bg-[#142f57] px-3 text-xs font-semibold text-[#d5e4ff] hover:bg-[#193963]"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Filters
            </a>
          </>
        }
      >
        <div className={cn(PANEL_INNER, "p-3") }>
          <p className={META_LABEL}>Selected Period</p>
          <p className="mt-1 text-sm text-[#dce8ff]">{snapshot.range.label}</p>
          <p className="mt-1 text-xs text-[#9db6df]">
            Month-scoped mode uses strict boundary logic: records where timestamp {'>='} start and {'<'} next month start.
          </p>
        </div>
      </TopContentHeader>

      <section className={cn(PANEL, "p-4") }>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={META_LABEL}>Month / Date Controls</p>
            <h2 className="mt-1 text-base font-bold text-white">Range Selection</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {presetOptions.map((option) => (
              <Link
                key={option.value}
                href={withPatch(filters, { preset: option.value })}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition",
                  filters.preset === option.value
                    ? "border-[#5f89cb] bg-[#244881] text-white"
                    : "border-[#365788] bg-[#153058] text-[#c7daf8] hover:border-[#4b73ae] hover:text-white"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <form method="get" className="mt-3 grid gap-2 lg:grid-cols-[170px_150px_160px_160px_auto]">
          {hiddenFilterFields(filters)}
          <input type="hidden" name="preset" value={filters.preset} />

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Month
            <input
              type="month"
              name="month"
              defaultValue={filters.selectedMonth}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Compare
            <select
              name="compare"
              defaultValue={filters.compare ? "1" : "0"}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="0">Off</option>
              <option value="1">On</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Custom From
            <input
              type="date"
              name="from"
              defaultValue={filters.customFrom ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Custom To
            <input
              type="date"
              name="to"
              defaultValue={filters.customTo ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            />
          </label>

          <div className="flex items-end justify-end">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#446b9f] bg-[#1d3f72] px-4 text-xs font-semibold text-white hover:bg-[#25508d]"
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Apply Range
            </button>
          </div>
        </form>
      </section>

      <section id="analytics-filters" className={cn(PANEL, "p-4") }>
        <p className={META_LABEL}>Filters</p>
        <h2 className="mt-1 text-base font-bold text-white">Resident + Documentation Filters</h2>

        <form method="get" className="mt-3 grid gap-2 lg:grid-cols-5">
          {hiddenDateScopeFields(filters)}

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Hall / Unit
            <select
              name="unitId"
              defaultValue={filters.unitId ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All units</option>
              {snapshot.options.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Activity Category
            <select
              name="category"
              defaultValue={filters.activityCategory ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All categories</option>
              {snapshot.options.categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Group vs 1:1
            <select
              name="participationScope"
              defaultValue={filters.participationScope}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Resident Status
            <select
              name="residentStatus"
              defaultValue={filters.residentStatus}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Participation Level
            <select
              name="participationLevel"
              defaultValue={filters.participationLevel ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All</option>
              {snapshot.options.participationLevels.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Response Type
            <select
              name="responseType"
              defaultValue={filters.responseType ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All</option>
              {snapshot.options.responseTypes.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Mood
            <select
              name="mood"
              defaultValue={filters.mood ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All</option>
              {snapshot.options.moods.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Staff Member
            <select
              name="staffId"
              defaultValue={filters.staffId ?? ""}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              <option value="">All staff</option>
              {snapshot.options.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab4dd]">
            Documentation Type
            <select
              name="docType"
              defaultValue={filters.docType}
              className="mt-1 h-10 w-full rounded-full border border-[#355687] bg-[#11243f] px-3 text-sm normal-case text-[#dde9ff]"
            >
              {docTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end justify-end gap-2 lg:col-span-5">
            <Link
              href={withPatch(filters, {
                unitId: null,
                activityCategory: null,
                participationScope: "all",
                residentStatus: "all-active",
                participationLevel: null,
                responseType: null,
                mood: null,
                staffId: null,
                docType: "all"
              })}
              className="inline-flex h-10 items-center rounded-full border border-[#375989] bg-[#16325c] px-4 text-xs font-semibold text-[#d6e5ff] hover:bg-[#1a3b6e]"
            >
              Clear Filters
            </Link>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-full border border-[#446b9f] bg-[#1d3f72] px-4 text-xs font-semibold text-white hover:bg-[#25508d]"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.kpis.map((kpi) => (
          <article key={kpi.key} className={cn(PANEL, "relative overflow-hidden p-3") }>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-cyan-300/15 via-blue-400/10 to-violet-300/15" />
            <p className={META_LABEL}>{kpi.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{kpi.value}</p>
            <p className="mt-1 text-xs text-[#a5bee6]">{kpi.helper}</p>
            {kpi.delta ? (
              <p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-semibold", toneClassForDelta(kpi.deltaTone))}>
                {trendIcon(kpi.deltaTone)}
                {kpi.delta}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[#8faad7]">No comparison</p>
            )}
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-2">
            <article className={cn(PANEL, "p-4") }>
              <p className={META_LABEL}>Participation Trend by Day</p>
              <h3 className="mt-1 text-base font-bold text-white">Daily Participation</h3>
              <div className="mt-3">
                <AnalyticsLineChartLazy data={snapshot.charts.dailyTrend} lineColor="#5C8BFF" />
              </div>
              {!hasChartData ? (
                <p className="mt-2 text-xs text-[#9db6df]">No activity data recorded in the selected period.</p>
              ) : null}
            </article>

            <article className={cn(PANEL, "p-4") }>
              <p className={META_LABEL}>Group vs 1:1</p>
              <h3 className="mt-1 text-base font-bold text-white">Engagement Mode Mix</h3>
              <div className="mt-3">
                <AnalyticsBarChartLazy data={snapshot.charts.groupVsOneToOne} barColor="#7C5CFF" />
              </div>
            </article>

            <article className={cn(PANEL, "p-4") }>
              <p className={META_LABEL}>Activity Category Performance</p>
              <h3 className="mt-1 text-base font-bold text-white">Category Attendance</h3>
              <div className="mt-3">
                <AnalyticsBarChartLazy
                  data={
                    snapshot.charts.categoryPerformance.length > 0
                      ? snapshot.charts.categoryPerformance
                      : [{ label: "No data", value: 0 }]
                  }
                  horizontal
                  barColor="#3B82F6"
                />
              </div>
            </article>

            <article className={cn(PANEL, "p-4") }>
              <p className={META_LABEL}>Hall / Unit Engagement</p>
              <h3 className="mt-1 text-base font-bold text-white">Unit Comparison</h3>
              <div className="mt-3">
                <AnalyticsBarChartLazy
                  data={
                    snapshot.charts.unitEngagement.length > 0
                      ? snapshot.charts.unitEngagement
                      : [{ label: "No data", value: 0 }]
                  }
                  horizontal
                  barColor="#14B8A6"
                />
              </div>
            </article>
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Resident Engagement</p>
            <h3 className="mt-1 text-base font-bold text-white">Resident Participation Buckets</h3>

            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className={cn(PANEL_INNER, "p-2.5")}>
                <p className={META_LABEL}>Highly Engaged</p>
                <p className="mt-1 text-xl font-black text-emerald-100">{snapshot.residents.buckets.highlyEngaged}</p>
              </div>
              <div className={cn(PANEL_INNER, "p-2.5")}>
                <p className={META_LABEL}>Moderately Engaged</p>
                <p className="mt-1 text-xl font-black text-blue-100">{snapshot.residents.buckets.moderatelyEngaged}</p>
              </div>
              <div className={cn(PANEL_INNER, "p-2.5")}>
                <p className={META_LABEL}>Low Engagement</p>
                <p className="mt-1 text-xl font-black text-amber-100">{snapshot.residents.buckets.lowEngagement}</p>
              </div>
              <div className={cn(PANEL_INNER, "p-2.5")}>
                <p className={META_LABEL}>No Participation</p>
                <p className="mt-1 text-xl font-black text-rose-100">{snapshot.residents.buckets.noParticipation}</p>
              </div>
            </div>

            {snapshot.residents.rows.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-6 text-center">
                <p className="text-base font-semibold text-white">No matching residents</p>
                <p className="mt-2 text-sm text-[#a9c1e7]">No matching residents for selected filters.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#2d446f]">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#304872] bg-[#11243f] text-[11px] uppercase tracking-[0.12em] text-[#9ab4dd]">
                    <tr>
                      <th className="px-3 py-2">Resident</th>
                      <th className="px-3 py-2">Room</th>
                      <th className="px-3 py-2">Hall/Unit</th>
                      <th className="px-3 py-2">Last Participated</th>
                      <th className="px-3 py-2">Count This Period</th>
                      <th className="px-3 py-2">Preferred Category</th>
                      <th className="px-3 py-2">Trend</th>
                      <th className="px-3 py-2">Follow-Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.residents.rows.slice(0, 220).map((row) => (
                      <tr key={row.residentId} className="border-b border-[#243a5f] text-[#dce8ff]">
                        <td className="px-3 py-2 font-semibold">{row.residentName}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.room}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.unitName}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{formatDate(row.lastParticipatedDate, context.timeZone)}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.participationCount}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.preferredCategory}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs", residentTrendChip(row.trend))}>
                            {row.trend === "up" ? "Improving" : row.trend === "down" ? "Declining" : "Stable"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.followUpFlag ? (
                            <span className="inline-flex rounded-full border border-amber-300/45 bg-amber-500/16 px-2 py-0.5 text-amber-100">
                              Needed
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-emerald-400/45 bg-emerald-500/16 px-2 py-0.5 text-emerald-100">
                              Current
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Documentation / Compliance</p>
            <h3 className="mt-1 text-base font-bold text-white">Month-Scoped Documentation Metrics</h3>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <MetricChip label="Progress" value={snapshot.documentation.progressCompleted} tone="blue" />
              <MetricChip label="1:1" value={snapshot.documentation.oneToOneCompleted} tone="violet" />
              <MetricChip label="UDA" value={snapshot.documentation.udaCompleted} tone="amber" />
              <MetricChip label="MDS" value={snapshot.documentation.mdsCompleted} tone="emerald" />
              <MetricChip label="Care Plan Updates" value={snapshot.documentation.carePlanUpdatesCompleted} tone="sky" />
              <MetricChip label="Overdue Docs" value={snapshot.documentation.overdueCount} tone="rose" />
            </div>

            {snapshot.documentation.overdueRows.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-6 text-center">
                <p className="text-base font-semibold text-white">No overdue documentation items.</p>
                <p className="mt-2 text-sm text-[#a9c1e7]">No overdue documentation records for selected filters.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#2d446f]">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#304872] bg-[#11243f] text-[11px] uppercase tracking-[0.12em] text-[#9ab4dd]">
                    <tr>
                      <th className="px-3 py-2">Resident</th>
                      <th className="px-3 py-2">Room</th>
                      <th className="px-3 py-2">Doc Type</th>
                      <th className="px-3 py-2">Due Date</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Assigned User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.documentation.overdueRows.slice(0, 80).map((row) => (
                      <tr key={row.id} className="border-b border-[#243a5f] text-[#dce8ff]">
                        <td className="px-3 py-2 font-semibold">{row.residentName}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.room}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.docType}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{formatDate(row.dueDateIso, context.timeZone)}</td>
                        <td className="px-3 py-2 text-xs text-rose-100">{row.status}</td>
                        <td className="px-3 py-2 text-xs text-[#b8cced]">{row.assignedTo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Smart Insights</p>
            <h3 className="mt-1 text-base font-bold text-white">Monthly Intelligence</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#c8daf7]">
              <li className={cn(PANEL_INNER, "px-3 py-2") }>
                <strong className="text-white">Top category:</strong> {snapshot.insights.mostAttendedCategory}
              </li>
              <li className={cn(PANEL_INNER, "px-3 py-2") }>
                <strong className="text-white">Residents needing outreach:</strong> {snapshot.insights.residentsNeedingOutreach}
              </li>
              <li className={cn(PANEL_INNER, "px-3 py-2") }>
                <strong className="text-white">Best attendance day:</strong> {snapshot.insights.bestAttendanceDay}
              </li>
              <li className={cn(PANEL_INNER, "px-3 py-2") }>
                <strong className="text-white">Lowest engagement hall/unit:</strong> {snapshot.insights.lowestEngagementUnit}
              </li>
              <li className={cn(PANEL_INNER, "px-3 py-2") }>
                <strong className="text-white">Documentation completion:</strong> {snapshot.insights.documentationCompletionRate.toFixed(1)}%
              </li>
              <li className={cn(PANEL_INNER, "px-3 py-2") }>
                <strong className="text-white">1:1 completion lag:</strong> {snapshot.insights.oneToOneCompletionLag} residents
              </li>
            </ul>
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Comparison Mode</p>
            <h3 className="mt-1 text-base font-bold text-white">Current vs Previous Period</h3>
            {!snapshot.comparison.enabled || !snapshot.comparison.previous ? (
              <p className="mt-3 text-sm text-[#a7c0e8]">Comparison is off. Toggle compare to view prior-period deltas.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-[#c8daf7]">
                <div className={cn(PANEL_INNER, "px-3 py-2") }>
                  <p className="text-xs text-[#9db6df]">Previous Period</p>
                  <p className="mt-1 font-semibold text-white">{snapshot.compareRange?.label}</p>
                </div>
                <div className={cn(PANEL_INNER, "px-3 py-2") }>
                  <p>Participation: {snapshot.comparison.previous.monthParticipationRate.toFixed(1)}%</p>
                  <p>Group Attendance: {snapshot.comparison.previous.totalGroupAttendance}</p>
                  <p>1:1 Completed: {snapshot.comparison.previous.oneToOneCompleted}</p>
                  <p>Docs Completion: {snapshot.comparison.previous.documentationCompletionRate.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Zero-State Validation</p>
            <h3 className="mt-1 text-base font-bold text-white">Month Reset Integrity</h3>
            <div className="mt-3 space-y-2 text-xs text-[#bdd1f2]">
              <p className={cn(PANEL_INNER, "px-3 py-2")}>
                Each month-scoped query uses timezone month boundaries and never carries totals from prior months.
              </p>
              <p className={cn(PANEL_INNER, "px-3 py-2")}>
                If no records exist in selected month, KPI cards and charts render clean zeros by design.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#3a5c92] bg-[#15305a] px-2.5 py-1 text-[11px] text-[#d5e4ff]">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden />
                Month bucket strict
              </span>
              <span className="inline-flex items-center rounded-full border border-[#3a5c92] bg-[#15305a] px-2.5 py-1 text-[11px] text-[#d5e4ff]">
                <Layers3 className="mr-1 h-3 w-3" aria-hidden />
                Compare isolated
              </span>
            </div>
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Quick Links</p>
            <h3 className="mt-1 text-base font-bold text-white">Workflow Shortcuts</h3>
            <div className="mt-3 grid gap-2">
              <QuickLink href="/app/attendance" label="Attendance Tracker" icon={Users} />
              <QuickLink href="/app/documentation" label="Documentation" icon={NotebookPen} />
              <QuickLink href="/app/residents" label="Residents" icon={UserX} />
              <QuickLink href="/app/reports" label="Reports" icon={Download} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "blue" | "violet" | "amber" | "emerald" | "sky" | "rose";
}) {
  const toneClass = {
    blue: "text-blue-100",
    violet: "text-violet-100",
    amber: "text-amber-100",
    emerald: "text-emerald-100",
    sky: "text-cyan-100",
    rose: "text-rose-100"
  }[tone];

  return (
    <div className={cn(PANEL_INNER, "p-2.5") }>
      <p className={META_LABEL}>{label}</p>
      <p className={cn("mt-1 text-xl font-black", toneClass)}>{value}</p>
    </div>
  );
}

function QuickLink({
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
      className="inline-flex items-center justify-between rounded-xl border border-[#355687] bg-[#16315b] px-3 py-2 text-sm font-semibold text-[#d9e7ff] transition hover:border-[#4f74ad] hover:bg-[#1b3d6f]"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
