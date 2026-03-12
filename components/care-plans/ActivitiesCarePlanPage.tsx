import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeAlert,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileClock,
  FileText,
  HeartPulse,
  ListChecks,
  Music4,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Workflow
} from "lucide-react";

import type { getResidentActivitiesCarePlanData } from "@/app/app/care-plans/_actions/actions";
import { TopContentHeader } from "@/components/app/TopContentHeader";
import { StatusBadge } from "@/components/care-plans/StatusBadge";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { PremiumSegmentControl } from "@/components/dashboard/v4/PremiumSegmentControl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusAreaLabel } from "@/lib/care-plans/enums";
import { CARE_PLAN_TEMPLATES, getGoalTemplateByKey } from "@/lib/care-plans/templates";
import type { CarePlanDisplayStatus } from "@/lib/care-plans/status";
import type { AssessmentDueLevel, ResidentAssessmentSchedule } from "@/lib/residents/assessment-due";
import { formatInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type ActivitiesCarePlanData = NonNullable<Awaited<ReturnType<typeof getResidentActivitiesCarePlanData>>>;

type FocusStatus = "Active" | "Monitor" | "Resolved" | "Draft";
type FocusPriority = "Low" | "Moderate" | "High";
type GoalProgress = "Ongoing" | "Met" | "Not Met" | "Revised";
type InterventionEffectiveness = "Effective" | "Somewhat Effective" | "Ineffective" | "Needs Review";

export type ActivitiesCarePlanTab =
  | "overview"
  | "focuses"
  | "goals-interventions"
  | "participation"
  | "documents"
  | "history";

export type ActivitiesCarePlanQuery = {
  tab: ActivitiesCarePlanTab;
  q: string;
  focusStatus: "all" | "active" | "monitor" | "resolved" | "draft";
  focusPriority: "all" | "high" | "moderate" | "low";
  focusSort: "priority" | "review" | "updated" | "title";
  focusView: "board" | "list";
  giFocus: string;
  giStatus: "all" | "ongoing" | "met" | "not-met" | "revised";
};

type FocusRow = {
  id: string;
  key: string;
  title: string;
  statement: string;
  status: FocusStatus;
  priority: FocusPriority;
  triggerSource: string;
  owner: string;
  startDateIso: string;
  reviewDateIso: string | null;
  updatedAtIso: string;
  rationale: string;
  goals: GoalRow[];
  interventions: InterventionRowModel[];
  relatedDocs: ActivitiesCarePlanData["docs"];
  reviewNotes: ActivitiesCarePlanData["reviewTimeline"];
};

type GoalRow = {
  id: string;
  statement: string;
  targetDateIso: string;
  reviewFrequency: string;
  progress: GoalProgress;
  dueLabel: string;
  dueLevel: AssessmentDueLevel;
  lastUpdatedIso: string;
  outcomeSummary: string;
};

type InterventionRowModel = {
  id: string;
  statement: string;
  frequency: string;
  assignedDiscipline: string;
  startDateIso: string;
  lastCompletedDateIso: string | null;
  nextDueDateIso: string | null;
  effectiveness: InterventionEffectiveness;
  notes: string | null;
};

type DueItem = {
  id: string;
  title: string;
  detail: string;
  dateIso: string | null;
  level: AssessmentDueLevel;
  href: string;
};

const DEFAULT_QUERY: ActivitiesCarePlanQuery = {
  tab: "overview",
  q: "",
  focusStatus: "all",
  focusPriority: "all",
  focusSort: "priority",
  focusView: "board",
  giFocus: "all",
  giStatus: "all"
};

const PANEL =
  "rounded-[1.3rem] border border-[#23385e]/95 bg-[linear-gradient(180deg,#0b1426_0%,#0a1324_52%,#08101f_100%)] shadow-[0_26px_44px_-34px_rgba(37,99,235,0.72)]";
const PANEL_SOFT = "rounded-[1.1rem] border border-[#2b416c]/90 bg-[#0e1a30]/90";
const PANEL_INNER = "rounded-xl border border-[#304873] bg-[#0d182d]";
const META_LABEL = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ab4de]";

