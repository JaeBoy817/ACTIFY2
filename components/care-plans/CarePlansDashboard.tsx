"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileClock,
  FileText,
  Filter,
  Flag,
  HandHeart,
  ListChecks,
  NotebookPen,
  Search,
  Sparkles,
  Stethoscope,
  Target,
  UserRound,
  Users
} from "lucide-react";

import { TemplatePickerModal } from "@/components/care-plans/TemplatePickerModal";
import { TopContentHeader } from "@/components/app/TopContentHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CARE_PLAN_INTERVENTION_LIBRARY, CARE_PLAN_TEMPLATES } from "@/lib/care-plans/templates";
import { formatInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { CarePlansDashboardData } from "@/app/app/care-plans/_actions/actions";

type ViewTab = "overview" | "focus" | "goals" | "interventions" | "signals" | "timeline";
type SortKey = "REVIEW_DUE" | "ROOM" | "NAME" | "UPDATED" | "OVERDUE_FIRST" | "FOCUS";
type StatusFilter = "ALL" | "ACTIVE" | "DUE_SOON" | "OVERDUE" | "NO_PLAN" | "ARCHIVED";

type Filters = {
  search?: string;
  status?: string;
  primaryFocus?: string;
  unitId?: string;
  sort?: string;
  followUp?: string;
  residentId?: string;
};

const PANEL =
  "rounded-[1.35rem] border border-[#243a61]/90 bg-[linear-gradient(180deg,#0c1629_0%,#0a1325_54%,#08101f_100%)] shadow-[0_26px_44px_-34px_rgba(37,99,235,0.72)]";
const PANEL_SOFT = "rounded-xl border border-[#2d446f]/90 bg-[#0f1b31]/90";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94add9]";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DUE_SOON", label: "Review Due" },
  { value: "OVERDUE", label: "Overdue Review" },
  { value: "NO_PLAN", label: "New Plan Needed" },
  { value: "ARCHIVED", label: "Archived" }
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "REVIEW_DUE", label: "Review Due Soonest" },
  { value: "OVERDUE_FIRST", label: "Overdue First" },
  { value: "ROOM", label: "Room" },
  { value: "NAME", label: "Resident Name" },
  { value: "UPDATED", label: "Recently Updated" },
  { value: "FOCUS", label: "Focus Category" }
];

const VIEW_TABS: Array<{ id: ViewTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "focus", label: "Focus / Need Areas" },
  { id: "goals", label: "Goals" },
  { id: "interventions", label: "Interventions" },
  { id: "signals", label: "Linked Notes & Participation" },
  { id: "timeline", label: "Review Timeline" }
];

function normalizeStatus(value: string | undefined): StatusFilter {
  if (!value) return "ALL";
  const token = value.trim().toUpperCase().replaceAll("-", "_");
  if (token === "DUE_SOON") return "DUE_SOON";
  if (token === "OVERDUE") return "OVERDUE";
  if (token === "NO_PLAN") return "NO_PLAN";
  if (token === "ACTIVE") return "ACTIVE";
  if (token === "ARCHIVED") return "ARCHIVED";
  return "ALL";
}

function normalizeSort(value: string | undefined): SortKey {
  if (!value) return "REVIEW_DUE";
  const token = value.trim().toUpperCase().replaceAll("-", "_");
  if (token === "ROOM") return "ROOM";
  if (token === "NAME") return "NAME";
  if (token === "UPDATED") return "UPDATED";
  if (token === "OVERDUE_FIRST") return "OVERDUE_FIRST";
  if (token === "FOCUS") return "FOCUS";
  return "REVIEW_DUE";
}

