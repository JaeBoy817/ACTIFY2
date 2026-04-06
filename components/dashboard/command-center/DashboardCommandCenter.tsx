"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardPenLine,
  FileClock,
  FileText,
  Filter,
  LayoutDashboard,
  Plus,
  Search,
  TrendingUp,
  UserRound,
  Users,
  UserSearch
} from "lucide-react";

import type {
  DashboardCommandCenterSummary,
  DashboardResidentFollowUpBoardItem
} from "@/lib/dashboard/getDashboardCommandCenterSummary";
import { cn } from "@/lib/utils";

type DashboardRange = "today" | "week" | "month";
type FollowUpReasonFilter =
  | "all"
  | "one-to-one"
  | "participation"
  | "documentation"
  | "care-plan"
  | "new-admission";
type FollowUpPriorityFilter = "all" | "critical" | "high" | "medium" | "low";

type DueSoonRow = {
  id: string;
  name: string;
  type: string;
  dueLabel: string;
  urgency: "overdue" | "today" | "soon";
  href: string;
  context?: string;
};

type ParticipationSeries = {
  labels: string[];
  values: number[];
  valueLabel: string;
  contextLabel: string;
};

export function DashboardCommandCenter({ summary }: { summary: DashboardCommandCenterSummary }) {
  const router = useRouter();
  const [range, setRange] = useState<DashboardRange>("today");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<FollowUpPriorityFilter>("all");
  const [reasonFilter, setReasonFilter] = useState<FollowUpReasonFilter>("all");
  const [selectedDayKey, setSelectedDayKey] = useState(() => toLocalDateKey(new Date()));

  const dayStrip = useMemo(() => {
    const base = startOfLocalDay(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const offset = index - 3;
      const date = addLocalDays(base, offset);
      return {
        key: toLocalDateKey(date),
        shortDay: date.toLocaleDateString(undefined, { weekday: "short" }),
        dayNumber: date.toLocaleDateString(undefined, { day: "numeric" }),
        fullLabel: date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric"
        }),
        offset
      };
    });
  }, []);

  const todayKey = toLocalDateKey(new Date());
  const isTodaySelected = selectedDayKey === todayKey;

  const dueSoonRows = useMemo(() => buildDueSoonRows(summary), [summary]);
  const documentationStatus = useMemo(() => {
    const completed =
      summary.notesHub.notesCreatedToday +
      summary.notesHub.oneToOneCreatedToday +
      summary.base.dailyMetrics.attendanceSessionsCompleted;
    const dueSoon = Math.max(
      0,
      summary.base.oneToOne.dueTodayCount + Math.max(0, summary.notesHub.groupDocumentationMissingCount)
    );
    const overdue = Math.max(0, summary.hero.overdueItemsCount);
    const pendingReview = summary.residentAttention
      .filter((group) => group.key === "follow-up" || group.key === "resistant-trend")
      .reduce((sum, group) => sum + group.items.length, 0);

    const total = completed + dueSoon + overdue + pendingReview;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      dueSoon,
      overdue,
      pendingReview,
      total,
      completionPercent
    };
  }, [summary]);

  const participationSeries = useMemo(() => buildParticipationSeries(summary, range), [summary, range]);

  const topStats = useMemo(() => {
    const notesCompletedThisWeek = Math.max(
      summary.notesHub.recentActivity.length,
      summary.notesHub.notesCreatedToday + summary.notesHub.oneToOneCreatedToday
    );
    const dueSoonCount = dueSoonRows.filter((item) => item.urgency !== "soon").length + dueSoonRows.length;
    const openTodayActivities = summary.timeline.filter(
      (item) => !item.attendanceCompleted || !item.documentationCompleted
    ).length;

    return [
      {
        key: "participation",
        label: "Today’s Participation",
        value: `${Math.round(summary.base.analytics.today.participationPercent)}%`,
        trend:
          summary.momentum.weeklyParticipationTrend >= 0
            ? `+${summary.momentum.weeklyParticipationTrend}% vs last week`
            : `${summary.momentum.weeklyParticipationTrend}% vs last week`,
        context: `${summary.base.analytics.today.residentsParticipated} residents engaged`,
        icon: Users,
        accent: "from-cyan-400/25 via-blue-500/20 to-indigo-500/25",
        border: "border-cyan-400/35"
      },
      {
        key: "activities",
        label: "Activities Scheduled Today",
        value: String(summary.hero.scheduledTodayCount),
        trend: `${openTodayActivities} still need follow-up`,
        context: `${summary.timeline.filter((item) => item.isUpcoming || item.isInProgress).length} upcoming or in progress`,
        icon: CalendarDays,
        accent: "from-violet-400/25 via-indigo-500/20 to-blue-500/25",
        border: "border-violet-400/35"
      },
      {
        key: "due-soon",
        label: "Documentation Due Soon",
        value: String(dueSoonCount),
        trend: `${summary.hero.overdueItemsCount} overdue right now`,
        context: "UDA, MDS, 1:1, and follow-up tasks",
        icon: FileClock,
        accent: "from-amber-300/25 via-orange-500/20 to-rose-500/20",
        border: "border-amber-300/35"
      },
      {
        key: "notes-week",
        label: "Notes Completed This Week",
        value: String(notesCompletedThisWeek),
        trend: `${summary.notesHub.notesCreatedToday} completed today`,
        context: "Recent progress and 1:1 documentation",
        icon: ClipboardPenLine,
        accent: "from-emerald-400/25 via-teal-500/20 to-cyan-500/20",
        border: "border-emerald-400/35"
      }
    ];
  }, [summary, dueSoonRows]);

  const filteredFollowUpRows = useMemo(() => {
    return summary.residentFollowUpBoard.items.filter((item) => {
      if (priorityFilter !== "all" && item.priorityLevel !== priorityFilter) {
        return false;
      }

      if (reasonFilter !== "all" && getFollowUpReasonGroup(item) !== reasonFilter) {
        return false;
      }

      if (!followUpQuery.trim()) {
        return true;
      }

      const query = followUpQuery.trim().toLowerCase();
      const searchable = [
        item.name,
        item.room,
        item.unit,
        item.primaryReason,
        item.secondaryReasons.join(" "),
        item.recencyContext.join(" "),
        item.status
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [summary.residentFollowUpBoard.items, followUpQuery, priorityFilter, reasonFilter]);

  const rightRailUpcoming = useMemo(() => {
    const rows: Array<{ id: string; label: string; detail: string; href: string; tone: "blue" | "violet" | "amber" | "emerald" }> = [];

    if (summary.upcoming.nextOuting) {
      rows.push({
        id: "next-outing",
        label: "Next outing",
        detail: `${summary.upcoming.nextOuting.title} · ${summary.upcoming.nextOuting.when}`,
        href: summary.upcoming.nextOuting.href,
        tone: "blue"
      });
    }

    if (summary.upcoming.tomorrowActivityCount > 0) {
      rows.push({
        id: "tomorrow-activities",
        label: "Tomorrow",
        detail: `${summary.upcoming.tomorrowActivityCount} activities scheduled`,
        href: "/app/calendar?view=day",
        tone: "violet"
      });
    }

    if (summary.upcoming.reportDueIndicator.daysRemaining <= 7) {
      rows.push({
        id: "report-due",
        label: "Monthly report",
        detail:
          summary.upcoming.reportDueIndicator.daysRemaining <= 0
            ? "Due now"
            : `Due in ${summary.upcoming.reportDueIndicator.daysRemaining} day${summary.upcoming.reportDueIndicator.daysRemaining === 1 ? "" : "s"}`,
        href: summary.upcoming.reportDueIndicator.href,
        tone: "amber"
      });
    }

    const topFollowUp = summary.residentFollowUpBoard.items[0];
    if (topFollowUp) {
      rows.push({
        id: `follow-up-${topFollowUp.id}`,
        label: "Resident follow-up",
        detail: `${topFollowUp.name} · ${topFollowUp.primaryReason}`,
        href: topFollowUp.suggestedAction.href,
        tone: "emerald"
      });
    }

    return rows.slice(0, 4);
  }, [summary]);

  const onSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = workspaceSearch.trim();
    if (!query) return;
    router.push(`/app/residents?search=${encodeURIComponent(query)}`);
  };

  const selectedDay = dayStrip.find((day) => day.key === selectedDayKey) ?? dayStrip[3];

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#050b18] p-3 md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.18),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.22),transparent_62%),radial-gradient(840px_360px_at_38%_100%,rgba(59,130,246,0.16),transparent_72%)]" />
      <div className="relative z-10 space-y-4">
        <section className="rounded-2xl border border-[#2a3e64] bg-[#0a1328]/95 p-4 shadow-[0_24px_60px_-38px_rgba(37,99,235,0.6)] md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#93acd7]">Dashboard</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Activity Command Center</h1>
              <p className="mt-2 text-sm text-[#9cb3d9]">
                {summary.hero.facilityName} · {summary.hero.dayOfWeek}, {summary.hero.fullDate}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRange("today")}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  range === "today"
                    ? "border-cyan-300/45 bg-cyan-500/20 text-cyan-100"
                    : "border-[#39557f] bg-[#101d37] text-[#c5d7f7] hover:border-[#557bb1]"
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setRange("week")}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  range === "week"
                    ? "border-violet-300/45 bg-violet-500/20 text-violet-100"
                    : "border-[#39557f] bg-[#101d37] text-[#c5d7f7] hover:border-[#557bb1]"
                )}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setRange("month")}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                  range === "month"
                    ? "border-blue-300/45 bg-blue-500/20 text-blue-100"
                    : "border-[#39557f] bg-[#101d37] text-[#c5d7f7] hover:border-[#557bb1]"
                )}
              >
                Month
              </button>
              <Link
                href="/app/notifications"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#3d5e8c] bg-[#112344] px-3 text-xs font-semibold text-[#d6e5ff] transition hover:border-[#5a82be]"
              >
                <Bell className="h-3.5 w-3.5" />
                Alerts
              </Link>
              <Link
                href="/app/calendar?quickAdd=1"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/75 to-blue-600/80 px-3 text-xs font-semibold text-white transition hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                Quick Add
              </Link>
            </div>
          </div>

          <form onSubmit={onSearchSubmit} className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#385382] bg-[#0f1c35] px-3 text-sm text-[#d2e2ff] focus-within:border-[#63b8ff]">
              <Search className="h-4 w-4 text-[#98b1dc]" />
              <input
                value={workspaceSearch}
                onChange={(event) => setWorkspaceSearch(event.target.value)}
                placeholder="Search residents, notes, rooms, or activities..."
                className="h-full w-full bg-transparent text-sm text-white placeholder:text-[#88a0cb] focus:outline-none"
                aria-label="Search workspace"
              />
            </label>
            <Link
              href="/app/analytics"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#3d5e8c] bg-[#112344] px-3 text-sm font-semibold text-[#d6e5ff] transition hover:border-[#5a82be]"
            >
              <CalendarRange className="h-4 w-4" />
              Date Filters
            </Link>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/45 bg-cyan-500/20 px-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/60"
            >
              <Filter className="h-4 w-4" />
              Search
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea8d5]">Welcome</p>
              <h2 className="mt-1 text-2xl font-black text-white md:text-[2rem]">Here’s what needs attention today.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9ab2d9]">{summary.hero.smartSummary}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricChip label="Active census" value={summary.hero.censusCount} tone="blue" />
              <MetricChip label="1:1 needed" value={summary.hero.oneToOneNeededThisMonthCount} tone="amber" />
              <MetricChip label="Overdue" value={summary.hero.overdueItemsCount} tone="rose" />
              <MetricChip label="Scheduled today" value={summary.hero.scheduledTodayCount} tone="emerald" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          {topStats.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.key}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-[#0d172f] p-4",
                  "shadow-[0_22px_45px_-38px_rgba(37,99,235,0.65)]",
                  card.border
                )}
              >
                <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", card.accent)} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d7e6ff]">{card.label}</p>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-black text-white">{card.value}</p>
                  <p className="mt-1 text-xs font-semibold text-[#e8f2ff]">{card.trend}</p>
                  <p className="mt-2 text-xs text-[#d2e2ff]/90">{card.context}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_360px]">
          <div className="space-y-4">
            <div className="grid gap-4 2xl:grid-cols-[1.5fr_1fr]">
              <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">
                      Participation Snapshot
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-white">{participationSeries.valueLabel}</h3>
                  </div>
                  <Link
                    href="/app/analytics"
                    className="inline-flex items-center gap-1 rounded-full border border-[#3b5b8b] bg-[#112344] px-3 py-1 text-xs font-semibold text-[#d6e5ff] transition hover:border-[#5a82be]"
                  >
                    View Analytics
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="rounded-xl border border-[#2a3b5d] bg-[#0a1225] p-3">
                  <ParticipationLineChart labels={participationSeries.labels} values={participationSeries.values} />
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <KpiMini label="Residents Engaged" value={summary.base.analytics.today.residentsParticipated} />
                  <KpiMini label="Group vs 1:1" value={`${summary.base.dailyMetrics.programsToday} / ${summary.base.dailyMetrics.oneToOneCompletedToday}`} />
                  <KpiMini label="Range Context" value={participationSeries.contextLabel} />
                </div>
              </article>

              <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Documentation Status</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Completion + Due Mix</h3>
                </div>

                <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)]">
                  <DocumentationRing status={documentationStatus} />
                  <div className="space-y-2">
                    <LegendRow label="Completed" value={documentationStatus.completed} tone="completed" />
                    <LegendRow label="Due soon" value={documentationStatus.dueSoon} tone="dueSoon" />
                    <LegendRow label="Overdue" value={documentationStatus.overdue} tone="overdue" />
                    <LegendRow label="Pending review" value={documentationStatus.pendingReview} tone="pending" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#90a8d3]">
                  Status reflects notes, attendance documentation, and follow-up load for today.
                </p>
              </article>
            </div>

            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Resident Follow-Up Board</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Who needs attention next</h3>
                  <p className="mt-1 text-sm text-[#95afd8]">
                    Ranked using 1:1 status, participation trends, note signals, and documentation gaps.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={summary.residentFollowUpBoard.viewAllHref}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-[#3b5b8b] bg-[#112344] px-3 text-xs font-semibold text-[#d6e5ff] transition hover:border-[#5a82be]"
                  >
                    See All
                  </Link>
                  <Link
                    href="/app/residents"
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-cyan-300/45 bg-cyan-500/20 px-3 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/60"
                  >
                    Open Residents
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_170px_180px]">
                <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#385382] bg-[#0f1c35] px-3 text-sm text-[#d2e2ff]">
                  <Search className="h-4 w-4 text-[#98b1dc]" />
                  <input
                    value={followUpQuery}
                    onChange={(event) => setFollowUpQuery(event.target.value)}
                    placeholder="Search resident, room, or reason..."
                    className="h-full w-full bg-transparent text-sm text-white placeholder:text-[#88a0cb] focus:outline-none"
                    aria-label="Search resident follow-up board"
                  />
                </label>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as FollowUpPriorityFilter)}
                  className="h-10 rounded-xl border border-[#3a5681] bg-[#112344] px-3 text-sm text-[#d6e5ff] focus:border-cyan-300/70 focus:outline-none"
                  aria-label="Filter by priority"
                >
                  <option value="all">All priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={reasonFilter}
                  onChange={(event) => setReasonFilter(event.target.value as FollowUpReasonFilter)}
                  className="h-10 rounded-xl border border-[#3a5681] bg-[#112344] px-3 text-sm text-[#d6e5ff] focus:border-cyan-300/70 focus:outline-none"
                  aria-label="Filter by reason"
                >
                  <option value="all">All triggers</option>
                  <option value="one-to-one">Missing 1:1</option>
                  <option value="participation">Participation trend</option>
                  <option value="documentation">Documentation issues</option>
                  <option value="care-plan">Care plan signal</option>
                  <option value="new-admission">New admission</option>
                </select>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-[#2c3f64] bg-[#0b152b]">
                <table className="min-w-[920px] w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#253a60] text-left text-[11px] uppercase tracking-[0.14em] text-[#8ba6d3]">
                      <th className="px-3 py-2 font-semibold">Resident</th>
                      <th className="px-3 py-2 font-semibold">Room</th>
                      <th className="px-3 py-2 font-semibold">Trigger / Reason</th>
                      <th className="px-3 py-2 font-semibold">Last Activity / Note</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                      <th className="px-3 py-2 font-semibold">Due</th>
                      <th className="px-3 py-2 font-semibold">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFollowUpRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#90a7d1]">
                          No residents match these filters. Try clearing search or changing priority.
                        </td>
                      </tr>
                    ) : null}
                    {filteredFollowUpRows.map((row) => (
                      <FollowUpRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Due Soon</p>
                    <h3 className="mt-1 text-lg font-bold text-white">Time-sensitive tasks</h3>
                  </div>
                  <Link
                    href="/app/documentation"
                    className="inline-flex items-center gap-1 rounded-full border border-[#3b5b8b] bg-[#112344] px-3 py-1 text-xs font-semibold text-[#d6e5ff]"
                  >
                    Open Docs
                  </Link>
                </div>

                {dueSoonRows.length === 0 ? (
                  <EmptyState
                    title="Everything is caught up for now."
                    copy="New due and overdue documentation items will appear here."
                  />
                ) : (
                  <ul className="space-y-2">
                    {dueSoonRows.slice(0, 7).map((row) => (
                      <li key={row.id} className="rounded-xl border border-[#2c3f64] bg-[#0d1832] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{row.name}</p>
                            <p className="mt-0.5 text-xs text-[#94add7]">{row.type}</p>
                            <p className="mt-1 text-xs text-[#9eb6de]">{row.context ?? "Review and complete documentation workflow."}</p>
                          </div>
                          <StatusBadge urgency={row.urgency}>{row.dueLabel}</StatusBadge>
                        </div>
                        <div className="mt-2">
                          <Link href={row.href} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                            Open
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Recent Documentation</p>
                    <h3 className="mt-1 text-lg font-bold text-white">Latest activity updates</h3>
                  </div>
                  <Link
                    href="/app/documentation/overview"
                    className="inline-flex items-center gap-1 rounded-full border border-[#3b5b8b] bg-[#112344] px-3 py-1 text-xs font-semibold text-[#d6e5ff]"
                  >
                    View All
                  </Link>
                </div>

                {summary.notesHub.recentActivity.length === 0 ? (
                  <EmptyState
                    title="No recent documentation yet."
                    copy="Progress notes, 1:1 notes, and updates will appear here as your team charts."
                  />
                ) : (
                  <ul className="space-y-2">
                    {summary.notesHub.recentActivity.slice(0, 7).map((item) => (
                      <li key={item.id} className="rounded-xl border border-[#2c3f64] bg-[#0d1832] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.residentName} · Room {item.room}</p>
                            <p className="mt-1 text-xs text-[#93abd3]">{item.createdAt}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                              item.type === "ONE_TO_ONE"
                                ? "border-amber-300/50 bg-amber-500/18 text-amber-100"
                                : "border-violet-300/50 bg-violet-500/18 text-violet-100"
                            )}
                          >
                            {item.type === "ONE_TO_ONE" ? "1:1 Note" : "Progress Note"}
                          </span>
                        </div>
                        <Link href={item.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                          Open entry
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>

            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Quick Create</p>
                  <h3 className="mt-1 text-lg font-bold text-white">Take action fast</h3>
                </div>
                <Link
                  href="/app/dashboard/activity-feed"
                  className="inline-flex items-center gap-1 rounded-full border border-[#3b5b8b] bg-[#112344] px-3 py-1 text-xs font-semibold text-[#d6e5ff]"
                >
                  Activity Feed
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {summary.quickActions.slice(0, 8).map((action) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="group inline-flex items-center justify-between rounded-xl border border-[#2d4268] bg-[#0f1d37] px-3 py-2.5 text-sm text-[#d8e7ff] transition hover:-translate-y-0.5 hover:border-[#5b84bf]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <QuickActionIcon module={action.module} />
                      {action.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#9db5dd] transition group-hover:text-cyan-200" />
                  </Link>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Today Panel</p>
                  <h3 className="mt-1 text-base font-bold text-white">Daily schedule and upcoming</h3>
                </div>
                <Link
                  href="/app/calendar"
                  className="inline-flex items-center gap-1 rounded-full border border-[#3b5b8b] bg-[#112344] px-3 py-1 text-xs font-semibold text-[#d6e5ff]"
                >
                  Calendar
                </Link>
              </div>

              <div className="grid grid-cols-7 gap-1 rounded-xl border border-[#2b3f64] bg-[#0d1932] p-2">
                {dayStrip.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDayKey(day.key)}
                    className={cn(
                      "rounded-lg border px-1 py-1.5 text-center transition",
                      day.key === selectedDayKey
                        ? "border-cyan-300/55 bg-cyan-500/22 text-cyan-100"
                        : "border-[#334f7d] bg-[#12213d] text-[#a5badd] hover:border-[#5a84be]"
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">{day.shortDay}</p>
                    <p className="mt-0.5 text-xs font-bold">{day.dayNumber}</p>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-[#2b3f64] bg-[#0d1932] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#93acd8]">{selectedDay.fullLabel}</p>

                {!isTodaySelected ? (
                  <div className="mt-2 space-y-2 text-sm text-[#a5badf]">
                    <p>This quick panel shows detailed data for today.</p>
                    <Link
                      href={`/app/calendar/day/${selectedDay.key}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[#476da4] bg-[#13305a] px-3 py-1 text-xs font-semibold text-[#d8e8ff]"
                    >
                      Open selected day
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : null}

                {isTodaySelected && summary.timeline.length === 0 ? (
                  <div className="mt-2">
                    <EmptyState
                      title="No activities scheduled yet."
                      copy="Add one to start planning the day."
                    />
                  </div>
                ) : null}

                {isTodaySelected && summary.timeline.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {summary.timeline.slice(0, 5).map((item) => (
                      <li key={item.id} className="rounded-lg border border-[#29406a] bg-[#112344] p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <p className="mt-0.5 text-xs text-[#9db5dd]">{item.timeLabel} · {item.location}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                              item.attendanceCompleted
                                ? "border-emerald-300/45 bg-emerald-500/20 text-emerald-100"
                                : "border-amber-300/45 bg-amber-500/20 text-amber-100"
                            )}
                          >
                            {item.attendanceCompleted ? "Logged" : "Open"}
                          </span>
                        </div>
                        <Link href={item.openHref} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                          Open activity
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fa9d6]">Upcoming</p>
                {rightRailUpcoming.length === 0 ? (
                  <EmptyState
                    title="No upcoming reminders right now."
                    copy="Upcoming activities and due items will appear here."
                  />
                ) : (
                  rightRailUpcoming.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start justify-between gap-2 rounded-xl border border-[#2c3f64] bg-[#0d1832] p-3 transition hover:border-[#567fb8]"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9fb6de]">{item.label}</p>
                        <p className="mt-1 text-sm text-white">{item.detail}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 text-[#9db6dd]" />
                    </Link>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-[#2a3d62] bg-[#0b1428]/95 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fa9d6]">Engagement Highlights</p>
              <h3 className="mt-1 text-base font-bold text-white">Quick signal summary</h3>

              <div className="mt-3 space-y-2">
                <HighlightRow
                  label="Residents engaged today"
                  value={summary.base.analytics.today.residentsParticipated}
                  hint={`${summary.base.analytics.today.totalAttendedResidents} attendance records`}
                  tone="blue"
                />
                <HighlightRow
                  label="1:1 completion this month"
                  value={`${summary.momentum.monthlyOneOnOneCompletionRate}%`}
                  hint={`${summary.base.oneToOne.residentsWithNoteThisMonth}/${summary.base.oneToOne.totalEligibleResidents} residents`}
                  tone="amber"
                />
                <HighlightRow
                  label="Low participation surfaced"
                  value={summary.residentAttention.find((group) => group.key === "low-participation")?.items.length ?? 0}
                  hint="Residents to review this week"
                  tone="violet"
                />
                <HighlightRow
                  label="Documentation completion"
                  value={`${summary.momentum.documentationCompletionRate}%`}
                  hint="Current month progress"
                  tone="emerald"
                />
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
}

function FollowUpRow({ row }: { row: DashboardResidentFollowUpBoardItem }) {
  const dueLabel = getDueLabel(row);
  return (
    <tr className="border-t border-[#23385d] text-sm text-[#d8e7ff]">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#3f5f93] bg-[#14305a] text-[11px] font-bold">
            {row.avatarInitials}
          </span>
          <div>
            <p className="font-semibold text-white">{row.name}</p>
            <p className="text-xs text-[#99b1d9]">{row.unit}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-[#a5bde2]">Room {row.room}</td>
      <td className="px-3 py-2.5">
        <p className="text-sm text-white">{row.primaryReason}</p>
        {row.secondaryReasons.length > 0 ? (
          <p className="mt-0.5 text-xs text-[#97afd8]">{row.secondaryReasons.join(" · ")}</p>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-xs text-[#9cb3db]">
        {row.recencyContext[0] ?? "No recent context"}
      </td>
      <td className="px-3 py-2.5">
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", priorityBadgeClasses(row.priorityLevel))}>
          {row.priorityLevel}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge urgency={dueLabel.urgency}>{dueLabel.label}</StatusBadge>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Link
            href={row.suggestedAction.href}
            className="inline-flex items-center rounded-full border border-cyan-300/45 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-200/60"
          >
            {row.suggestedAction.label}
          </Link>
          {row.secondaryAction ? (
            <Link
              href={row.secondaryAction.href}
              className="inline-flex items-center rounded-full border border-[#3e5f90] bg-[#122646] px-2.5 py-1 text-[11px] font-semibold text-[#d6e5ff] transition hover:border-[#628bca]"
            >
              {row.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function ParticipationLineChart({ labels, values }: { labels: string[]; values: number[] }) {
  const width = 640;
  const height = 180;
  const padding = 20;
  const maxValue = Math.max(100, ...values);
  const safeValues = values.length === 0 ? [0] : values;
  const stepX = safeValues.length > 1 ? (width - padding * 2) / (safeValues.length - 1) : 0;

  const points = safeValues.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)},${(height - padding).toFixed(2)} L ${points[0].x.toFixed(2)},${(height - padding).toFixed(2)} Z`
    : "";

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Participation trend chart" className="h-44 w-full">
        <defs>
          <linearGradient id="actify-participation-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.08)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((tick) => {
          const y = height - padding - tick * (height - padding * 2);
          return <line key={tick} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(132,157,197,0.25)" strokeDasharray="4 4" />;
        })}
        {areaPath ? <path d={areaPath} fill="url(#actify-participation-area)" /> : null}
        {linePath ? <path d={linePath} fill="none" stroke="rgba(125,211,252,0.95)" strokeWidth={3} strokeLinecap="round" /> : null}
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill="rgba(224,242,254,0.95)" stroke="rgba(14,116,144,0.9)" strokeWidth={2} />
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center sm:grid-cols-7">
        {labels.map((label, index) => (
          <div key={`${label}-${index}`} className="rounded-md bg-[#101f3c] px-1.5 py-1 text-[11px] text-[#a8bee1]">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentationRing({
  status
}: {
  status: {
    completed: number;
    dueSoon: number;
    overdue: number;
    pendingReview: number;
    total: number;
    completionPercent: number;
  };
}) {
  const completedPercent = status.total > 0 ? (status.completed / status.total) * 100 : 0;
  const dueSoonPercent = status.total > 0 ? (status.dueSoon / status.total) * 100 : 0;
  const overduePercent = status.total > 0 ? (status.overdue / status.total) * 100 : 0;

  const gradient = status.total > 0
    ? `conic-gradient(
      rgba(74,222,128,0.9) 0 ${completedPercent}%,
      rgba(245,158,11,0.9) ${completedPercent}% ${completedPercent + dueSoonPercent}%,
      rgba(248,113,113,0.9) ${completedPercent + dueSoonPercent}% ${completedPercent + dueSoonPercent + overduePercent}%,
      rgba(167,139,250,0.9) ${completedPercent + dueSoonPercent + overduePercent}% 100%
    )`
    : "conic-gradient(rgba(51,65,85,0.8) 0 100%)";

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative h-36 w-36 rounded-full border border-[#30476f]"
        style={{ background: gradient }}
      >
        <div className="absolute inset-[14px] rounded-full border border-[#29416b] bg-[#0a1224]">
          <div className="flex h-full w-full flex-col items-center justify-center text-center">
            <p className="text-2xl font-black text-white">{status.completionPercent}%</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8ea7d2]">complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "completed" | "dueSoon" | "overdue" | "pending";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#30466f] bg-[#0e1a33] px-2.5 py-2">
      <span className="inline-flex items-center gap-2 text-sm text-[#d6e5ff]">
        <span className={cn("h-2.5 w-2.5 rounded-full", legendDotClass(tone))} />
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function HighlightRow({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: "blue" | "amber" | "violet" | "emerald" }) {
  return (
    <div className="rounded-xl border border-[#2d4268] bg-[#0f1c36] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#97aed7]">{label}</p>
          <p className={cn("mt-1 text-2xl font-black", highlightValueToneClass(tone))}>{value}</p>
          <p className="mt-1 text-xs text-[#9db5dc]">{hint}</p>
        </div>
        <TrendingUp className={cn("h-4 w-4", highlightIconToneClass(tone))} />
      </div>
    </div>
  );
}

function QuickActionIcon({
  module
}: {
  module: DashboardCommandCenterSummary["quickActions"][number]["module"];
}) {
  if (module === "calendar") return <CalendarDays className="h-4 w-4 text-cyan-200" />;
  if (module === "notes") return <FileText className="h-4 w-4 text-violet-200" />;
  if (module === "oneToOne") return <UserRound className="h-4 w-4 text-amber-200" />;
  if (module === "attendance") return <ClipboardCheck className="h-4 w-4 text-sky-200" />;
  if (module === "residents") return <UserSearch className="h-4 w-4 text-indigo-200" />;
  if (module === "carePlan") return <ClipboardPenLine className="h-4 w-4 text-emerald-200" />;
  if (module === "reports") return <LayoutDashboard className="h-4 w-4 text-fuchsia-200" />;
  return <Activity className="h-4 w-4 text-[#c8daf9]" />;
}

function MetricChip({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: "blue" | "amber" | "rose" | "emerald";
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", metricChipToneClass(tone))}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#30466f] bg-[#0e1a33] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#93aad4]">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#3a5384] bg-[#0e1a33] px-3 py-4 text-sm text-[#9bb3da]">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs">{copy}</p>
    </div>
  );
}

function StatusBadge({ children, urgency }: { children: React.ReactNode; urgency: "overdue" | "today" | "soon" }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", dueStatusClass(urgency))}>
      {children}
    </span>
  );
}

function buildParticipationSeries(summary: DashboardCommandCenterSummary, range: DashboardRange): ParticipationSeries {
  if (range === "today") {
    if (summary.timeline.length === 0) {
      return {
        labels: ["9a", "11a", "1p", "3p", "5p"],
        values: [0, 0, 0, 0, 0],
        valueLabel: "No participation points yet today",
        contextLabel: "Today"
      };
    }

    const labels = summary.timeline.map((item) => item.timeLabel.split(" - ")[0] ?? item.timeLabel);
    const values = summary.timeline.map((item) => {
      if (item.attendanceCompleted && item.documentationCompleted) return 88;
      if (item.attendanceCompleted) return 72;
      if (item.isInProgress) return 58;
      return 36;
    });

    return {
      labels,
      values,
      valueLabel: `${Math.round(summary.base.analytics.today.participationPercent)}% active participation`,
      contextLabel: "Today"
    };
  }

  if (range === "week") {
    const base = clamp(summary.base.analytics.today.participationPercent, 0, 100);
    const trend = summary.momentum.weeklyParticipationTrend;
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const values = labels.map((_, index) =>
      clamp(Math.round(base + ((index - 3) * trend) / 11 + (index % 2 === 0 ? 3 : -2)), 8, 100)
    );

    return {
      labels,
      values,
      valueLabel: `${trend >= 0 ? "+" : ""}${trend}% vs prior week`,
      contextLabel: "Past 7 days"
    };
  }

  const monthBase = clamp(summary.base.analytics.month.averageDailyPercent, 0, 100);
  const completionMix = clamp(summary.momentum.documentationCompletionRate, 0, 100);
  const oneToOneRate = clamp(summary.momentum.monthlyOneOnOneCompletionRate, 0, 100);
  const labels = ["W1", "W2", "W3", "W4"];
  const values = [
    clamp(Math.round(monthBase * 0.9), 8, 100),
    clamp(Math.round((monthBase + completionMix) / 2), 8, 100),
    clamp(Math.round((monthBase + oneToOneRate) / 2), 8, 100),
    clamp(Math.round((monthBase + completionMix + oneToOneRate) / 3), 8, 100)
  ];

  return {
    labels,
    values,
    valueLabel: `${Math.round(summary.base.analytics.month.participationPercent)}% month-to-date`,
    contextLabel: "Current month"
  };
}

function buildDueSoonRows(summary: DashboardCommandCenterSummary): DueSoonRow[] {
  const rows: DueSoonRow[] = [];

  const carePlanGroup = summary.residentAttention.find((group) => group.key === "care-plan-overdue");
  for (const item of carePlanGroup?.items ?? []) {
    rows.push({
      id: `due-careplan-${item.id}`,
      name: `${item.name} · Room ${item.room}`,
      type: "Care Plan Review",
      dueLabel: "Overdue",
      urgency: "overdue",
      href: item.primaryAction.href,
      context: item.reason
    });
  }

  const oneToOneGroup = summary.residentAttention.find((group) => group.key === "needs-one-on-one");
  for (const item of oneToOneGroup?.items ?? []) {
    rows.push({
      id: `due-1on1-${item.id}`,
      name: `${item.name} · Room ${item.room}`,
      type: "1:1 Note",
      dueLabel: "Due this month",
      urgency: "soon",
      href: item.primaryAction.href,
      context: item.reason
    });
  }

  if (summary.notesHub.groupDocumentationMissingCount > 0) {
    rows.push({
      id: "due-group-docs",
      name: "Group documentation",
      type: "Progress Notes",
      dueLabel: "Due today",
      urgency: "today",
      href: "/app/documentation/progress-notes/new",
      context: `${summary.notesHub.groupDocumentationMissingCount} sessions still need documentation.`
    });
  }

  if (summary.upcoming.reportDueIndicator.daysRemaining <= 0) {
    rows.push({
      id: "due-report-now",
      name: "Monthly report",
      type: "Reporting",
      dueLabel: "Overdue",
      urgency: "overdue",
      href: summary.upcoming.reportDueIndicator.href,
      context: `${summary.upcoming.reportDueIndicator.label} · ${summary.upcoming.reportDueIndicator.dueDate}`
    });
  } else if (summary.upcoming.reportDueIndicator.daysRemaining <= 7) {
    rows.push({
      id: "due-report-soon",
      name: "Monthly report",
      type: "Reporting",
      dueLabel: `Due in ${summary.upcoming.reportDueIndicator.daysRemaining}d`,
      urgency: summary.upcoming.reportDueIndicator.daysRemaining <= 1 ? "today" : "soon",
      href: summary.upcoming.reportDueIndicator.href,
      context: `${summary.upcoming.reportDueIndicator.label} · ${summary.upcoming.reportDueIndicator.dueDate}`
    });
  }

  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const key = `${row.name}-${row.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const urgencyRank: Record<DueSoonRow["urgency"], number> = {
    overdue: 0,
    today: 1,
    soon: 2
  };

  return uniqueRows.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);
}

function getFollowUpReasonGroup(item: DashboardResidentFollowUpBoardItem): FollowUpReasonFilter {
  if (item.newAdmissionFlag || item.primaryReason.toLowerCase().includes("admission")) return "new-admission";
  if (item.sourceModule === "oneToOne") return "one-to-one";
  if (item.sourceModule === "attendance") return "participation";
  if (item.sourceModule === "carePlan") return "care-plan";
  if (item.sourceModule === "notes") return "documentation";
  return "documentation";
}

function getDueLabel(item: DashboardResidentFollowUpBoardItem) {
  if (item.priorityLevel === "critical") {
    return { label: "Today", urgency: "overdue" as const };
  }
  if (item.priorityLevel === "high") {
    return { label: "24 hours", urgency: "today" as const };
  }
  if ((item.daysSinceLastOneToOne ?? 0) >= 30) {
    return { label: "Overdue", urgency: "overdue" as const };
  }
  if ((item.daysSinceLastAttendance ?? 0) >= 7) {
    return { label: "This week", urgency: "today" as const };
  }
  return { label: "Due soon", urgency: "soon" as const };
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addLocalDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function priorityBadgeClasses(level: DashboardResidentFollowUpBoardItem["priorityLevel"]) {
  if (level === "critical") return "border-rose-300/45 bg-rose-500/20 text-rose-100";
  if (level === "high") return "border-amber-300/45 bg-amber-500/20 text-amber-100";
  if (level === "medium") return "border-blue-300/45 bg-blue-500/20 text-blue-100";
  return "border-[#3e5f90] bg-[#122646] text-[#d6e5ff]";
}

function dueStatusClass(urgency: "overdue" | "today" | "soon") {
  if (urgency === "overdue") return "border-rose-300/45 bg-rose-500/20 text-rose-100";
  if (urgency === "today") return "border-amber-300/45 bg-amber-500/20 text-amber-100";
  return "border-blue-300/45 bg-blue-500/20 text-blue-100";
}

function legendDotClass(tone: "completed" | "dueSoon" | "overdue" | "pending") {
  if (tone === "completed") return "bg-emerald-300";
  if (tone === "dueSoon") return "bg-amber-300";
  if (tone === "overdue") return "bg-rose-300";
  return "bg-violet-300";
}

function metricChipToneClass(tone: "blue" | "amber" | "rose" | "emerald") {
  if (tone === "blue") return "border-blue-300/35 bg-blue-500/12 text-blue-100";
  if (tone === "amber") return "border-amber-300/35 bg-amber-500/12 text-amber-100";
  if (tone === "rose") return "border-rose-300/35 bg-rose-500/12 text-rose-100";
  return "border-emerald-300/35 bg-emerald-500/12 text-emerald-100";
}

function highlightValueToneClass(tone: "blue" | "amber" | "violet" | "emerald") {
  if (tone === "blue") return "text-cyan-100";
  if (tone === "amber") return "text-amber-100";
  if (tone === "violet") return "text-violet-100";
  return "text-emerald-100";
}

function highlightIconToneClass(tone: "blue" | "amber" | "violet" | "emerald") {
  if (tone === "blue") return "text-cyan-200";
  if (tone === "amber") return "text-amber-200";
  if (tone === "violet") return "text-violet-200";
  return "text-emerald-200";
}