function formatDate(iso: string | null, timeZone: string) {
  if (!iso) return "Not set";
  return formatInTimeZone(new Date(iso), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(iso: string, timeZone: string) {
  return formatInTimeZone(new Date(iso), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function pluralize(value: number, single: string, plural = `${single}s`) {
  return `${value} ${value === 1 ? single : plural}`;
}

function toDueLevelFromDays(days: number | null): AssessmentDueLevel {
  if (days == null) return "UNSCHEDULED";
  if (days < 0) return "OVERDUE";
  if (days === 0) return "DUE_TODAY";
  if (days <= 7) return "DUE_SOON_7";
  if (days <= 14) return "DUE_SOON_14";
  if (days <= 30) return "DUE_SOON_30";
  return "ON_TRACK";
}

function daysUntil(iso: string | null, now: Date) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function dueLabel(days: number | null) {
  if (days == null) return "Not scheduled";
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

function dueTone(level: AssessmentDueLevel) {
  if (level === "OVERDUE") return "border-rose-400/50 bg-rose-500/16 text-rose-100";
  if (level === "DUE_TODAY" || level === "DUE_SOON_7") return "border-amber-300/60 bg-amber-500/18 text-amber-100";
  if (level === "DUE_SOON_14" || level === "DUE_SOON_30") return "border-yellow-300/45 bg-yellow-500/14 text-yellow-100";
  if (level === "ON_TRACK") return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  if (level === "INACTIVE") return "border-slate-400/35 bg-slate-500/12 text-slate-200";
  return "border-[#37588f] bg-[#13274b] text-[#d4e4ff]";
}

function focusStatusTone(status: FocusStatus) {
  if (status === "Resolved") return "border-emerald-400/45 bg-emerald-500/15 text-emerald-100";
  if (status === "Monitor") return "border-amber-300/50 bg-amber-500/16 text-amber-100";
  if (status === "Draft") return "border-violet-400/45 bg-violet-500/14 text-violet-100";
  return "border-blue-400/45 bg-blue-500/14 text-blue-100";
}

function priorityTone(priority: FocusPriority) {
  if (priority === "High") return "border-rose-400/45 bg-rose-500/15 text-rose-100";
  if (priority === "Moderate") return "border-amber-300/45 bg-amber-500/15 text-amber-100";
  return "border-emerald-400/45 bg-emerald-500/15 text-emerald-100";
}

function progressTone(progress: GoalProgress) {
  if (progress === "Met") return "border-emerald-400/45 bg-emerald-500/15 text-emerald-100";
  if (progress === "Not Met") return "border-rose-400/45 bg-rose-500/15 text-rose-100";
  if (progress === "Revised") return "border-violet-400/45 bg-violet-500/15 text-violet-100";
  return "border-blue-400/45 bg-blue-500/15 text-blue-100";
}

function effectivenessTone(effectiveness: InterventionEffectiveness) {
  if (effectiveness === "Effective") return "border-emerald-400/45 bg-emerald-500/15 text-emerald-100";
  if (effectiveness === "Somewhat Effective") return "border-amber-300/45 bg-amber-500/15 text-amber-100";
  if (effectiveness === "Ineffective") return "border-rose-400/45 bg-rose-500/15 text-rose-100";
  return "border-violet-400/45 bg-violet-500/15 text-violet-100";
}

function withQueryHref(basePath: string, query: ActivitiesCarePlanQuery, patch: Partial<ActivitiesCarePlanQuery>) {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();

  if (merged.tab !== DEFAULT_QUERY.tab) params.set("tab", merged.tab);
  if (merged.q.trim()) params.set("q", merged.q.trim());
  if (merged.focusStatus !== DEFAULT_QUERY.focusStatus) params.set("focusStatus", merged.focusStatus);
  if (merged.focusPriority !== DEFAULT_QUERY.focusPriority) params.set("focusPriority", merged.focusPriority);
  if (merged.focusSort !== DEFAULT_QUERY.focusSort) params.set("focusSort", merged.focusSort);
  if (merged.focusView !== DEFAULT_QUERY.focusView) params.set("focusView", merged.focusView);
  if (merged.giFocus !== DEFAULT_QUERY.giFocus) params.set("giFocus", merged.giFocus);
  if (merged.giStatus !== DEFAULT_QUERY.giStatus) params.set("giStatus", merged.giStatus);

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function resolvePriority(schedule: ResidentAssessmentSchedule): FocusPriority {
  if (
    schedule.quarterly.level === "OVERDUE" ||
    schedule.annual.level === "OVERDUE" ||
    schedule.mds.level === "OVERDUE"
  ) {
    return "High";
  }

  if (
    schedule.quarterly.level === "DUE_TODAY" ||
    schedule.quarterly.level === "DUE_SOON_7" ||
    schedule.annual.level === "DUE_TODAY" ||
    schedule.annual.level === "DUE_SOON_7" ||
    schedule.mds.level === "DUE_TODAY" ||
    schedule.mds.level === "DUE_SOON_7"
  ) {
    return "Moderate";
  }

  return "Low";
}

function priorityRank(priority: FocusPriority) {
  if (priority === "High") return 3;
  if (priority === "Moderate") return 2;
  return 1;
}

function mapFocusRows(data: ActivitiesCarePlanData, now: Date): FocusRow[] {
  if (!data.plan) {
    return [
      {
        id: "empty-focus",
        key: "empty",
        title: "No Active Activities Focuses",
        statement:
          "Create a new Activities Care Plan or apply a quick-start template to begin resident-specific goals and interventions.",
        status: "Draft",
        priority: "Moderate",
        triggerSource: "Manual Add",
        owner: "Activities",
        startDateIso: data.resident.createdAtIso,
        reviewDateIso: data.assessmentSchedule.nextDueDateIso,
        updatedAtIso: data.resident.createdAtIso,
        rationale:
          "This resident does not currently have focus statements on file. Starting with a structured template reduces charting time and improves consistency.",
        goals: [],
        interventions: [],
        relatedDocs: data.docs.slice(0, 4),
        reviewNotes: data.reviewTimeline.slice(0, 3)
      }
    ];
  }

  const plan = data.plan;
  const focusKeys = plan.focusAreasList.length ? plan.focusAreasList : ["LEISURE_ENGAGEMENT"];
  const resolvedPriority = resolvePriority(data.assessmentSchedule);

  const mappedGoalByFocus = new Map<string, string>();
  for (const goal of plan.goals) {
    if (!goal.templateKey) continue;
    const template = getGoalTemplateByKey(goal.templateKey);
    if (!template) continue;
    mappedGoalByFocus.set(goal.id, template.focusArea);
  }

  const unmatchedGoals = plan.goals.filter((goal) => !mappedGoalByFocus.has(goal.id));

  return focusKeys.map((focusKey, index) => {
    const goals = plan.goals
      .filter((goal) => {
        const mappedFocus = mappedGoalByFocus.get(goal.id);
        if (mappedFocus) return mappedFocus === focusKey;
        return index === 0 && unmatchedGoals.some((item) => item.id === goal.id);
      })
      .map((goal) => {
        const mappedTemplate = goal.templateKey ? getGoalTemplateByKey(goal.templateKey) : null;
        const targetDate = new Date(plan.createdAt);
        targetDate.setDate(targetDate.getDate() + goal.timeframeDays);
        const targetDateIso = targetDate.toISOString();
        const delta = daysUntil(targetDateIso, now);
        const goalDueLevel = toDueLevelFromDays(delta);

        let progress: GoalProgress = "Ongoing";
        if (goalDueLevel === "OVERDUE") progress = "Not Met";
        else if (data.trend === "UP") progress = "Met";
        else if (data.trend === "DOWN") progress = "Revised";

        return {
          id: goal.id,
          statement:
            mappedTemplate?.text ||
            goal.customText ||
            "Resident will engage in individualized and/or group programming as desired and tolerated.",
          targetDateIso,
          reviewFrequency: `${Math.max(7, Math.round(goal.timeframeDays / 3))} days`,
          progress,
          dueLabel: dueLabel(delta),
          dueLevel: goalDueLevel,
          lastUpdatedIso: plan.updatedAt.toISOString(),
          outcomeSummary:
            progress === "Met"
              ? "Current approach is effective based on response and participation trends."
              : progress === "Not Met"
                ? "Outcome target was not reached; intervention revision recommended."
                : progress === "Revised"
                  ? "Resident response changed; care plan strategy has been adjusted."
                  : "Continue current interventions and monitor for tolerance and consistency."
        };
      });

    const interventions = plan.interventions.map((intervention, interventionIndex) => {
      const linkedDoc = data.docs.find((doc, idx) => idx >= interventionIndex && doc.kind !== "MDS");
      const lastCompletedIso = linkedDoc?.createdAtIso ?? null;
      const dueDate = lastCompletedIso ? new Date(lastCompletedIso) : new Date(plan.updatedAt);
      dueDate.setDate(dueDate.getDate() + 7);

      return {
        id: intervention.id,
        statement: intervention.title,
        frequency:
          plan.frequency === "THREE_PER_WEEK"
            ? "3x weekly"
            : plan.frequency === "CUSTOM"
              ? plan.frequencyCustom || "Custom cadence"
              : plan.frequency.replaceAll("_", " ").toLowerCase(),
        assignedDiscipline: "Activities",
        startDateIso: plan.createdAt.toISOString(),
        lastCompletedDateIso: lastCompletedIso,
        nextDueDateIso: dueDate.toISOString(),
        effectiveness:
          data.trend === "UP"
            ? "Effective"
            : data.trend === "DOWN"
              ? "Needs Review"
              : intervention.bedBoundFriendly || intervention.dementiaFriendly
                ? "Somewhat Effective"
                : "Effective",
        notes:
          intervention.bedBoundFriendly ||
          intervention.dementiaFriendly ||
          intervention.lowVisionFriendly ||
          intervention.hardOfHearingFriendly
            ? "Adapted intervention flags active for resident-specific needs."
            : null
      } satisfies InterventionRowModel;
    });

    const focusStatus: FocusStatus =
      plan.status === "ARCHIVED"
        ? "Resolved"
        : data.displayStatus === "OVERDUE"
          ? "Monitor"
          : data.displayStatus === "DUE_SOON"
            ? "Monitor"
            : "Active";

    const triggerSource =
      data.assessmentSchedule.lengthOfStayDays != null && data.assessmentSchedule.lengthOfStayDays <= 90
        ? "Admission"
        : data.docs.some((item) => item.kind === "UDA")
          ? "Quarterly"
          : data.docs.some((item) => item.kind === "MDS")
            ? "MDS"
            : "Manual Add";

    return {
      id: `${focusKey}-${index}`,
      key: focusKey,
      title: focusAreaLabel(focusKey),
      statement: `Resident is care planned for ${focusAreaLabel(focusKey).toLowerCase()} with structured goals and interventions.`,
      status: focusStatus,
      priority: resolvedPriority,
      triggerSource,
      owner: "Activities",
      startDateIso: plan.createdAt.toISOString(),
      reviewDateIso: plan.nextReviewDate.toISOString(),
      updatedAtIso: plan.updatedAt.toISOString(),
      rationale:
        plan.preferencesText?.trim() ||
        "Focus area is supported by resident preferences, attendance patterns, and recent documentation response trends.",
      goals,
      interventions,
      relatedDocs: data.docs.filter((doc) => doc.kind !== "MDS").slice(0, 8),
      reviewNotes: data.reviewTimeline.slice(0, 8)
    };
  });
}

function applyFocusFilters(rows: FocusRow[], query: ActivitiesCarePlanQuery) {
  const search = query.q.trim().toLowerCase();

  const filtered = rows
    .filter((row) => {
      if (query.focusStatus === "all") return true;
      if (query.focusStatus === "active") return row.status === "Active";
      if (query.focusStatus === "monitor") return row.status === "Monitor";
      if (query.focusStatus === "resolved") return row.status === "Resolved";
      return row.status === "Draft";
    })
    .filter((row) => {
      if (query.focusPriority === "all") return true;
      if (query.focusPriority === "high") return row.priority === "High";
      if (query.focusPriority === "moderate") return row.priority === "Moderate";
      return row.priority === "Low";
    })
    .filter((row) => {
      if (!search) return true;
      return (
        row.title.toLowerCase().includes(search) ||
        row.statement.toLowerCase().includes(search) ||
        row.rationale.toLowerCase().includes(search)
      );
    });

  return [...filtered].sort((a, b) => {
    if (query.focusSort === "title") {
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }

    if (query.focusSort === "updated") {
      return new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime();
    }

    if (query.focusSort === "review") {
      const aReview = a.reviewDateIso ? new Date(a.reviewDateIso).getTime() : Number.MAX_SAFE_INTEGER;
      const bReview = b.reviewDateIso ? new Date(b.reviewDateIso).getTime() : Number.MAX_SAFE_INTEGER;
      return aReview - bReview;
    }

    return priorityRank(b.priority) - priorityRank(a.priority);
  });
}

function buildCarePlanHealth(data: ActivitiesCarePlanData, rows: FocusRow[]) {
  const unresolvedFocuses = rows.filter((row) => row.status !== "Resolved").length;
  const overdueCount = data.assessmentSchedule.overdueCount;
  const dueSoonCount = data.assessmentSchedule.dueSoonCount;
  const linkedDocsCount = data.docs.length;

  let state: "Healthy" | "Needs Review" | "Attention Needed" = "Healthy";
  if (overdueCount > 0) state = "Attention Needed";
  else if (dueSoonCount > 0 || data.summary.documentationCompletionPercent < 70) state = "Needs Review";

  const score = Math.max(
    0,
    Math.min(
      100,
      100 - overdueCount * 22 - dueSoonCount * 8 - Math.max(0, 5 - linkedDocsCount) * 4 + Math.min(6, unresolvedFocuses)
    )
  );

  return {
    state,
    score,
    unresolvedFocuses,
    overdueCount,
    dueSoonCount,
    linkedDocsCount,
    latestReviewIso: data.reviewTimeline[0]?.reviewDateIso ?? data.summary.nextReviewDateIso
  };
}

function buildDueItems(residentPath: string, data: ActivitiesCarePlanData, focusRows: FocusRow[], now: Date): DueItem[] {
  const items: DueItem[] = [];

  const scheduleItems: Array<{ title: string; dueIso: string | null; level: AssessmentDueLevel; href: string }> = [
    {
      title: "Quarterly UDA review",
      dueIso: data.assessmentSchedule.quarterly.dueDateIso,
      level: data.assessmentSchedule.quarterly.level,
      href: `/app/documentation/uda?residentId=${data.resident.id}`
    },
    {
      title: "Annual UDA review",
      dueIso: data.assessmentSchedule.annual.dueDateIso,
      level: data.assessmentSchedule.annual.level,
      href: `/app/documentation/uda?residentId=${data.resident.id}`
    },
    {
      title: "MDS Section F update",
      dueIso: data.assessmentSchedule.mds.dueDateIso,
      level: data.assessmentSchedule.mds.level,
      href: `/app/documentation/mds?residentId=${data.resident.id}`
    }
  ];

  for (const item of scheduleItems) {
    if (!item.dueIso) continue;
    items.push({
      id: item.title,
      title: item.title,
      detail: dueLabel(daysUntil(item.dueIso, now)),
      dateIso: item.dueIso,
      level: item.level,
      href: item.href
    });
  }

  for (const focus of focusRows) {
    for (const goal of focus.goals) {
      if (goal.dueLevel === "OVERDUE" || goal.dueLevel === "DUE_TODAY" || goal.dueLevel === "DUE_SOON_7") {
        items.push({
          id: `goal-${goal.id}`,
          title: `${focus.title} goal review`,
          detail: goal.dueLabel,
          dateIso: goal.targetDateIso,
          level: goal.dueLevel,
          href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "goals-interventions" })
        });
      }
    }

    for (const intervention of focus.interventions) {
      const level = toDueLevelFromDays(daysUntil(intervention.nextDueDateIso, now));
      if (level === "OVERDUE" || level === "DUE_TODAY" || level === "DUE_SOON_7") {
        items.push({
          id: `intervention-${intervention.id}`,
          title: `${focus.title} intervention check`,
          detail: dueLabel(daysUntil(intervention.nextDueDateIso, now)),
          dateIso: intervention.nextDueDateIso,
          level,
          href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "goals-interventions" })
        });
      }
    }
  }

  const latestDoc = data.docs[0];
  if (latestDoc) {
    const docAge = Math.floor((now.getTime() - new Date(latestDoc.createdAtIso).getTime()) / (24 * 60 * 60 * 1000));
    if (docAge > 7) {
      items.push({
        id: "doc-stale",
        title: "Documentation freshness",
        detail: `Last supporting note ${docAge} days ago`,
        dateIso: latestDoc.createdAtIso,
        level: docAge > 14 ? "OVERDUE" : "DUE_SOON_7",
        href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "documents" })
      });
    }
  }

  const rank = (item: DueItem) => {
    if (item.level === "OVERDUE") return 3;
    if (item.level === "DUE_TODAY" || item.level === "DUE_SOON_7") return 2;
    return 1;
  };

  return items
    .sort((a, b) => {
      const rankDiff = rank(b) - rank(a);
      if (rankDiff !== 0) return rankDiff;
      const aTime = a.dateIso ? new Date(a.dateIso).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dateIso ? new Date(b.dateIso).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 14);
}

export function ActivitiesCarePlanPage({
  data,
  timeZone,
  canEdit,
  query,
  archiveAction
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  canEdit: boolean;
  query: ActivitiesCarePlanQuery;
  archiveAction: (formData: FormData) => Promise<void> | void;
}) {
  const residentPath = `/app/residents/${data.resident.id}/care-plan`;
  const now = new Date();

  const rawFocusRows = mapFocusRows(data, now);
  const focusRows = applyFocusFilters(rawFocusRows, query);
  const carePlanHealth = buildCarePlanHealth(data, focusRows);
  const dueItems = buildDueItems(residentPath, data, rawFocusRows, now);

  return (
    <CarePlanPageShell>
      <CarePlanTopHeader
        data={data}
        timeZone={timeZone}
        canEdit={canEdit}
        query={query}
        residentPath={residentPath}
        archiveAction={archiveAction}
      />

      <ResidentHeroBand data={data} timeZone={timeZone} carePlanHealth={carePlanHealth} />

      <CarePlanSummaryCards data={data} timeZone={timeZone} residentPath={residentPath} />

      <section className="grid gap-4 xl:grid-cols-12">
        <aside className="space-y-4 xl:col-span-3">
          <ResidentPreferencesCard data={data} />
          <ResidentStrengthsCard data={data} />
          <ResidentBarriersCard data={data} />
          <ParticipationProfileCard data={data} />
        </aside>

        <main className="space-y-4 xl:col-span-6">
          <FocusBoard
            data={data}
            residentPath={residentPath}
            query={query}
            focusRows={focusRows}
            timeZone={timeZone}
            canEdit={canEdit}
            showControls
          />
          <QuickAddFocusDrawer residentId={data.resident.id} hasPlan={Boolean(data.plan)} />
        </main>

        <aside className="space-y-4 xl:col-span-3">
          <CarePlanHealthPanel carePlanHealth={carePlanHealth} timeZone={timeZone} />
          <ParticipationInsightsPanel data={data} compact />
          <UpcomingDuePanel dueItems={dueItems} timeZone={timeZone} />
          <RelatedDocsPanel data={data} timeZone={timeZone} compact />
          <ReviewTimelinePanel data={data} timeZone={timeZone} compact />
        </aside>
      </section>

      <section className="space-y-4">
        <CarePlanTabs residentPath={residentPath} query={query} />

        {query.tab === "overview" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <FocusBoard
              data={data}
              residentPath={residentPath}
              query={{ ...query, focusView: "list", focusSort: "priority" }}
              focusRows={focusRows.slice(0, 4)}
              timeZone={timeZone}
              canEdit={canEdit}
              title="Overview Focus Snapshot"
              description="Highest-priority focus areas with immediate clinical context."
            />
            <div className="space-y-4">
              <UpcomingDuePanel dueItems={dueItems.slice(0, 7)} timeZone={timeZone} />
              <CarePlanRecommendations data={data} dueItems={dueItems} />
            </div>
          </div>
        ) : null}

        {query.tab === "focuses" ? (
          <div className="space-y-4">
            <QuickAddFocusDrawer residentId={data.resident.id} hasPlan={Boolean(data.plan)} />
            <FocusBoard
              data={data}
              residentPath={residentPath}
              query={query}
              focusRows={focusRows}
              timeZone={timeZone}
              canEdit={canEdit}
              showControls
              title="Focuses Workspace"
              description="Manage active, monitor, resolved, and draft focus statements with linked goals and interventions."
            />
          </div>
        ) : null}

        {query.tab === "goals-interventions" ? (
          <GoalsInterventionsWorkspace
            residentPath={residentPath}
            query={query}
            focusRows={focusRows}
            timeZone={timeZone}
            canEdit={canEdit}
          />
        ) : null}

        {query.tab === "participation" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ParticipationInsightsPanel data={data} detailed />
            <div className="space-y-4">
              <ParticipationProfileCard data={data} />
              <RelatedDocsPanel data={data} timeZone={timeZone} compact />
            </div>
          </div>
        ) : null}

        {query.tab === "documents" ? <RelatedDocsPanel data={data} timeZone={timeZone} detailed /> : null}

        {query.tab === "history" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ReviewTimelinePanel data={data} timeZone={timeZone} detailed />
            <InterdisciplinaryPanel data={data} />
          </div>
        ) : null}
      </section>
    </CarePlanPageShell>
  );
}

function CarePlanPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#192b49] bg-[#040a16] p-3 md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-5%_-12%,rgba(56,189,248,0.22),transparent_60%),radial-gradient(980px_460px_at_105%_0%,rgba(139,92,246,0.26),transparent_62%),radial-gradient(860px_380px_at_52%_112%,rgba(59,130,246,0.18),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-blue-300/10 blur-3xl" />
      <div className="relative z-10 space-y-4">{children}</div>
    </div>
  );
}

function CarePlanTopHeader({
  data,
  timeZone,
  canEdit,
  query,
  residentPath,
  archiveAction
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  canEdit: boolean;
  query: ActivitiesCarePlanQuery;
  residentPath: string;
  archiveAction: (formData: FormData) => Promise<void> | void;
}) {
  const editorHref = data.plan ? `${residentPath}/edit` : `${residentPath}/new`;
  const nextDueLevel =
    data.assessmentSchedule.nextDueType === "QUARTERLY_UDA"
      ? data.assessmentSchedule.quarterly.level
      : data.assessmentSchedule.nextDueType === "ANNUAL_UDA"
        ? data.assessmentSchedule.annual.level
        : data.assessmentSchedule.nextDueType === "MDS"
          ? data.assessmentSchedule.mds.level
          : "UNSCHEDULED";

  return (
    <TopContentHeader
      eyebrow="Activities Care Planning"
      title="Care Plan"
      subtitle={`${data.resident.name} · Room ${data.resident.room}${
        data.resident.unitName ? ` · ${data.resident.unitName}` : ""
      }`}
      icon={ClipboardList}
      accentGradientClasses="from-cyan-300 to-blue-500"
      actions={
        <>
          <PremiumPillButton label="Edit Care Plan" href={editorHref} tone="blue" />
          <PremiumPillButton label="Add Focus" href={editorHref} icon={Plus} tone="neutral" />
          <PremiumPillButton label="Add Goal" href={editorHref} tone="violet" />
          <PremiumPillButton label="Add Intervention" href={editorHref} tone="sky" />
          <PremiumPillButton label="Mark Reviewed" href={`${residentPath}/reviews/new`} tone="emerald" />
          {data.plan ? <PremiumPillButton label="Print / Export" href={`/api/care-plans/${data.plan.id}/pdf`} tone="neutral" /> : null}
          {canEdit && data.plan ? (
            <form action={archiveAction}>
              <input type="hidden" name="carePlanId" value={data.plan.id} />
              <Button
                type="submit"
                className="h-9 rounded-full border border-rose-400/45 bg-[#3a1b2d] px-3 text-xs font-semibold text-rose-100 hover:bg-[#49233a]"
              >
                Mark Resolved
              </Button>
            </form>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <form action={residentPath} method="get" className="flex items-center gap-2">
          <input type="hidden" name="tab" value={query.tab} />
          <input type="hidden" name="focusStatus" value={query.focusStatus} />
          <input type="hidden" name="focusPriority" value={query.focusPriority} />
          <input type="hidden" name="focusSort" value={query.focusSort} />
          <input type="hidden" name="focusView" value={query.focusView} />
          <input type="hidden" name="giFocus" value={query.giFocus} />
          <input type="hidden" name="giStatus" value={query.giStatus} />
          <label className="relative flex h-10 w-full items-center rounded-full border border-[#2d466f] bg-[#0f1c33] px-3 text-sm text-[#d8e6ff]">
            <Sparkles className="h-4 w-4 text-blue-200/80" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Search focuses, goals, interventions, documentation"
              className="h-full w-full bg-transparent px-2 text-sm placeholder:text-[#8fa8d4] focus:outline-none"
            />
          </label>
          <PremiumPillButton label="Search" tone="blue" buttonType="submit" />
        </form>

        <PremiumSegmentControl
          items={[
            {
              id: "overview",
              label: "Overview",
              href: withQueryHref(residentPath, query, { tab: "overview" }),
              active: query.tab === "overview"
            },
            {
              id: "focuses",
              label: "Focuses",
              href: withQueryHref(residentPath, query, { tab: "focuses" }),
              active: query.tab === "focuses"
            },
            {
              id: "goals",
              label: "Goals",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions" }),
              active: query.tab === "goals-interventions"
            }
          ]}
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.displayStatus as CarePlanDisplayStatus} className="border-white/25 bg-[#122343] text-[#dbe8ff]" />
          <CarePlanStatusChip label={`Updated ${formatDate(data.plan?.updatedAt ? data.plan.updatedAt.toISOString() : null, timeZone)}`} />
          <Badge className={cn("border", dueTone(nextDueLevel))}>Next review {formatDate(data.summary.nextReviewDateIso, timeZone)}</Badge>
        </div>
      </div>
    </TopContentHeader>
  );
}

function ResidentHeroBand({
  data,
  timeZone,
  carePlanHealth
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  carePlanHealth: ReturnType<typeof buildCarePlanHealth>;
}) {
  return (
    <section className={cn(PANEL, "overflow-hidden p-4") }>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(820px_200px_at_18%_0%,rgba(59,130,246,0.2),transparent_72%),radial-gradient(620px_180px_at_80%_0%,rgba(167,139,250,0.24),transparent_70%)]" />
      <div className="relative z-10 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-500/16 text-lg font-black text-cyan-100">
            {data.resident.firstName.slice(0, 1)}
            {data.resident.lastName.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-white">{data.resident.name}</h2>
              {data.resident.preferredName ? (
                <Badge className="border-violet-400/45 bg-violet-500/16 text-violet-100">Preferred: {data.resident.preferredName}</Badge>
              ) : null}
              <Badge className="border-[#43679f] bg-[#132c53] text-[#d7e8ff]">{data.displayStatusLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-[#bfd2f2]">
              Room {data.resident.room}
              {data.resident.unitName ? ` · ${data.resident.unitName}` : ""} · Admission {formatDate(data.resident.admissionDateIso, timeZone)} · DOB{" "}
              {formatDate(data.resident.birthDateIso, timeZone)}
              {typeof data.resident.age === "number" ? ` · Age ${data.resident.age}` : ""}
            </p>
            <p className="mt-2 text-xs text-[#9fb8df]">
              Activities care plan is {carePlanHealth.state.toLowerCase()} with {pluralize(carePlanHealth.unresolvedFocuses, "open focus")} and next review {formatDate(data.summary.nextReviewDateIso, timeZone)}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.resident.chips.length > 0 ? (
                data.resident.chips.slice(0, 10).map((chip) => <CarePlanStatusChip key={chip} label={chip} />)
              ) : (
                <CarePlanStatusChip label="No resident preference chips yet" />
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <HeroMeta label="Participation baseline" value={data.baseline.participation} />
          <HeroMeta
            label="Primary style"
            value={data.summary.oneToOneNeeded ? "1:1 + selective group" : "Group and 1:1 blended"}
          />
          <HeroMeta label="Last updated" value={formatDate(data.plan?.updatedAt ? data.plan.updatedAt.toISOString() : null, timeZone)} />
        </div>

        <div className={cn(PANEL_INNER, "p-3") }>
          <p className={META_LABEL}>Care Plan Health</p>
          <p className="mt-2 text-2xl font-black text-white">{carePlanHealth.score}%</p>
          <p className="mt-1 text-xs text-[#9db6df]">{carePlanHealth.state}</p>
          <div className="mt-2 h-2 rounded-full bg-[#10213d]">
            <div
              className={cn(
                "h-2 rounded-full transition-[width] duration-500",
                carePlanHealth.state === "Healthy"
                  ? "bg-emerald-400"
                  : carePlanHealth.state === "Needs Review"
                    ? "bg-amber-400"
                    : "bg-rose-400"
              )}
              style={{ width: `${carePlanHealth.score}%` }}
            />
          </div>
          <dl className="mt-3 space-y-1 text-xs text-[#d3e2ff]">
            <div className="flex items-center justify-between gap-2">
              <dt>Overdue</dt>
              <dd>{carePlanHealth.overdueCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Due Soon</dt>
              <dd>{carePlanHealth.dueSoonCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Linked Docs</dt>
              <dd>{carePlanHealth.linkedDocsCount}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(PANEL_INNER, "p-3") }>
      <p className={META_LABEL}>{label}</p>
      <p className="mt-1 text-sm text-[#e3ecff]">{value}</p>
    </div>
  );
}

function CarePlanSummaryCards({
  data,
  timeZone,
  residentPath
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  residentPath: string;
}) {
  const cards = [
    {
      id: "focuses",
      icon: Target,
      label: "Active Focuses",
      value: String(data.summary.activeFocuses),
      hint: "View focus workspace",
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "focuses" })
    },
    {
      id: "goals",
      icon: ClipboardList,
      label: "Active Goals",
      value: String(data.summary.currentGoals),
      hint: "Goal and due-state tracker",
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "goals-interventions" })
    },
    {
      id: "interventions",
      icon: ListChecks,
      label: "Open Interventions",
      value: String(data.summary.openInterventions),
      hint: "Expected care approaches",
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "goals-interventions" })
    },
    {
      id: "trend",
      icon: TrendingUp,
      label: "Participation Trend",
      value: data.summary.participationTrendLabel,
      hint: "Last 30 days",
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "participation" })
    },
    {
      id: "refusals",
      icon: ShieldAlert,
      label: "Refusals This Month",
      value: String(data.summary.refusalsThisMonth),
      hint: "Needs follow-up",
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "participation" })
    },
    {
      id: "one-to-one",
      icon: Users,
      label: "1:1 Due",
      value: data.summary.oneToOneNeeded ? "Yes" : "Current",
      hint: "Resident-level follow-up",
      href: `/app/documentation/one-to-one?residentId=${data.resident.id}`
    },
    {
      id: "next-review",
      icon: CalendarClock,
      label: "Next Review Due",
      value: formatDate(data.summary.nextReviewDateIso, timeZone),
      hint: `${data.summary.quarterlyLabel} / ${data.summary.annualLabel}`,
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "history" })
    },
    {
      id: "last-doc",
      icon: FileClock,
      label: "Last Documentation Update",
      value: data.docs[0] ? formatDate(data.docs[0].createdAtIso, timeZone) : "None",
      hint: `${data.summary.documentationCompletionPercent}% completion this month`,
      href: withQueryHref(residentPath, DEFAULT_QUERY, { tab: "documents" })
    }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className={cn(
            PANEL,
            "group relative overflow-hidden p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#3d5c92]"
          )}
        >
          <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={META_LABEL}>{card.label}</p>
              <p className="mt-1 text-xl font-black text-white">{card.value}</p>
              <p className="mt-1 text-xs text-[#9cb4dd]">{card.hint}</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#335286] bg-[#132648] text-[#cfe0ff]">
              <card.icon className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#b8d0f3]">
            Open
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
      ))}
    </section>
  );
}