function formatDate(value: string | null, timeZone: string) {
  if (!value) return "Not set";
  return formatInTimeZone(new Date(value), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value: string | null, timeZone: string) {
  if (!value) return "Not recorded";
  return formatInTimeZone(new Date(value), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRelativeReviewLabel(daysUntil: number | null) {
  if (daysUntil == null) return "Not scheduled";
  if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil} days`;
}

function statusBadgeClass(status: StatusFilter | string) {
  if (status === "OVERDUE") return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  if (status === "DUE_SOON") return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  if (status === "NO_PLAN") return "border-orange-300/45 bg-orange-500/16 text-orange-100";
  if (status === "ARCHIVED") return "border-slate-400/35 bg-slate-500/14 text-slate-200";
  return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
}

function trendBadgeClass(trend: "UP" | "DOWN" | "FLAT") {
  if (trend === "UP") return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  if (trend === "DOWN") return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  return "border-blue-400/45 bg-blue-500/16 text-blue-100";
}

function trendLabel(trend: "UP" | "DOWN" | "FLAT") {
  if (trend === "UP") return "Improving";
  if (trend === "DOWN") return "Needs Attention";
  return "Stable";
}

function toCsvField(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  if (!text.includes(",") && !text.includes('"') && !text.includes("\n")) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function reviewUrgencyRank(row: CarePlansDashboardData["rows"][number]) {
  if (row.displayStatus === "OVERDUE") return 0;
  if (row.displayStatus === "DUE_SOON") return 1;
  if (row.displayStatus === "NO_PLAN") return 2;
  if (row.reviewDaysUntil == null) return 5;
  return 3;
}

function sortRows(rows: CarePlansDashboardData["rows"], sort: SortKey) {
  const next = [...rows];

  if (sort === "ROOM") {
    return next.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" }));
  }

  if (sort === "NAME") {
    return next.sort((a, b) => a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" }));
  }

  if (sort === "UPDATED") {
    return next.sort((a, b) => {
      const aTime = a.updatedAtIso ? new Date(a.updatedAtIso).getTime() : 0;
      const bTime = b.updatedAtIso ? new Date(b.updatedAtIso).getTime() : 0;
      return bTime - aTime;
    });
  }

  if (sort === "OVERDUE_FIRST") {
    return next.sort((a, b) => {
      const urgency = reviewUrgencyRank(a) - reviewUrgencyRank(b);
      if (urgency !== 0) return urgency;
      const aDays = a.reviewDaysUntil ?? Number.POSITIVE_INFINITY;
      const bDays = b.reviewDaysUntil ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });
  }

  if (sort === "FOCUS") {
    return next.sort((a, b) => {
      const aFocus = a.primaryFocusLabels[0] ?? "";
      const bFocus = b.primaryFocusLabels[0] ?? "";
      const focusCompare = aFocus.localeCompare(bFocus, undefined, { sensitivity: "base" });
      if (focusCompare !== 0) return focusCompare;
      return a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  return next.sort((a, b) => {
    const aDays = a.reviewDaysUntil ?? Number.POSITIVE_INFINITY;
    const bDays = b.reviewDaysUntil ?? Number.POSITIVE_INFINITY;
    if (aDays !== bDays) return aDays - bDays;
    return a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" });
  });
}

function StatCard({
  label,
  value,
  detail,
  tone,
  icon
}: {
  label: string;
  value: number;
  detail: string;
  tone: "pink" | "amber" | "violet" | "blue" | "emerald";
  icon: React.ReactNode;
}) {
  const toneClass = {
    pink: "from-fuchsia-300/25 to-rose-500/20",
    amber: "from-amber-300/25 to-orange-500/20",
    violet: "from-violet-300/25 to-fuchsia-500/20",
    blue: "from-cyan-300/25 to-blue-500/20",
    emerald: "from-emerald-300/25 to-teal-500/20"
  }[tone];

  return (
    <article className={cn(PANEL, "relative overflow-hidden p-3")}>
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r", toneClass)} />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>{label}</p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-xs text-[#a8c0e8]">{detail}</p>
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#3b5a8f] bg-[#16325d] text-[#d9e8ff]">
          {icon}
        </span>
      </div>
    </article>
  );
}

export function CarePlansDashboard({
  data,
  filters,
  timeZone
}: {
  data: CarePlansDashboardData;
  filters: Filters;
  timeZone: string;
}) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [status, setStatus] = useState<StatusFilter>(normalizeStatus(filters.status));
  const [unitId, setUnitId] = useState(filters.unitId ?? "all");
  const [primaryFocus, setPrimaryFocus] = useState(filters.primaryFocus ?? "all");
  const [sortBy, setSortBy] = useState<SortKey>(normalizeSort(filters.sort));
  const [followUpOnly, setFollowUpOnly] = useState(filters.followUp === "true");
  const [activeTab, setActiveTab] = useState<ViewTab>("overview");
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(filters.residentId ?? data.rows[0]?.residentId ?? null);

  const filteredRows = useMemo(() => {
    const token = search.trim().toLowerCase();

    const rows = data.rows
      .filter((row) => {
        if (!token) return true;
        return row.searchIndex.includes(token);
      })
      .filter((row) => (status === "ALL" ? true : row.displayStatus === status))
      .filter((row) => (unitId === "all" ? true : row.unitId === unitId))
      .filter((row) => (primaryFocus === "all" ? true : row.primaryFocuses.includes(primaryFocus)))
      .filter((row) => (followUpOnly ? row.followUpNeeded : true));

    return sortRows(rows, sortBy);
  }, [data.rows, followUpOnly, primaryFocus, search, sortBy, status, unitId]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedResidentId(null);
      return;
    }

    if (!selectedResidentId || !filteredRows.some((row) => row.residentId === selectedResidentId)) {
      setSelectedResidentId(filteredRows[0].residentId);
    }
  }, [filteredRows, selectedResidentId]);

  const selectedRow = useMemo(
    () => (selectedResidentId ? filteredRows.find((row) => row.residentId === selectedResidentId) ?? null : null),
    [filteredRows, selectedResidentId]
  );

  const scopedCounts = useMemo(() => {
    const rows = filteredRows;
    return {
      activeCarePlans: rows.filter((row) => row.carePlanId && row.carePlanStatus === "ACTIVE").length,
      reviewsDue: rows.filter((row) => row.displayStatus === "DUE_SOON" || row.displayStatus === "OVERDUE").length,
      goalsInProgress: rows.reduce((total, row) => total + row.goals.filter((goal) => goal.status !== "Archived").length, 0),
      followUpNeeded: rows.filter((row) => row.followUpNeeded).length,
      residentsNeedingNewCarePlan: rows.filter((row) => row.displayStatus === "NO_PLAN").length,
      interventionsUpdatedThisWeek: rows.filter((row) => {
        if (!row.updatedAtIso) return false;
        const updatedAt = new Date(row.updatedAtIso);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return updatedAt >= weekAgo && row.interventions.length > 0;
      }).length
    };
  }, [filteredRows]);

  const dueRows = useMemo(
    () =>
      filteredRows
        .filter((row) => row.displayStatus === "OVERDUE" || row.displayStatus === "DUE_SOON")
        .sort((a, b) => {
          const aDays = a.reviewDaysUntil ?? Number.POSITIVE_INFINITY;
          const bDays = b.reviewDaysUntil ?? Number.POSITIVE_INFINITY;
          return aDays - bDays;
        })
        .slice(0, 8),
    [filteredRows]
  );

  const followUpRows = useMemo(
    () =>
      filteredRows
        .filter((row) => row.followUpNeeded)
        .sort((a, b) => reviewUrgencyRank(a) - reviewUrgencyRank(b))
        .slice(0, 8),
    [filteredRows]
  );

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    setUnitId("all");
    setPrimaryFocus("all");
    setSortBy("REVIEW_DUE");
    setFollowUpOnly(false);
  }

  function exportRowsAsCsv() {
    const headers = [
      "Resident",
      "Room",
      "Unit",
      "Care Plan Status",
      "Primary Focus",
      "Review Label",
      "Goals",
      "Interventions",
      "Participation 30d",
      "Follow-Up Needed"
    ];

    const lines = [headers.join(",")];
    filteredRows.forEach((row) => {
      lines.push(
        [
          row.residentName,
          row.room,
          row.unitName ?? "",
          row.displayStatusLabel,
          row.primaryFocusLabels.join(" | "),
          row.reviewDueLabel,
          row.goals.length,
          row.interventions.length,
          `${row.participation.participationPercent30d}%`,
          row.followUpNeeded ? "Yes" : "No"
        ]
          .map((value) => toCsvField(value))
          .join(",")
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `actify-care-plans-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const activeCount = filteredRows.length;

  return (
    <div className="space-y-4">
      <TopContentHeader
        eyebrow="Care Planning Workspace"
        title="Care Plans"
        subtitle="Build and manage activity-focused care plans with a calm, structured workflow connected to resident engagement and documentation signals."
        icon={Stethoscope}
        accentGradientClasses="from-fuchsia-300 via-rose-400 to-violet-500"
        actions={
          <>
            <TemplatePickerModal residents={data.templatePickerResidents} templates={CARE_PLAN_TEMPLATES} />
            <Button
              type="button"
              variant="outline"
              className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]"
              onClick={exportRowsAsCsv}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]"
              onClick={() => {
                setStatus("DUE_SOON");
                setFollowUpOnly(false);
              }}
            >
              <Clock3 className="mr-1.5 h-4 w-4" aria-hidden />
              Open Reviews Due
            </Button>
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active Care Plans"
            value={scopedCounts.activeCarePlans}
            detail={`${activeCount} residents in current view`}
            tone="pink"
            icon={<CheckCircle2 className="h-4 w-4 text-fuchsia-100" />}
          />
          <StatCard
            label="Reviews Due"
            value={scopedCounts.reviewsDue}
            detail="Due soon or overdue review windows"
            tone="amber"
            icon={<CalendarClock className="h-4 w-4 text-amber-100" />}
          />
          <StatCard
            label="Goals In Progress"
            value={scopedCounts.goalsInProgress}
            detail="Active goal workload in current filter"
            tone="violet"
            icon={<Target className="h-4 w-4 text-violet-100" />}
          />
          <StatCard
            label="Follow-Up Needed"
            value={scopedCounts.followUpNeeded}
            detail="Residents requiring planning follow-up"
            tone="blue"
            icon={<Flag className="h-4 w-4 text-cyan-100" />}
          />
        </div>
      </TopContentHeader>

      <section className={cn(PANEL, "p-4")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className={META_LABEL}>Search + Filter</p>
            <h2 className="mt-1 text-base font-bold text-white">Care Plan Directory Controls</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="border-[#3f6297] bg-[#16325d] text-[#d8e6ff]">{filteredRows.length} residents</Badge>
            <Button
              type="button"
              variant="outline"
              className="h-9 border-[#355686] bg-[#14305a] px-3 text-xs text-[#d7e7ff] hover:bg-[#1a3a69]"
              onClick={clearFilters}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_170px_180px_190px_170px_auto]">
          <label className="relative flex h-10 items-center rounded-full border border-[#2f4671] bg-[#10203a] px-3 text-sm text-[#dce8ff]">
            <Search className="h-4 w-4 text-blue-200/80" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search resident, room, focus, goal, or intervention"
              className="h-full w-full bg-transparent px-2 text-sm placeholder:text-[#8ea8d5] focus:outline-none"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(normalizeStatus(event.target.value))}
            className="h-10 rounded-full border border-[#304975] bg-[#10203a] px-3 text-sm text-[#dce8ff]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            className="h-10 rounded-full border border-[#304975] bg-[#10203a] px-3 text-sm text-[#dce8ff]"
          >
            <option value="all">All Units</option>
            {data.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <select
            value={primaryFocus}
            onChange={(event) => setPrimaryFocus(event.target.value)}
            className="h-10 rounded-full border border-[#304975] bg-[#10203a] px-3 text-sm text-[#dce8ff]"
          >
            <option value="all">All Focus Areas</option>
            {data.focusOptions.map((focus) => (
              <option key={focus.key} value={focus.key}>
                {focus.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(normalizeSort(event.target.value))}
            className="h-10 rounded-full border border-[#304975] bg-[#10203a] px-3 text-sm text-[#dce8ff]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#355486] bg-[#132748] px-3 text-xs font-semibold text-[#d6e5ff]">
            <input
              type="checkbox"
              checked={followUpOnly}
              onChange={(event) => setFollowUpOnly(event.target.checked)}
              className="h-4 w-4"
            />
            Follow-Up Only
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <aside className={cn(PANEL, "p-3") }>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className={META_LABEL}>Care Plan Directory</p>
              <h2 className="mt-1 text-base font-bold text-white">Resident Plans</h2>
            </div>
            <Badge className="border-[#3f6297] bg-[#16325d] text-[#d8e6ff]">{filteredRows.length}</Badge>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-8 text-center">
              <p className="text-base font-semibold text-white">No care plans matched your filters.</p>
              <p className="mt-2 text-sm text-[#a9c1e7]">Adjust search and status filters to continue.</p>
            </div>
          ) : (
            <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
              {filteredRows.map((row) => (
                <button
                  key={row.residentId}
                  type="button"
                  onClick={() => {
                    setSelectedResidentId(row.residentId);
                    setActiveTab("overview");
                  }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selectedResidentId === row.residentId
                      ? "border-fuchsia-300/55 bg-fuchsia-500/12"
                      : "border-[#35517d] bg-[#10203a] hover:border-[#4f72ad]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.residentName}</p>
                      <p className="mt-1 text-[11px] text-[#a6bfe7]">
                        Room {row.room}
                        {row.unitName ? ` • ${row.unitName}` : ""}
                      </p>
                    </div>
                    <Badge className={cn("border", statusBadgeClass(row.displayStatus))}>{row.displayStatusLabel}</Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.primaryFocusLabels.slice(0, 2).map((focus) => (
                      <Badge key={`${row.residentId}-${focus}`} className="border-[#416396] bg-[#17345f] text-[10px] text-[#d9e8ff]">
                        {focus}
                      </Badge>
                    ))}
                    {row.followUpNeeded ? <Badge className="border-amber-300/45 bg-amber-500/14 text-[10px] text-amber-100">Follow-Up Needed</Badge> : null}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#9fb8de]">
                    <span>{formatRelativeReviewLabel(row.reviewDaysUntil)}</span>
                    <span>{trendLabel(row.trend)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={cn(PANEL, "p-4") }>
          {!selectedRow ? (
            <div className="rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-10 text-center">
              <p className="text-base font-semibold text-white">Select a resident to view care plan details.</p>
              <p className="mt-2 text-sm text-[#a9c1e7]">
                Focus areas, goals, interventions, participation signals, and review actions will appear here.
              </p>
            </div>
          ) : (
            <>
              <header className={cn(PANEL_SOFT, "p-4") }>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-300/45 bg-fuchsia-500/15 text-sm font-black text-fuchsia-100">
                      {selectedRow.residentFirstName.charAt(0)}
                      {selectedRow.residentLastName.charAt(0)}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-black text-white">{selectedRow.residentName}</h3>
                        {selectedRow.residentPreferredName ? (
                          <Badge className="border-violet-300/45 bg-violet-500/14 text-violet-100">Prefers {selectedRow.residentPreferredName}</Badge>
                        ) : null}
                        <Badge className="border-[#3f6298] bg-[#10213f] text-[#d3e4ff]">Room {selectedRow.room}</Badge>
                        <Badge className="border-[#3f6298] bg-[#10213f] text-[#d3e4ff]">{selectedRow.residentStatus.replaceAll("_", " ")}</Badge>
                      </div>

                      <p className="mt-2 text-sm text-[#b9cdf0]">
                        Primary focus: {selectedRow.primaryFocusLabels[0] ?? "Not set"} • Review: {selectedRow.reviewDueLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge className={cn("border", statusBadgeClass(selectedRow.displayStatus))}>{selectedRow.displayStatusLabel}</Badge>
                        <Badge className={cn("border", trendBadgeClass(selectedRow.trend))}>{trendLabel(selectedRow.trend)}</Badge>
                        {selectedRow.followUpNeeded ? (
                          <Badge className="border-amber-300/45 bg-amber-500/14 text-amber-100">Follow-Up Needed</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" className="h-8 rounded-full bg-[#25508d] px-3 text-xs font-semibold text-white hover:bg-[#2d5f9e]">
                      <Link href={selectedRow.carePlanId ? `/app/residents/${selectedRow.residentId}/care-plan/edit` : `/app/residents/${selectedRow.residentId}/care-plan/new`}>
                        Add Goal
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]">
                      <Link href={selectedRow.carePlanId ? `/app/residents/${selectedRow.residentId}/care-plan/edit` : `/app/residents/${selectedRow.residentId}/care-plan/new`}>
                        Add Intervention
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]">
                      <Link href={`/app/residents/${selectedRow.residentId}/care-plan/reviews/new`}>Mark Reviewed</Link>
                    </Button>
                    {selectedRow.carePlanId ? (
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]">
                        <Link href={`/api/care-plans/${selectedRow.carePlanId}/pdf`} target="_blank">
                          Print / Export
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <MiniMetric label="Focus Areas" value={selectedRow.focusCards.length} helper="active" />
                  <MiniMetric label="Goals" value={selectedRow.goals.length} helper="in plan" />
                  <MiniMetric label="Interventions" value={selectedRow.interventions.length} helper="assigned" />
                  <MiniMetric label="Participation" value={`${selectedRow.participation.participationPercent30d}%`} helper="last 30 days" />
                </div>
              </header>

              <div className="mt-4 flex flex-wrap gap-2">
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      activeTab === tab.id
                        ? "border-fuchsia-300/55 bg-fuchsia-500/17 text-fuchsia-100"
                        : "border-[#375888] bg-[#10203b] text-[#cbe0ff] hover:bg-[#163055]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                {activeTab === "overview" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <DetailPanel title="Care Plan Overview" icon={<Stethoscope className="h-4 w-4" />}>
                      <p className="text-sm text-[#c8dbf9]">
                        {selectedRow.carePlanId
                          ? "This resident has an active activity-focused care plan with linked goals and interventions."
                          : "No active care plan on file. Start a new care plan to organize focus areas, goals, and interventions."}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-[#c8dbf9]">
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">Status: {selectedRow.displayStatusLabel}</li>
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">Next review: {formatDate(selectedRow.nextReviewDate, timeZone)}</li>
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">Primary focus: {selectedRow.primaryFocusLabels[0] ?? "Not set"}</li>
                      </ul>
                    </DetailPanel>

                    <DetailPanel title="Quick Actions" icon={<Sparkles className="h-4 w-4" />}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <QuickAction href={`/app/residents/${selectedRow.residentId}/care-plan`} label="Open Full Care Plan" />
                        <QuickAction href={`/app/residents/${selectedRow.residentId}`} label="View Resident Profile" />
                        <QuickAction href={`/app/documentation?residentId=${selectedRow.residentId}`} label="Open Documentation" />
                        <QuickAction href={`/app/attendance?residentId=${selectedRow.residentId}`} label="Participation History" />
                        <QuickAction href={`/app/documentation/progress-notes/new?residentId=${selectedRow.residentId}`} label="Add Progress Note" />
                        <QuickAction href={`/app/documentation/one-to-one/new?residentId=${selectedRow.residentId}`} label="Add 1:1 Note" />
                      </div>
                    </DetailPanel>
                  </div>
                ) : null}

                {activeTab === "focus" ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {selectedRow.focusCards.length === 0 ? (
                      <EmptyPanel message="No focus areas added yet. Start a care plan to define resident needs." />
                    ) : (
                      selectedRow.focusCards.map((focus) => (
                        <article key={focus.key} className={cn(PANEL_SOFT, "p-3")}>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white">{focus.label}</h4>
                            <Badge className={cn("border", focus.status === "Needs Review" ? "border-amber-300/45 bg-amber-500/14 text-amber-100" : focus.status === "Archived" ? "border-zinc-500/45 bg-zinc-500/20 text-zinc-200" : "border-emerald-300/45 bg-emerald-500/14 text-emerald-100")}>{focus.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-[#bfd3f6]">{focus.summary}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-[#a3bce3]">
                            <span>Goals: {focus.goalCount}</span>
                            <span>•</span>
                            <span>Interventions: {focus.interventionCount}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}

                {activeTab === "goals" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white">Goals</h4>
                      <Button asChild size="sm" className="h-8 rounded-full bg-[#25508d] px-3 text-xs font-semibold text-white hover:bg-[#2d5f9e]">
                        <Link href={selectedRow.carePlanId ? `/app/residents/${selectedRow.residentId}/care-plan/edit` : `/app/residents/${selectedRow.residentId}/care-plan/new`}>
                          Add Goal
                        </Link>
                      </Button>
                    </div>
                    {selectedRow.goals.length === 0 ? (
                      <EmptyPanel message="No goals added yet for this resident care plan." />
                    ) : (
                      selectedRow.goals.map((goal) => (
                        <article key={goal.id} className={cn(PANEL_SOFT, "p-3")}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h5 className="text-sm font-semibold text-white">{goal.title}</h5>
                            <Badge className={cn("border", goal.status === "Needs Review" ? "border-amber-300/45 bg-amber-500/14 text-amber-100" : goal.status === "Archived" ? "border-zinc-500/45 bg-zinc-500/20 text-zinc-200" : "border-emerald-300/45 bg-emerald-500/14 text-emerald-100")}>{goal.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-[#c8dcfb]">{goal.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#a4bde3]">
                            <span className="rounded-md border border-[#35517f] bg-[#11203b] px-2 py-1">Focus: {goal.linkedFocus}</span>
                            <span className="rounded-md border border-[#35517f] bg-[#11203b] px-2 py-1">Target: {formatDate(goal.targetDateIso, timeZone)}</span>
                            <span className="rounded-md border border-[#35517f] bg-[#11203b] px-2 py-1">Interventions: {goal.interventionCount}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}

                {activeTab === "interventions" ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white">Interventions</h4>
                      <Button asChild size="sm" className="h-8 rounded-full bg-[#25508d] px-3 text-xs font-semibold text-white hover:bg-[#2d5f9e]">
                        <Link href={selectedRow.carePlanId ? `/app/residents/${selectedRow.residentId}/care-plan/edit` : `/app/residents/${selectedRow.residentId}/care-plan/new`}>
                          Add Intervention
                        </Link>
                      </Button>
                    </div>
                    {selectedRow.interventions.length === 0 ? (
                      <EmptyPanel message="No interventions added yet. Use quick library picks to build the plan fast." />
                    ) : (
                      <div className="space-y-2">
                        {selectedRow.interventions.map((intervention) => (
                          <article key={intervention.id} className={cn(PANEL_SOFT, "p-3") }>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="text-sm font-semibold text-white">{intervention.title}</h5>
                              <Badge className={cn("border", intervention.status === "Needs Review" ? "border-amber-300/45 bg-amber-500/14 text-amber-100" : intervention.status === "Archived" ? "border-zinc-500/45 bg-zinc-500/20 text-zinc-200" : "border-emerald-300/45 bg-emerald-500/14 text-emerald-100")}>{intervention.status}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-[#bfd3f6]">{intervention.description}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge className="border-[#3d5f94] bg-[#16345f] text-[#d8e6ff]">{intervention.type.replaceAll("_", " ")}</Badge>
                              {intervention.tags.map((tag) => (
                                <Badge key={`${intervention.id}-${tag}`} className="border-violet-300/45 bg-violet-500/14 text-violet-100">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    <article className={cn(PANEL_SOFT, "p-3") }>
                      <p className={META_LABEL}>Intervention Library</p>
                      <h5 className="mt-1 text-sm font-semibold text-white">Quick Picks</h5>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {CARE_PLAN_INTERVENTION_LIBRARY.slice(0, 10).map((template) => (
                          <div key={`${template.type}-${template.title}`} className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
                            <p className="text-xs font-semibold text-white">{template.title}</p>
                            <p className="mt-1 text-[11px] text-[#a6bfe7]">{template.type.replaceAll("_", " ")}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                ) : null}

                {activeTab === "signals" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <DetailPanel title="Linked Notes" icon={<NotebookPen className="h-4 w-4" />}>
                      {selectedRow.linkedNotes.length === 0 ? (
                        <p className="text-sm text-[#9eb7e0]">No linked note activity yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {selectedRow.linkedNotes.map((note) => (
                            <li key={note.id} className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-white">{note.kindLabel}</p>
                                <p className="text-[11px] text-[#a5bde4]">{formatDateTime(note.createdAtIso, timeZone)}</p>
                              </div>
                              <p className="mt-1 text-sm text-[#cadcf9]">{note.summary || "No summary text."}</p>
                              <p className="mt-1 text-[11px] text-[#a5bde4]">
                                Mood: {note.mood} • Response: {note.response}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </DetailPanel>

                    <DetailPanel title="Participation Signals" icon={<Users className="h-4 w-4" />}>
                      <ul className="space-y-2 text-sm text-[#c8dbf9]">
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
                          30-day participation: <span className="font-semibold text-white">{selectedRow.participation.participationPercent30d}%</span>
                        </li>
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
                          14-day participation: <span className="font-semibold text-white">{selectedRow.participation.participationPercent14d}%</span>
                        </li>
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
                          Refusals in last 30 days: <span className="font-semibold text-white">{selectedRow.participation.refused30d}</span>
                        </li>
                        <li className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
                          1:1 notes this month: <span className="font-semibold text-white">{selectedRow.documentationSignals.oneToOneNotes30d}</span>
                        </li>
                      </ul>
                    </DetailPanel>
                  </div>
                ) : null}

                {activeTab === "timeline" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white">Review Timeline & Upcoming Actions</h4>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]">
                        <Link href={`/app/residents/${selectedRow.residentId}/care-plan/reviews/new`}>Add Review</Link>
                      </Button>
                    </div>
                    {selectedRow.reviewTimeline.length === 0 ? (
                      <EmptyPanel message="No review timeline entries yet." />
                    ) : (
                      selectedRow.reviewTimeline.map((item) => (
                        <article key={item.id} className={cn(PANEL_SOFT, "p-3") }>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <Badge className={cn("border", item.urgency === "overdue" ? "border-rose-300/45 bg-rose-500/14 text-rose-100" : item.urgency === "due-soon" ? "border-amber-300/45 bg-amber-500/14 text-amber-100" : "border-[#3f6298] bg-[#10213f] text-[#d3e4ff]")}>{item.urgency === "overdue" ? "Overdue" : item.urgency === "due-soon" ? "Due Soon" : "Scheduled"}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-[#c8dbf9]">{item.summary}</p>
                          <p className="mt-1 text-[11px] text-[#a5bde4]">{formatDateTime(item.dateIso, timeZone)}</p>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Reviews Due</p>
            <h3 className="mt-1 text-base font-bold text-white">Upcoming Review Queue</h3>
            <div className="mt-3 space-y-2">
              {dueRows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#3b5787] px-3 py-2 text-xs text-[#99b3dd]">
                  You’re caught up on care plan reviews for now.
                </p>
              ) : (
                dueRows.map((row) => (
                  <button
                    key={`due-${row.residentId}`}
                    type="button"
                    onClick={() => setSelectedResidentId(row.residentId)}
                    className="block w-full rounded-lg border border-[#334e7b] bg-[#10203a] p-2.5 text-left transition hover:border-[#4f72ad]"
                  >
                    <p className="text-xs font-semibold text-white">{row.residentName} • Room {row.room}</p>
                    <p className="mt-1 text-[11px] text-[#a5bfe7]">{row.reviewDueLabel}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Follow-Up Board</p>
            <h3 className="mt-1 text-base font-bold text-white">Residents Requiring Action</h3>
            <div className="mt-3 space-y-2">
              {followUpRows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#3b5787] px-3 py-2 text-xs text-[#99b3dd]">
                  No urgent care-plan follow-ups right now.
                </p>
              ) : (
                followUpRows.map((row) => (
                  <button
                    key={`follow-up-${row.residentId}`}
                    type="button"
                    onClick={() => setSelectedResidentId(row.residentId)}
                    className="block w-full rounded-lg border border-[#334e7b] bg-[#10203a] p-2.5 text-left transition hover:border-[#4f72ad]"
                  >
                    <p className="text-xs font-semibold text-white">{row.residentName} • Room {row.room}</p>
                    <p className="mt-1 text-[11px] text-[#a5bfe7]">
                      {row.displayStatusLabel} • {trendLabel(row.trend)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className={cn(PANEL, "p-4") }>
            <p className={META_LABEL}>Quick Shortcuts</p>
            <div className="mt-3 grid gap-2">
              <QuickAction href="/app/residents" label="Open Residents" icon={<UserRound className="h-4 w-4" />} />
              <QuickAction href="/app/documentation" label="Open Documentation" icon={<FileText className="h-4 w-4" />} />
              <QuickAction href="/app/attendance" label="Open Attendance" icon={<Users className="h-4 w-4" />} />
              <QuickAction href="/app/documentation/uda" label="Open UDA Queue" icon={<FileClock className="h-4 w-4" />} />
              <QuickAction href="/app/documentation/mds" label="Open MDS Queue" icon={<ListChecks className="h-4 w-4" />} />
              <QuickAction href="/app/care-plans?status=NO_PLAN" label="Residents Needing New Plan" icon={<HandHeart className="h-4 w-4" />} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function MiniMetric({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-lg border border-[#35517f] bg-[#11203b] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9cb4de]">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
      <p className="text-[11px] text-[#a9bfe6]">{helper}</p>
    </div>
  );
}

function DetailPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className={cn(PANEL_SOFT, "p-3")}>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#3c5e93] bg-[#17345f] text-[#d8e7ff]">
          {icon}
        </span>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      {children}
    </article>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between gap-2 rounded-xl border border-[#355686] bg-[#14305a] px-3 py-2 text-sm font-semibold text-[#d9e7ff] transition hover:border-[#4e73ae] hover:bg-[#18386b]"
    >
      <span className="inline-flex items-center gap-2">
        {icon ?? <ArrowRight className="h-4 w-4" aria-hidden />}
        {label}
      </span>
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#3f5f92] bg-[#10223f] p-6 text-center">
      <p className="text-sm text-[#a9c1e7]">{message}</p>
    </div>
  );
}