function ResidentPreferencesCard({ data }: { data: ActivitiesCarePlanData }) {
  const profileItems = [
    { label: "Favorite activities", value: data.resident.preferences || "Not documented" },
    {
      label: "Preferred social setting",
      value: data.resident.oneToOneNeeded ? "Prefers 1:1 and selective groups" : "Comfortable in group and 1:1"
    },
    { label: "Best time of day", value: data.resident.bestTimesOfDay || data.participation.bestTimeWindow },
    { label: "Family/support involvement", value: data.resident.followUpFlag ? "Follow-up flag active" : "No active follow-up flag" },
    { label: "Notes", value: data.resident.notes || "No preference notes entered" }
  ];

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Resident Context</p>
          <h3 className="text-base font-bold text-white">Interests & Preferences</h3>
        </div>
        <Music4 className="h-4 w-4 text-cyan-200/90" aria-hidden />
      </header>
      <div className="space-y-2">
        {profileItems.map((item) => (
          <div key={item.label} className={cn(PANEL_INNER, "p-2.5") }>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#96b0db]">{item.label}</p>
            <p className="mt-1 text-sm text-[#dce8ff]">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResidentStrengthsCard({ data }: { data: ActivitiesCarePlanData }) {
  const strengths = data.plan?.supportsList.length
    ? data.plan.supportsList
    : [
        "Can make needs known",
        "Responds to encouragement",
        "Enjoys familiar routines",
        data.participation.bestTimeWindow !== "Not enough data"
          ? `${data.participation.bestTimeWindow} is a strong engagement window`
          : "Monitor best engagement window"
      ];

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Person-Centered</p>
          <h3 className="text-base font-bold text-white">Strengths</h3>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-200/90" aria-hidden />
      </header>
      <div className="grid gap-2">
        {strengths.slice(0, 9).map((item) => (
          <div key={item} className={cn(PANEL_INNER, "flex items-start gap-2 p-2.5") }>
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-300" aria-hidden />
            <p className="text-sm text-[#dce8ff]">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResidentBarriersCard({ data }: { data: ActivitiesCarePlanData }) {
  const fallback = [
    data.baseline.cognition,
    data.baseline.communication,
    data.baseline.mobility,
    data.summary.refusalsThisMonth > 0 ? "Recent refusal pattern" : null,
    data.resident.oneToOneNeeded ? "Requires ongoing 1:1 follow-up" : null
  ].filter((item): item is string => Boolean(item));

  const barriers = data.plan?.barriersList.length ? data.plan.barriersList : fallback;

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Risk & Access</p>
          <h3 className="text-base font-bold text-white">Barriers / Risks</h3>
        </div>
        <BadgeAlert className="h-4 w-4 text-amber-200/90" aria-hidden />
      </header>
      <div className="flex flex-wrap gap-2">
        {barriers.length > 0 ? (
          barriers.map((barrier) => (
            <Badge key={barrier} className="rounded-full border border-amber-300/45 bg-amber-500/13 px-2.5 py-1 text-xs text-amber-100">
              {barrier}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-[#b8cced]">No barriers documented yet.</p>
        )}
      </div>
    </section>
  );
}

function ParticipationProfileCard({ data }: { data: ActivitiesCarePlanData }) {
  const rows = [
    { label: "Group participation", value: `${data.participation.groupAttendance30d} attended (30d)` },
    { label: "1:1 participation", value: `${data.participation.oneToOneThisMonth} this month` },
    { label: "Independent leisure", value: `${data.participation.independentEngagement30d} tracked events` },
    { label: "Best engagement window", value: data.participation.bestTimeWindow },
    { label: "Most attended category", value: data.participation.mostAttendedCategory }
  ];

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Engagement Profile</p>
          <h3 className="text-base font-bold text-white">Participation</h3>
        </div>
        <HeartPulse className="h-4 w-4 text-violet-200/90" aria-hidden />
      </header>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className={cn(PANEL_INNER, "p-2.5") }>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#96b0db]">{row.label}</p>
            <p className="mt-1 text-sm text-[#dce8ff]">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusBoard({
  data,
  residentPath,
  query,
  focusRows,
  timeZone,
  canEdit,
  showControls,
  title = "Active Care Plan Focuses",
  description = "PCC-style focus statements with linked goals, interventions, and supporting documentation."
}: {
  data: ActivitiesCarePlanData;
  residentPath: string;
  query: ActivitiesCarePlanQuery;
  focusRows: FocusRow[];
  timeZone: string;
  canEdit: boolean;
  showControls?: boolean;
  title?: string;
  description?: string;
}) {
  const editorHref = data.plan ? `${residentPath}/edit` : `${residentPath}/new`;

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={META_LABEL}>Care Plan Workspace</p>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-sm text-[#b8ccef]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PremiumPillButton label="Add Focus" href={editorHref} tone="blue" icon={Plus} />
          <PremiumPillButton label="Template Library" href="#quick-add-templates" tone="violet" />
        </div>
      </header>

      {showControls ? (
        <FocusControlBar residentPath={residentPath} query={query} />
      ) : null}

      {focusRows.length === 0 ? (
        <AttendanceEmptyState
          title="No focus rows match this filter"
          message="Adjust filters or clear search to see all active care plan focuses."
          actionLabel="Reset Filters"
          actionHref={residentPath}
        />
      ) : query.focusView === "board" ? (
        <div className="space-y-3">
          {focusRows.map((row) => (
            <FocusCard
              key={row.id}
              row={row}
              timeZone={timeZone}
              residentId={data.resident.id}
              canEdit={canEdit}
              editorHref={editorHref}
            />
          ))}
        </div>
      ) : (
        <FocusListTable rows={focusRows} timeZone={timeZone} editorHref={editorHref} />
      )}
    </section>
  );
}

function FocusControlBar({ residentPath, query }: { residentPath: string; query: ActivitiesCarePlanQuery }) {
  return (
    <div className={cn(PANEL_SOFT, "mb-3 flex flex-wrap items-center gap-2 p-2") }>
      <PremiumSegmentControl
        items={[
          {
            id: "status-all",
            label: "All",
            href: withQueryHref(residentPath, query, { focusStatus: "all" }),
            active: query.focusStatus === "all"
          },
          {
            id: "status-active",
            label: "Active",
            href: withQueryHref(residentPath, query, { focusStatus: "active" }),
            active: query.focusStatus === "active"
          },
          {
            id: "status-monitor",
            label: "Monitor",
            href: withQueryHref(residentPath, query, { focusStatus: "monitor" }),
            active: query.focusStatus === "monitor"
          },
          {
            id: "status-resolved",
            label: "Resolved",
            href: withQueryHref(residentPath, query, { focusStatus: "resolved" }),
            active: query.focusStatus === "resolved"
          }
        ]}
      />

      <PremiumSegmentControl
        items={[
          {
            id: "priority-all",
            label: "Any Priority",
            href: withQueryHref(residentPath, query, { focusPriority: "all" }),
            active: query.focusPriority === "all"
          },
          {
            id: "priority-high",
            label: "High",
            href: withQueryHref(residentPath, query, { focusPriority: "high" }),
            active: query.focusPriority === "high"
          },
          {
            id: "priority-moderate",
            label: "Moderate",
            href: withQueryHref(residentPath, query, { focusPriority: "moderate" }),
            active: query.focusPriority === "moderate"
          },
          {
            id: "priority-low",
            label: "Low",
            href: withQueryHref(residentPath, query, { focusPriority: "low" }),
            active: query.focusPriority === "low"
          }
        ]}
      />

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <PremiumPillButton
          label={`Sort: ${query.focusSort === "priority" ? "Priority" : query.focusSort === "review" ? "Review" : query.focusSort === "updated" ? "Updated" : "Title"}`}
          href={
            query.focusSort === "priority"
              ? withQueryHref(residentPath, query, { focusSort: "review" })
              : query.focusSort === "review"
                ? withQueryHref(residentPath, query, { focusSort: "updated" })
                : query.focusSort === "updated"
                  ? withQueryHref(residentPath, query, { focusSort: "title" })
                  : withQueryHref(residentPath, query, { focusSort: "priority" })
          }
          tone="neutral"
          icon={SlidersHorizontal}
        />
        <PremiumSegmentControl
          items={[
            {
              id: "view-board",
              label: "Board",
              href: withQueryHref(residentPath, query, { focusView: "board" }),
              active: query.focusView === "board"
            },
            {
              id: "view-list",
              label: "List",
              href: withQueryHref(residentPath, query, { focusView: "list" }),
              active: query.focusView === "list"
            }
          ]}
        />
      </div>
    </div>
  );
}

function FocusListTable({ rows, timeZone, editorHref }: { rows: FocusRow[]; timeZone: string; editorHref: string }) {
  return (
    <div className={cn(PANEL_INNER, "overflow-x-auto") }>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#2e426c] text-[11px] uppercase tracking-[0.12em] text-[#9ab4df]">
          <tr>
            <th className="px-3 py-2 font-semibold">Focus</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Priority</th>
            <th className="px-3 py-2 font-semibold">Review Due</th>
            <th className="px-3 py-2 font-semibold">Goals</th>
            <th className="px-3 py-2 font-semibold">Interventions</th>
            <th className="px-3 py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[#203353] text-[#dce8ff]">
              <td className="px-3 py-3">
                <p className="font-semibold">{row.title}</p>
                <p className="mt-1 text-xs text-[#9fb8e0]">{row.statement}</p>
              </td>
              <td className="px-3 py-3">
                <Badge className={cn("border", focusStatusTone(row.status))}>{row.status}</Badge>
              </td>
              <td className="px-3 py-3">
                <Badge className={cn("border", priorityTone(row.priority))}>{row.priority}</Badge>
              </td>
              <td className="px-3 py-3 text-xs text-[#b5cbed]">{formatDate(row.reviewDateIso, timeZone)}</td>
              <td className="px-3 py-3 text-xs text-[#b5cbed]">{row.goals.length}</td>
              <td className="px-3 py-3 text-xs text-[#b5cbed]">{row.interventions.length}</td>
              <td className="px-3 py-3">
                <PremiumPillButton label="Edit" href={editorHref} tone="neutral" size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FocusCard({
  row,
  timeZone,
  residentId,
  canEdit,
  editorHref
}: {
  row: FocusRow;
  timeZone: string;
  residentId: string;
  canEdit: boolean;
  editorHref: string;
}) {
  return (
    <article className={cn(PANEL_SOFT, "overflow-hidden p-3") }>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-black text-white">{row.title}</h4>
            <Badge className={cn("border", focusStatusTone(row.status))}>{row.status}</Badge>
            <Badge className={cn("border", priorityTone(row.priority))}>{row.priority}</Badge>
          </div>
          <p className="mt-1 text-sm text-[#c3d6f5]">{row.statement}</p>
          <p className="mt-1 text-xs text-[#95afd9]">{row.rationale}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CarePlanStatusChip label={row.triggerSource} />
          <CarePlanStatusChip label={`Owner: ${row.owner}`} />
          <EditFocusDrawer editorHref={editorHref} canEdit={canEdit} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <FocusMeta label="Start" value={formatDate(row.startDateIso, timeZone)} />
        <FocusMeta label="Review Due" value={formatDate(row.reviewDateIso, timeZone)} />
        <FocusMeta label="Updated" value={formatDateTime(row.updatedAtIso, timeZone)} />
        <FocusMeta label="Resident" value={`Room linked · ${residentId.slice(0, 8)}…`} />
      </div>

      <div className="mt-3 space-y-2">
        <details open className={cn(PANEL_INNER, "p-2") }>
          <summary className="cursor-pointer list-none text-sm font-semibold text-[#dce8ff]">
            Goals ({row.goals.length})
          </summary>
          <div className="mt-2 space-y-2">
            {row.goals.length > 0 ? (
              row.goals.map((goal) => <GoalCard key={goal.id} goal={goal} timeZone={timeZone} editorHref={editorHref} canEdit={canEdit} />)
            ) : (
              <p className="rounded-lg border border-dashed border-[#39557f] px-3 py-2 text-xs text-[#9cb5de]">
                No goals added yet.
              </p>
            )}
          </div>
        </details>

        <details className={cn(PANEL_INNER, "p-2") }>
          <summary className="cursor-pointer list-none text-sm font-semibold text-[#dce8ff]">
            Interventions ({row.interventions.length})
          </summary>
          <div className="mt-2 space-y-2">
            {row.interventions.length > 0 ? (
              row.interventions.map((intervention) => (
                <InterventionRow key={intervention.id} row={intervention} timeZone={timeZone} editorHref={editorHref} canEdit={canEdit} />
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-[#39557f] px-3 py-2 text-xs text-[#9cb5de]">
                No interventions documented.
              </p>
            )}
          </div>
        </details>

        <details className={cn(PANEL_INNER, "p-2") }>
          <summary className="cursor-pointer list-none text-sm font-semibold text-[#dce8ff]">
            Related Documentation ({row.relatedDocs.length})
          </summary>
          <div className="mt-2 space-y-2">
            {row.relatedDocs.length > 0 ? (
              row.relatedDocs.slice(0, 5).map((doc) => (
                <Link
                  key={doc.id}
                  href={doc.href}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#2d436d] bg-[#10203b] px-3 py-2 text-xs text-[#d6e5ff] hover:border-[#3f5f95]"
                >
                  <span className="font-semibold">{doc.title}</span>
                  <span className="text-[#9cb6df]">{formatDate(doc.createdAtIso, timeZone)}</span>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-[#39557f] px-3 py-2 text-xs text-[#9cb5de]">No linked documentation.</p>
            )}
          </div>
        </details>

        <details className={cn(PANEL_INNER, "p-2") }>
          <summary className="cursor-pointer list-none text-sm font-semibold text-[#dce8ff]">
            Review Notes ({row.reviewNotes.length})
          </summary>
          <div className="mt-2 space-y-2">
            {row.reviewNotes.length > 0 ? (
              row.reviewNotes.slice(0, 4).map((review) => (
                <div key={review.id} className="rounded-lg border border-[#2d436d] bg-[#10203b] px-3 py-2">
                  <p className="text-xs font-semibold text-[#d8e7ff]">
                    {review.reason} · {formatDate(review.reviewDateIso, timeZone)}
                  </p>
                  <p className="mt-1 text-xs text-[#a7c0e9]">{review.note || "No review note entered."}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-[#39557f] px-3 py-2 text-xs text-[#9cb5de]">No review notes yet.</p>
            )}
          </div>
        </details>

        {row.status === "Resolved" ? (
          <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            Resolution block: focus resolved and retained for historical care plan continuity.
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FocusMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(PANEL_INNER, "px-2.5 py-2") }>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94add8]">{label}</p>
      <p className="mt-1 text-xs text-[#dae7ff]">{value}</p>
    </div>
  );
}

function GoalCard({ goal, timeZone, editorHref, canEdit }: { goal: GoalRow; timeZone: string; editorHref: string; canEdit: boolean }) {
  return (
    <div className={cn(PANEL_INNER, "p-2.5") }>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#dfeaff]">{goal.statement}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={cn("border", progressTone(goal.progress))}>{goal.progress}</Badge>
          <Badge className={cn("border", dueTone(goal.dueLevel))}>{goal.dueLabel}</Badge>
          <EditGoalDrawer editorHref={editorHref} canEdit={canEdit} />
        </div>
      </div>
      <div className="mt-2 grid gap-2 text-xs text-[#a6bfe8] sm:grid-cols-3">
        <p>Target: {formatDate(goal.targetDateIso, timeZone)}</p>
        <p>Review: {goal.reviewFrequency}</p>
        <p>Updated: {formatDate(goal.lastUpdatedIso, timeZone)}</p>
      </div>
      <p className="mt-1 text-xs text-[#92add9]">{goal.outcomeSummary}</p>
    </div>
  );
}

function InterventionRow({ row, timeZone, editorHref, canEdit }: { row: InterventionRowModel; timeZone: string; editorHref: string; canEdit: boolean }) {
  return (
    <div className={cn(PANEL_INNER, "p-2.5") }>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#dfeaff]">{row.statement}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={cn("border", effectivenessTone(row.effectiveness))}>{row.effectiveness}</Badge>
          <EditInterventionDrawer editorHref={editorHref} canEdit={canEdit} />
        </div>
      </div>
      <div className="mt-2 grid gap-2 text-xs text-[#a6bfe8] sm:grid-cols-4">
        <p>Frequency: {row.frequency}</p>
        <p>Discipline: {row.assignedDiscipline}</p>
        <p>Start: {formatDate(row.startDateIso, timeZone)}</p>
        <p>Last done: {formatDate(row.lastCompletedDateIso, timeZone)}</p>
      </div>
      <p className="mt-1 text-xs text-[#92add9]">
        Next due {formatDate(row.nextDueDateIso, timeZone)}
        {row.notes ? ` · ${row.notes}` : ""}
      </p>
    </div>
  );
}

function CarePlanHealthPanel({
  carePlanHealth,
  timeZone
}: {
  carePlanHealth: ReturnType<typeof buildCarePlanHealth>;
  timeZone: string;
}) {
  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Health Signal</p>
          <h3 className="text-base font-bold text-white">Care Plan Health</h3>
        </div>
        <Workflow className="h-4 w-4 text-cyan-200" aria-hidden />
      </header>
      <div className={cn(PANEL_INNER, "p-3") }>
        <p className="text-xl font-black text-white">{carePlanHealth.state}</p>
        <p className="mt-1 text-xs text-[#9db6df]">Score {carePlanHealth.score}%</p>
        <div className="mt-2 h-2 rounded-full bg-[#122341]">
          <div
            className={cn(
              "h-2 rounded-full",
              carePlanHealth.state === "Healthy"
                ? "bg-emerald-400"
                : carePlanHealth.state === "Needs Review"
                  ? "bg-amber-400"
                  : "bg-rose-400"
            )}
            style={{ width: `${carePlanHealth.score}%` }}
          />
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-xs text-[#c9dbfa]">
        <div className="flex items-center justify-between gap-2">
          <dt>Overdue items</dt>
          <dd>{carePlanHealth.overdueCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt>Due soon</dt>
          <dd>{carePlanHealth.dueSoonCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt>Unresolved focuses</dt>
          <dd>{carePlanHealth.unresolvedFocuses}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt>Latest review</dt>
          <dd>{formatDate(carePlanHealth.latestReviewIso, timeZone)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ParticipationInsightsPanel({
  data,
  compact,
  detailed
}: {
  data: ActivitiesCarePlanData;
  compact?: boolean;
  detailed?: boolean;
}) {
  const response = data.participation.responseBreakdown;

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Participation & Response</p>
          <h3 className="text-base font-bold text-white">Participation Panel</h3>
        </div>
        <TrendingUp className="h-4 w-4 text-cyan-200" aria-hidden />
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <MetricMini label="Last 7 days" value={`${data.participation.sevenDayPercent}%`} />
        <MetricMini label="Last 30 days" value={`${data.participation.thirtyDayPercent}%`} />
        <MetricMini label="Group attendance" value={String(data.participation.groupAttendance30d)} />
        <MetricMini label="1:1 this month" value={String(data.participation.oneToOneThisMonth)} />
        <MetricMini label="Refusals" value={String(data.participation.refusalsThisMonth)} tone="warning" />
        <MetricMini label="Best window" value={data.participation.bestTimeWindow} />
      </div>

      <div className="mt-3 space-y-2">
        <p className={META_LABEL}>Response Breakdown</p>
        <ResponseBar label="Positive" value={response.positivePercent} tone="bg-emerald-400" />
        <ResponseBar label="Neutral" value={response.neutralPercent} tone="bg-blue-400" />
        <ResponseBar label="Resistant" value={response.resistantPercent} tone="bg-rose-400" />
      </div>

      {compact ? null : (
        <div className="mt-3 grid gap-2 text-xs text-[#b7ccee] sm:grid-cols-2">
          <div className={cn(PANEL_INNER, "p-2.5") }>
            <p className={META_LABEL}>Most attended category</p>
            <p className="mt-1 text-sm text-[#dce8ff]">{data.participation.mostAttendedCategory}</p>
          </div>
          <div className={cn(PANEL_INNER, "p-2.5") }>
            <p className={META_LABEL}>Independent engagement</p>
            <p className="mt-1 text-sm text-[#dce8ff]">{data.participation.independentEngagement30d} entries</p>
          </div>
        </div>
      )}

      {detailed ? (
        <div className="mt-3 rounded-xl border border-[#2f4770] bg-[#0f1d35] p-3">
          <p className="text-sm font-semibold text-[#dce8ff]">Engagement Notes</p>
          <ul className="mt-2 space-y-1 text-xs text-[#a8c0e8]">
            <li>- Keep highest-value interventions aligned to {data.participation.bestTimeWindow.toLowerCase()} windows.</li>
            <li>- Link refusals to follow-up notes when participation drops below baseline.</li>
            <li>- Use 1:1 pathway to stabilize engagement when group attendance declines.</li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function MetricMini({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <div className={cn(PANEL_INNER, "p-2.5") }>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#97b1db]">{label}</p>
      <p className={cn("mt-1 text-sm font-bold", tone === "warning" ? "text-amber-100" : "text-[#e0ebff]")}>{value}</p>
    </div>
  );
}

function ResponseBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[#a8c0e8]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#122540]">
        <div className={cn("h-2 rounded-full", tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function UpcomingDuePanel({ dueItems, timeZone }: { dueItems: DueItem[]; timeZone: string }) {
  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Due Queue</p>
          <h3 className="text-base font-bold text-white">Upcoming / Due</h3>
        </div>
        <CalendarRange className="h-4 w-4 text-cyan-200" aria-hidden />
      </header>
      <div className="space-y-2">
        {dueItems.length > 0 ? (
          dueItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-2 rounded-xl border border-[#2f4770] bg-[#0f1d35] px-3 py-2 hover:border-[#44659b]"
            >
              <div>
                <p className="text-sm font-semibold text-[#deebff]">{item.title}</p>
                <p className="text-xs text-[#a3bde6]">{item.detail}</p>
                <p className="mt-1 text-[11px] text-[#8ca8d6]">{formatDate(item.dateIso, timeZone)}</p>
              </div>
              <Badge className={cn("border", dueTone(item.level))}>{item.level.replaceAll("_", " ")}</Badge>
            </Link>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[#3a5683] px-3 py-2 text-xs text-[#9ab4df]">
            No urgent due items. Care plan timing is currently on track.
          </p>
        )}
      </div>
    </section>
  );
}

function RelatedDocsPanel({
  data,
  timeZone,
  compact,
  detailed
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  compact?: boolean;
  detailed?: boolean;
}) {
  const grouped = {
    progress: data.docs.filter((doc) => doc.kind === "PROGRESS"),
    oneToOne: data.docs.filter((doc) => doc.kind === "ONE_TO_ONE"),
    uda: data.docs.filter((doc) => doc.kind === "UDA"),
    mds: data.docs.filter((doc) => doc.kind === "MDS")
  };

  const visibleDocs = compact ? data.docs.slice(0, 6) : data.docs;

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Documentation Links</p>
          <h3 className="text-base font-bold text-white">Related Documentation</h3>
        </div>
        <FileText className="h-4 w-4 text-cyan-200" aria-hidden />
      </header>

      {detailed ? (
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <MetricMini label="Progress Notes" value={String(grouped.progress.length)} />
          <MetricMini label="1:1 Notes" value={String(grouped.oneToOne.length)} />
          <MetricMini label="UDA" value={String(grouped.uda.length)} />
          <MetricMini label="MDS" value={String(grouped.mds.length)} />
        </div>
      ) : null}

      <div className="space-y-2">
        {visibleDocs.length > 0 ? (
          visibleDocs.map((doc) => (
            <Link
              key={doc.id}
              href={doc.href}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#2f4770] bg-[#0f1d35] px-3 py-2 hover:border-[#44659b]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#deebff]">{doc.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-[#a5c0e8]">{doc.summary || "No summary available."}</p>
                <p className="mt-1 text-[11px] text-[#8faad6]">
                  {formatDateTime(doc.createdAtIso, timeZone)} · {doc.author}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge className="border border-[#3c588f] bg-[#17335f] text-[11px] text-[#d7e7ff]">{doc.status}</Badge>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#a8c1eb]" aria-hidden />
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[#3a5683] px-3 py-2 text-xs text-[#9ab4df]">No linked documentation yet.</p>
        )}
      </div>
    </section>
  );
}

function ReviewTimelinePanel({
  data,
  timeZone,
  compact,
  detailed
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  compact?: boolean;
  detailed?: boolean;
}) {
  const rows = compact ? data.reviewTimeline.slice(0, 5) : data.reviewTimeline;

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Review Timeline</p>
          <h3 className="text-base font-bold text-white">History</h3>
        </div>
        <Clock3 className="h-4 w-4 text-cyan-200" aria-hidden />
      </header>

      <div className="space-y-2">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-[#2f4770] bg-[#0f1d35] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#deebff]">{row.reason}</p>
                <Badge className="border border-[#3c588f] bg-[#17335f] text-[11px] text-[#d7e7ff]">{row.result.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-xs text-[#a5c0e8]">{row.note || "No review note entered."}</p>
              <p className="mt-1 text-[11px] text-[#8faad6]">
                {formatDate(row.reviewDateIso, timeZone)} · Next {formatDate(row.nextReviewDateAfterIso, timeZone)}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-[#3a5683] px-3 py-2 text-xs text-[#9ab4df]">No reviews have been documented yet.</p>
        )}
      </div>

      {detailed ? (
        <div className="mt-3 rounded-xl border border-[#2f4770] bg-[#0f1d35] p-3">
          <p className="text-sm font-semibold text-[#deebff]">Interdisciplinary Signoff Snapshot</p>
          <ul className="mt-2 space-y-1 text-xs text-[#a8c0e8]">
            {data.interdisciplinary.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-2">
                <span>{item.label}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5",
                    item.state === "Reviewed"
                      ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-100"
                      : item.state === "Pending"
                        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                        : "border-[#3b5686] bg-[#16305b] text-[#d2e3ff]"
                  )}
                >
                  {item.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CarePlanTabs({ residentPath, query }: { residentPath: string; query: ActivitiesCarePlanQuery }) {
  return (
    <section className={cn(PANEL, "p-3") }>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PremiumSegmentControl
          items={[
            { id: "overview", label: "Overview", href: withQueryHref(residentPath, query, { tab: "overview" }), active: query.tab === "overview" },
            { id: "focuses", label: "Focuses", href: withQueryHref(residentPath, query, { tab: "focuses" }), active: query.tab === "focuses" },
            {
              id: "goals",
              label: "Goals & Interventions",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions" }),
              active: query.tab === "goals-interventions"
            },
            {
              id: "participation",
              label: "Participation",
              href: withQueryHref(residentPath, query, { tab: "participation" }),
              active: query.tab === "participation"
            },
            {
              id: "docs",
              label: "Documents",
              href: withQueryHref(residentPath, query, { tab: "documents" }),
              active: query.tab === "documents"
            },
            {
              id: "history",
              label: "History",
              href: withQueryHref(residentPath, query, { tab: "history" }),
              active: query.tab === "history"
            }
          ]}
        />

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#9eb7e0]">
          <span className="rounded-full border border-[#3a5482] bg-[#142b4f] px-2 py-1">Structured clinical workflow</span>
          <span className="rounded-full border border-[#3a5482] bg-[#142b4f] px-2 py-1">Resident-centered</span>
        </div>
      </div>
    </section>
  );
}

function GoalsInterventionsWorkspace({
  residentPath,
  query,
  focusRows,
  timeZone,
  canEdit
}: {
  residentPath: string;
  query: ActivitiesCarePlanQuery;
  focusRows: FocusRow[];
  timeZone: string;
  canEdit: boolean;
}) {
  const focusOptions = [
    { id: "all", label: "All Focuses" },
    ...focusRows.map((row) => ({ id: row.id, label: row.title }))
  ];

  const goalRows = focusRows
    .flatMap((focus) =>
      focus.goals.map((goal) => ({
        id: goal.id,
        focusId: focus.id,
        focusTitle: focus.title,
        statement: goal.statement,
        targetDateIso: goal.targetDateIso,
        dueLabel: goal.dueLabel,
        dueLevel: goal.dueLevel,
        progress: goal.progress,
        reviewFrequency: goal.reviewFrequency,
        updatedAtIso: goal.lastUpdatedIso
      }))
    )
    .filter((row) => (query.giFocus === "all" ? true : row.focusId === query.giFocus))
    .filter((row) => {
      if (query.giStatus === "all") return true;
      if (query.giStatus === "not-met") return row.progress === "Not Met";
      if (query.giStatus === "met") return row.progress === "Met";
      if (query.giStatus === "revised") return row.progress === "Revised";
      return row.progress === "Ongoing";
    });

  const interventionRows = focusRows
    .flatMap((focus) =>
      focus.interventions.map((intervention) => ({
        id: intervention.id,
        focusId: focus.id,
        focusTitle: focus.title,
        statement: intervention.statement,
        frequency: intervention.frequency,
        assignedDiscipline: intervention.assignedDiscipline,
        effectiveness: intervention.effectiveness,
        nextDueDateIso: intervention.nextDueDateIso,
        lastCompletedDateIso: intervention.lastCompletedDateIso
      }))
    )
    .filter((row) => (query.giFocus === "all" ? true : row.focusId === query.giFocus));

  return (
    <section className={cn(PANEL, "space-y-3 p-4") }>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={META_LABEL}>Centralized Editor</p>
          <h3 className="text-lg font-black text-white">Goals & Interventions</h3>
          <p className="mt-1 text-sm text-[#b8ccef]">Cross-focus view for due status, progress, and treatment cadence.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PremiumPillButton label="Add Goal" href={`${residentPath}/edit`} tone="violet" />
          <PremiumPillButton label="Add Intervention" href={`${residentPath}/edit`} tone="sky" />
        </div>
      </header>

      <div className={cn(PANEL_SOFT, "flex flex-wrap items-center gap-2 p-2") }>
        <PremiumSegmentControl
          items={focusOptions.map((option) => ({
            id: `focus-${option.id}`,
            label: option.label,
            href: withQueryHref(residentPath, query, { tab: "goals-interventions", giFocus: option.id }),
            active: query.giFocus === option.id
          }))}
        />
        <PremiumSegmentControl
          items={[
            {
              id: "status-all",
              label: "All Status",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions", giStatus: "all" }),
              active: query.giStatus === "all"
            },
            {
              id: "status-ongoing",
              label: "Ongoing",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions", giStatus: "ongoing" }),
              active: query.giStatus === "ongoing"
            },
            {
              id: "status-met",
              label: "Met",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions", giStatus: "met" }),
              active: query.giStatus === "met"
            },
            {
              id: "status-not-met",
              label: "Not Met",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions", giStatus: "not-met" }),
              active: query.giStatus === "not-met"
            },
            {
              id: "status-revised",
              label: "Revised",
              href: withQueryHref(residentPath, query, { tab: "goals-interventions", giStatus: "revised" }),
              active: query.giStatus === "revised"
            }
          ]}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className={cn(PANEL_INNER, "overflow-x-auto") }>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2e426c] text-[11px] uppercase tracking-[0.12em] text-[#9ab4df]">
              <tr>
                <th className="px-3 py-2 font-semibold">Goal</th>
                <th className="px-3 py-2 font-semibold">Focus</th>
                <th className="px-3 py-2 font-semibold">Target</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {goalRows.length > 0 ? (
                goalRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#203353] text-[#dce8ff]">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{row.statement}</p>
                      <p className="mt-1 text-xs text-[#9db8df]">{row.reviewFrequency}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#b6ccee]">{row.focusTitle}</td>
                    <td className="px-3 py-3 text-xs text-[#b6ccee]">
                      {formatDate(row.targetDateIso, timeZone)}
                      <div>
                        <Badge className={cn("mt-1 border", dueTone(row.dueLevel))}>{row.dueLabel}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={cn("border", progressTone(row.progress))}>{row.progress}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <EditGoalDrawer editorHref={`${residentPath}/edit`} canEdit={canEdit} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#9db6de]">
                    No goals match this filter set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={cn(PANEL_INNER, "overflow-x-auto") }>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2e426c] text-[11px] uppercase tracking-[0.12em] text-[#9ab4df]">
              <tr>
                <th className="px-3 py-2 font-semibold">Intervention</th>
                <th className="px-3 py-2 font-semibold">Frequency</th>
                <th className="px-3 py-2 font-semibold">Effectiveness</th>
                <th className="px-3 py-2 font-semibold">Due</th>
              </tr>
            </thead>
            <tbody>
              {interventionRows.length > 0 ? (
                interventionRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#203353] text-[#dce8ff]">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{row.statement}</p>
                      <p className="mt-1 text-xs text-[#9db8df]">{row.focusTitle}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#b6ccee]">{row.frequency}</td>
                    <td className="px-3 py-3">
                      <Badge className={cn("border", effectivenessTone(row.effectiveness))}>{row.effectiveness}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#b6ccee]">
                      {formatDate(row.nextDueDateIso, timeZone)}
                      <div className="mt-1">
                        <EditInterventionDrawer editorHref={`${residentPath}/edit`} canEdit={canEdit} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-[#9db6de]">
                    No interventions match this filter set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CarePlanRecommendations({ data, dueItems }: { data: ActivitiesCarePlanData; dueItems: DueItem[] }) {
  const recommendations: string[] = [];

  if (data.summary.oneToOneNeeded) {
    recommendations.push("Schedule 1:1 documentation for this resident this month.");
  }
  if (data.summary.refusalsThisMonth > 2) {
    recommendations.push("Review refusal triggers and adjust intervention timing.");
  }
  if (data.summary.documentationCompletionPercent < 75) {
    recommendations.push("Documentation completion is below target; close missing entries.");
  }
  if (dueItems.some((item) => item.level === "OVERDUE")) {
    recommendations.push("At least one due item is overdue and should be addressed first.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Current care plan indicators are stable and on track.");
  }

  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden />
        <h3 className="text-base font-bold text-white">Next Actions</h3>
      </header>
      <ul className="space-y-2 text-sm text-[#c8daf7]">
        {recommendations.map((item) => (
          <li key={item} className="flex items-start gap-2 rounded-xl border border-[#2f4770] bg-[#0f1d35] px-3 py-2">
            <ChevronRight className="mt-0.5 h-4 w-4 text-blue-300" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickAddFocusDrawer({ residentId, hasPlan }: { residentId: string; hasPlan: boolean }) {
  const baseHref = hasPlan ? `/app/residents/${residentId}/care-plan/edit` : `/app/residents/${residentId}/care-plan/new`;

  const templateCards = [
    {
      title: "Social isolation risk",
      key: "socialEngagementBoost",
      subtitle: "Peer contact + group consistency",
      accent: "from-cyan-300/25 to-blue-400/25"
    },
    {
      title: "Bedbound / adapted programming",
      key: "bedBoundEssential",
      subtitle: "Bedside engagement and comfort",
      accent: "from-amber-300/25 to-orange-400/25"
    },
    {
      title: "Dementia-friendly engagement",
      key: "dementiaFriendlyEngagement",
      subtitle: "Cueing + sensory structure",
      accent: "from-violet-300/25 to-fuchsia-400/25"
    },
    {
      title: "Independent leisure preference",
      key: "independentLeisureSupport",
      subtitle: "Self-directed activity supports",
      accent: "from-sky-300/25 to-cyan-400/25"
    },
    {
      title: "Mood adjustment support",
      key: "moodAdjustmentSupport",
      subtitle: "Calm engagement strategies",
      accent: "from-rose-300/25 to-pink-400/25"
    },
    {
      title: "New admission adjustment",
      key: "newAdmissionAdjustment",
      subtitle: "Early transition support",
      accent: "from-emerald-300/25 to-teal-400/25"
    }
  ];

  return (
    <section id="quick-add-templates" className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={META_LABEL}>Quick-Add Template Library</p>
          <h3 className="text-base font-bold text-white">Focus Templates</h3>
          <p className="mt-1 text-sm text-[#b8ccef]">Apply a template to prefill focus statement, goals, interventions, and review cadence.</p>
        </div>
        <PremiumPillButton label="Open Full Editor" href={baseHref} tone="blue" icon={ArrowRight} />
      </header>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {templateCards.map((card) => {
          const template = CARE_PLAN_TEMPLATES.find((item) => item.key === card.key);
          const href = `${baseHref}?template=${card.key}`;
          return (
            <Link
              key={card.key}
              href={href}
              className={cn(PANEL_INNER, "relative overflow-hidden p-3 transition hover:-translate-y-0.5 hover:border-[#45679f]")}
            >
              <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r", card.accent)} />
              <p className="relative z-10 text-sm font-semibold text-[#e1ebff]">{card.title}</p>
              <p className="relative z-10 mt-1 text-xs text-[#a7c0e8]">{card.subtitle}</p>
              <p className="relative z-10 mt-2 text-[11px] text-[#8faad6]">
                {template ? `${template.defaultGoalTemplates.length} goals · ${template.defaultInterventions.length} interventions` : "Template preset"}
              </p>
              <span className="relative z-10 mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#bdd1f5]">
                Apply template
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CarePlanStatusChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#3a578a] bg-[#142d53] px-2.5 py-1 text-[11px] font-semibold text-[#d6e5ff]">
      {label}
    </span>
  );
}

function EditFocusDrawer({ editorHref, canEdit }: { editorHref: string; canEdit: boolean }) {
  if (!canEdit) {
    return <CarePlanStatusChip label="Read only" />;
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-full border border-[#3a578a] bg-[#142d53] px-2.5 py-1 text-[11px] font-semibold text-[#d6e5ff]">
        Focus Actions
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-[#3a578a] bg-[#0f1d35] p-2 shadow-xl">
        <Link href={editorHref} className="block rounded-lg px-2 py-1.5 text-xs text-[#d9e7ff] hover:bg-white/5">
          Edit focus details
        </Link>
        <Link href={editorHref} className="mt-1 block rounded-lg px-2 py-1.5 text-xs text-[#d9e7ff] hover:bg-white/5">
          Add goal
        </Link>
        <Link href={editorHref} className="mt-1 block rounded-lg px-2 py-1.5 text-xs text-[#d9e7ff] hover:bg-white/5">
          Add intervention
        </Link>
      </div>
    </details>
  );
}

function EditGoalDrawer({ editorHref, canEdit }: { editorHref: string; canEdit: boolean }) {
  if (!canEdit) return null;
  return <PremiumPillButton label="Edit" href={editorHref} tone="neutral" size="sm" />;
}

function EditInterventionDrawer({ editorHref, canEdit }: { editorHref: string; canEdit: boolean }) {
  if (!canEdit) return null;
  return <PremiumPillButton label="Edit" href={editorHref} tone="neutral" size="sm" />;
}

function InterdisciplinaryPanel({ data }: { data: ActivitiesCarePlanData }) {
  return (
    <section className={cn(PANEL, "p-4") }>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className={META_LABEL}>Interdisciplinary Involvement</p>
          <h3 className="text-base font-bold text-white">Signoff Status</h3>
        </div>
        <UserRound className="h-4 w-4 text-cyan-200" aria-hidden />
      </header>
      <div className="space-y-2">
        {data.interdisciplinary.map((item) => (
          <div key={item.key} className={cn(PANEL_INNER, "flex items-center justify-between gap-2 px-3 py-2") }>
            <p className="text-sm text-[#dce8ff]">{item.label}</p>
            <Badge
              className={cn(
                "border",
                item.state === "Reviewed"
                  ? "border-emerald-400/45 bg-emerald-500/15 text-emerald-100"
                  : item.state === "Pending"
                    ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
                    : "border-[#395782] bg-[#15305a] text-[#d3e3ff]"
              )}
            >
              {item.state}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttendanceEmptyState({
  title,
  message,
  actionLabel,
  actionHref
}: {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#3b5886] bg-[#10213e] p-5 text-center">
      <h4 className="text-base font-bold text-white">{title}</h4>
      <p className="mt-2 text-sm text-[#a7c1e9]">{message}</p>
      <Link
        href={actionHref}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#44679f] bg-[#16305a] px-3 py-1.5 text-xs font-semibold text-[#d6e5ff]"
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
