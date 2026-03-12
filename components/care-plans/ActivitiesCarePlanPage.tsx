import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  ListChecks,
  Plus,
  ShieldCheck,
  Target,
  Users,
  Workflow
} from "lucide-react";

import type { getResidentActivitiesCarePlanData } from "@/app/app/care-plans/_actions/actions";
import { TopContentHeader } from "@/components/app/TopContentHeader";
import { StatusBadge } from "@/components/care-plans/StatusBadge";
import { PremiumInputField } from "@/components/dashboard/v4/PremiumInputField";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { PremiumSegmentControl } from "@/components/dashboard/v4/PremiumSegmentControl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CARE_PLAN_TEMPLATES, getGoalTemplateByKey } from "@/lib/care-plans/templates";
import { focusAreaLabel } from "@/lib/care-plans/enums";
import type { CarePlanDisplayStatus } from "@/lib/care-plans/status";
import type { AssessmentDueLevel, ResidentAssessmentSchedule } from "@/lib/residents/assessment-due";
import { formatInTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type ActivitiesCarePlanData = NonNullable<Awaited<ReturnType<typeof getResidentActivitiesCarePlanData>>>;

export type ActivitiesCarePlanTab =
  | "overview"
  | "focuses"
  | "goals-interventions"
  | "participation"
  | "documents"
  | "history";

type FocusPriority = "Low" | "Moderate" | "High";

type FocusRow = {
  id: string;
  title: string;
  status: "Active" | "Monitor" | "Resolved";
  dateAddedIso: string | null;
  triggerSource: string;
  priority: FocusPriority;
  reviewDateIso: string | null;
  focusStatement: string;
  rationale: string;
  goals: Array<{
    id: string;
    statement: string;
    targetDateIso: string;
    reviewFrequency: string;
    progress: "Ongoing" | "Met" | "Not Met" | "Revised";
    outcomeSummary: string;
  }>;
  interventions: Array<{
    id: string;
    statement: string;
    frequency: string;
    assignedDiscipline: string;
    startDateIso: string;
    lastCompletedDateIso: string | null;
    effectiveness: "Effective" | "Somewhat Effective" | "Ineffective" | "Needs Review";
    notes: string | null;
  }>;
  relatedDocuments: Array<ActivitiesCarePlanData["docs"][number]>;
  reviewNotes: Array<ActivitiesCarePlanData["reviewTimeline"][number]>;
};

function formatDate(iso: string | null, timeZone: string) {
  if (!iso) return "Not set";
  return formatInTimeZone(new Date(iso), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function dueTone(level: AssessmentDueLevel) {
  if (level === "OVERDUE") return "border-rose-400/50 bg-rose-500/18 text-rose-100";
  if (level === "DUE_TODAY" || level === "DUE_SOON_7") return "border-amber-300/55 bg-amber-500/18 text-amber-100";
  if (level === "DUE_SOON_14" || level === "DUE_SOON_30") return "border-yellow-300/45 bg-yellow-500/14 text-yellow-100";
  if (level === "ON_TRACK") return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  if (level === "INACTIVE") return "border-slate-400/35 bg-slate-500/14 text-slate-200";
  return "border-[#3a5d93] bg-[#132648] text-[#d9e6ff]";
}

function progressTone(progress: FocusRow["goals"][number]["progress"]) {
  if (progress === "Met") return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  if (progress === "Not Met") return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  if (progress === "Revised") return "border-violet-400/45 bg-violet-500/16 text-violet-100";
  return "border-blue-400/45 bg-blue-500/16 text-blue-100";
}

function effectivenessTone(effectiveness: FocusRow["interventions"][number]["effectiveness"]) {
  if (effectiveness === "Effective") return "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";
  if (effectiveness === "Somewhat Effective") return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  if (effectiveness === "Ineffective") return "border-rose-400/45 bg-rose-500/16 text-rose-100";
  return "border-violet-400/45 bg-violet-500/16 text-violet-100";
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

function sectionHref(basePath: string, tab: ActivitiesCarePlanTab) {
  return tab === "overview" ? basePath : `${basePath}?tab=${tab}`;
}

function mapFocusRows(data: ActivitiesCarePlanData): FocusRow[] {
  const plan = data.plan;
  if (!plan) return [];

  const goalFocusMap = new Map<string, string>();
  for (const goal of plan.goals) {
    if (!goal.templateKey) continue;
    const template = getGoalTemplateByKey(goal.templateKey);
    if (!template) continue;
    goalFocusMap.set(goal.id, template.focusArea);
  }

  const unmatchedGoalIds = new Set(
    plan.goals
      .filter((goal) => !goalFocusMap.get(goal.id))
      .map((goal) => goal.id)
  );

  const focusKeys = plan.focusAreasList.length > 0 ? plan.focusAreasList : ["LEISURE_ENGAGEMENT"];

  return focusKeys.map((focusKey, index) => {
    const goalsForFocus = plan.goals.filter((goal) => {
      const mapped = goalFocusMap.get(goal.id);
      if (mapped) return mapped === focusKey;
      return index === 0 && unmatchedGoalIds.has(goal.id);
    });

    const interventionsForFocus = plan.interventions.filter((item) => {
      if (focusKey === "SOCIALIZATION" || focusKey === "COMMUNITY_INTEGRATION") {
        return item.type === "GROUP" || item.type === "ONE_TO_ONE";
      }
      if (focusKey === "SENSORY_STIMULATION" || focusKey === "BEHAVIORAL_SUPPORT") {
        return item.type === "ONE_TO_ONE" || item.type === "INDEPENDENT";
      }
      if (focusKey === "PHYSICAL_ENGAGEMENT") {
        return item.type === "GROUP" || item.type === "INDEPENDENT";
      }
      return true;
    });

    const reviewNotes = data.reviewTimeline.slice(0, 3);

    const goalRows: FocusRow["goals"] = goalsForFocus.map((goal) => {
      const template = goal.templateKey ? getGoalTemplateByKey(goal.templateKey) : null;
      const goalText = template?.text || goal.customText || "Resident will engage with preference-based programming.";
      const targetDate = new Date(plan.createdAt);
      targetDate.setDate(targetDate.getDate() + goal.timeframeDays);

      let progress: FocusRow["goals"][number]["progress"] = "Ongoing";
      if (data.trend === "UP") progress = "Met";
      if (data.trend === "DOWN") progress = "Revised";
      if (data.displayStatus === "OVERDUE") progress = "Not Met";

      return {
        id: goal.id,
        statement: goalText,
        targetDateIso: targetDate.toISOString(),
        reviewFrequency: `${Math.max(7, Math.round(goal.timeframeDays / 3))} days`,
        progress,
        outcomeSummary:
          data.trend === "UP"
            ? "Resident response has improved with current approach."
            : data.trend === "DOWN"
              ? "Response has declined; revise cueing and schedule."
              : "Continue current approach and monitor response weekly."
      };
    });

    const interventionRows: FocusRow["interventions"] = interventionsForFocus.slice(0, 6).map((intervention) => ({
      id: intervention.id,
      statement: intervention.title,
      frequency: plan.frequency === "THREE_PER_WEEK" ? "3x weekly" : plan.frequency.toLowerCase().replaceAll("_", " "),
      assignedDiscipline: "Activities",
      startDateIso: plan.createdAt.toISOString(),
      lastCompletedDateIso: data.docs[0]?.createdAtIso ?? null,
      effectiveness:
        data.trend === "UP"
          ? "Effective"
          : data.trend === "DOWN"
            ? "Needs Review"
            : "Somewhat Effective",
      notes:
        intervention.bedBoundFriendly || intervention.dementiaFriendly || intervention.lowVisionFriendly || intervention.hardOfHearingFriendly
          ? "Adapted intervention enabled for resident-specific needs."
          : null
    }));

    return {
      id: `${focusKey}-${index}`,
      title: focusAreaLabel(focusKey),
      status: plan.status === "ARCHIVED" ? "Resolved" : "Active",
      dateAddedIso: plan.createdAt.toISOString(),
      triggerSource:
        data.assessmentSchedule.lengthOfStayDays != null && data.assessmentSchedule.lengthOfStayDays <= 90
          ? "Admission"
          : data.docs.some((item) => item.kind === "UDA" || item.kind === "MDS")
            ? "Quarterly"
            : "Manual Add",
      priority: resolvePriority(data.assessmentSchedule),
      reviewDateIso: plan.nextReviewDate.toISOString(),
      focusStatement: `Resident requires focused support for ${focusAreaLabel(focusKey).toLowerCase()}.`,
      rationale:
        plan.preferencesText?.trim() ||
        "Plan is based on recent participation patterns, attendance response, and documented preference trends.",
      goals: goalRows,
      interventions: interventionRows,
      relatedDocuments: data.docs
        .filter((item) => item.kind === "PROGRESS" || item.kind === "ONE_TO_ONE" || item.kind === "UDA" || item.kind === "MDS")
        .slice(0, 4),
      reviewNotes
    };
  });
}

export function ActivitiesCarePlanPage({
  data,
  timeZone,
  canEdit,
  activeTab,
  archiveAction
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  canEdit: boolean;
  activeTab: ActivitiesCarePlanTab;
  archiveAction: (formData: FormData) => Promise<void> | void;
}) {
  const residentPath = `/app/residents/${data.resident.id}/care-plan`;
  const focusRows = mapFocusRows(data);

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1180px_520px_at_-8%_0%,rgba(56,189,248,0.16),transparent_62%),radial-gradient(980px_420px_at_96%_0%,rgba(139,92,246,0.2),transparent_62%),radial-gradient(760px_360px_at_50%_100%,rgba(59,130,246,0.14),transparent_72%)]" />

      <div className="relative z-10 space-y-4">
        <CarePlanHeader
          data={data}
          timeZone={timeZone}
          canEdit={canEdit}
          activeTab={activeTab}
          residentPath={residentPath}
          archiveAction={archiveAction}
        />

        <ResidentSnapshotBanner data={data} timeZone={timeZone} />
        <CarePlanSummaryStrip data={data} timeZone={timeZone} residentPath={residentPath} />
        <CarePlanTabs residentPath={residentPath} activeTab={activeTab} />

        {activeTab === "overview" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <PreferencesCard data={data} />
              <StrengthsCard data={data} />
              <BarriersCard data={data} />
              <ParticipationProfileCard data={data} />
            </div>
            <div className="space-y-4">
              <ActiveCarePlanFocusesSection
                focusRows={focusRows}
                timeZone={timeZone}
                residentPath={residentPath}
                canEdit={canEdit}
              />
              <ParticipationAnalyticsPanel data={data} />
              <DocumentationLinksPanel data={data} timeZone={timeZone} />
            </div>
          </section>
        ) : null}

        {activeTab === "focuses" ? (
          <section className="space-y-4">
            <QuickAddFocusTemplateDrawer residentId={data.resident.id} hasPlan={Boolean(data.plan)} />
            <ActiveCarePlanFocusesSection
              focusRows={focusRows}
              timeZone={timeZone}
              residentPath={residentPath}
              canEdit={canEdit}
              expanded
            />
          </section>
        ) : null}

        {activeTab === "goals-interventions" ? (
          <GoalsAndInterventionsTab
            focusRows={focusRows}
            timeZone={timeZone}
            residentId={data.resident.id}
            canEdit={canEdit}
          />
        ) : null}

        {activeTab === "participation" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
            <ParticipationAnalyticsPanel data={data} detailed />
            <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
              <CardHeader>
                <CardTitle className="text-base text-white">Interdisciplinary Sign-off</CardTitle>
                <p className="text-xs text-[#9cb4de]">Clinical involvement and review readiness across disciplines.</p>
              </CardHeader>
              <CardContent>
                <InterdisciplinarySignoffPanel data={data} />
              </CardContent>
            </Card>
          </section>
        ) : null}

        {activeTab === "documents" ? (
          <section className="space-y-4">
            <DocumentationLinksPanel data={data} timeZone={timeZone} detailed />
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
            <ReviewTimeline data={data} timeZone={timeZone} />
            <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
              <CardHeader>
                <CardTitle className="text-base text-white">Interdisciplinary Sign-off</CardTitle>
                <p className="text-xs text-[#9cb4de]">Ownership visibility for Activities, Nursing, and Section F workflows.</p>
              </CardHeader>
              <CardContent>
                <InterdisciplinarySignoffPanel data={data} />
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function CarePlanHeader({
  data,
  timeZone,
  canEdit,
  activeTab,
  residentPath,
  archiveAction
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  canEdit: boolean;
  activeTab: ActivitiesCarePlanTab;
  residentPath: string;
  archiveAction: (formData: FormData) => Promise<void> | void;
}) {
  const nextReviewDate = data.summary.nextReviewDateIso;
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
      eyebrow="Resident Workflow"
      title="Activities Care Plan"
      subtitle={`${data.resident.name} · Room ${data.resident.room}${data.resident.unitName ? ` · ${data.resident.unitName}` : ""}`}
      icon={ClipboardList}
      accentGradientClasses="from-cyan-300 to-blue-500"
      actions={
        <>
          <PremiumPillButton label="Edit Care Plan" href={data.plan ? `${residentPath}/edit` : `${residentPath}/new`} tone="blue" />
          <PremiumPillButton label="Add Focus" href={data.plan ? `${residentPath}/edit` : `${residentPath}/new`} tone="neutral" icon={Plus} />
          <PremiumPillButton label="Mark Reviewed" href={`${residentPath}/reviews/new`} tone="emerald" />
          {data.plan ? (
            <PremiumPillButton label="Print / Export" href={`/api/care-plans/${data.plan.id}/pdf`} tone="neutral" />
          ) : null}
          {canEdit && data.plan ? (
            <form action={archiveAction}>
              <input type="hidden" name="carePlanId" value={data.plan.id} />
              <Button type="submit" className="inline-flex h-9 items-center rounded-full border border-rose-400/45 bg-[#3a1a2a] px-3 text-xs font-semibold text-rose-100 hover:bg-[#472036]">
                Mark Resolved
              </Button>
            </form>
          ) : null}
        </>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
        <PremiumInputField placeholder="Search goals, interventions, and care plan notes" className="w-full" />
        <PremiumSegmentControl
          items={[
            { id: "overview", label: "Overview", href: sectionHref(residentPath, "overview"), active: activeTab === "overview" },
            { id: "focuses", label: "Focuses", href: sectionHref(residentPath, "focuses"), active: activeTab === "focuses" },
            { id: "goals", label: "Goals", href: sectionHref(residentPath, "goals-interventions"), active: activeTab === "goals-interventions" }
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.displayStatus as CarePlanDisplayStatus} className="border-white/25 bg-[#122343] text-[#dbe9ff]" />
          <Badge className="border-[#3a5d93] bg-[#132648] text-[#d9e6ff]">
            Last updated {formatDate(data.plan?.updatedAt ? data.plan.updatedAt.toISOString() : null, timeZone)}
          </Badge>
          <Badge className={cn("border", dueTone(nextDueLevel))}>
            Next review {nextReviewDate ? formatDate(nextReviewDate, timeZone) : "Not set"}
          </Badge>
        </div>
      </div>
    </TopContentHeader>
  );
}

function ResidentSnapshotBanner({ data, timeZone }: { data: ActivitiesCarePlanData; timeZone: string }) {
  return (
    <section className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-500/18 text-lg font-black text-cyan-100">
          {data.resident.firstName[0]}
          {data.resident.lastName[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white">{data.resident.name}</h2>
            {data.resident.preferredName ? (
              <Badge className="border-violet-400/45 bg-violet-500/16 text-violet-100">Preferred: {data.resident.preferredName}</Badge>
            ) : null}
            {data.resident.followUpFlag ? <Badge className="border-amber-300/45 bg-amber-500/16 text-amber-100">Follow-up flagged</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-[#bcd0f0]">
            Room {data.resident.room} · Admission {formatDate(data.resident.admissionDateIso, timeZone)} · DOB {formatDate(data.resident.birthDateIso, timeZone)}
            {typeof data.resident.age === "number" ? ` · Age ${data.resident.age}` : ""}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <SnapshotMeta label="Communication" value={data.baseline.communication} />
            <SnapshotMeta label="Cognition" value={data.baseline.cognition} />
            <SnapshotMeta label="Mobility" value={data.baseline.mobility} />
            <SnapshotMeta label="Mood" value={data.baseline.mood} />
            <SnapshotMeta label="Participation" value={data.baseline.participation} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.resident.chips.length > 0
              ? data.resident.chips.map((chip) => (
                  <Badge key={chip} className="border-[#3a5d93] bg-[#132648] text-[#d9e6ff]">
                    {chip}
                  </Badge>
                ))
              : <Badge className="border-[#3a5d93] bg-[#132648] text-[#d9e6ff]">No profile tags yet</Badge>}
          </div>
        </div>
      </div>
    </section>
  );
}

function SnapshotMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">{label}</p>
      <p className="mt-1 text-sm text-[#dce8ff]">{value}</p>
    </div>
  );
}

function CarePlanSummaryStrip({
  data,
  timeZone,
  residentPath
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  residentPath: string;
}) {
  const items = [
    { label: "Active Focuses", value: String(data.summary.activeFocuses), icon: Target, href: `${residentPath}?tab=focuses` },
    { label: "Current Goals", value: String(data.summary.currentGoals), icon: ClipboardList, href: `${residentPath}?tab=goals-interventions` },
    { label: "Open Interventions", value: String(data.summary.openInterventions), icon: ListChecks, href: `${residentPath}?tab=goals-interventions` },
    { label: "1:1 Needed", value: data.summary.oneToOneNeeded ? "Yes" : "Current", icon: Users, href: `/app/documentation/one-to-one?residentId=${data.resident.id}` },
    { label: "Participation Trend", value: data.summary.participationTrendLabel, icon: HeartPulse, href: `${residentPath}?tab=participation` },
    { label: "Refusals This Month", value: String(data.summary.refusalsThisMonth), icon: ShieldCheck, href: `${residentPath}?tab=participation` },
    { label: "Next Review Due", value: formatDate(data.summary.nextReviewDateIso, timeZone), icon: CalendarClock, href: `${residentPath}/reviews/new` },
    {
      label: "Quarterly / Annual",
      value: `${data.summary.quarterlyLabel} · ${data.summary.annualLabel}`,
      icon: Workflow,
      href: `/app/residents/${data.resident.id}?tab=assessments`
    }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-xl border border-[#2c395b] bg-[#111a2e] p-3 transition hover:-translate-y-[1px] hover:border-[#3f5f93]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">{item.label}</p>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#36598d] bg-[#132647]">
                <Icon className="h-3.5 w-3.5 text-cyan-200" />
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#e3edff]">{item.value}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#9db6de] group-hover:text-[#d8e6ff]">
              Open
              <ArrowUpRight className="h-3.5 w-3.5" />
            </p>
          </Link>
        );
      })}
    </section>
  );
}

function CarePlanTabs({ residentPath, activeTab }: { residentPath: string; activeTab: ActivitiesCarePlanTab }) {
  const tabs: Array<{ key: ActivitiesCarePlanTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "focuses", label: "Focuses" },
    { key: "goals-interventions", label: "Goals & Interventions" },
    { key: "participation", label: "Participation" },
    { key: "documents", label: "Documents" },
    { key: "history", label: "History" }
  ];

  return (
    <nav className="flex flex-wrap items-center gap-2">
      <PremiumSegmentControl
        items={tabs.slice(0, 3).map((tab) => ({
          id: tab.key,
          label: tab.label,
          href: sectionHref(residentPath, tab.key),
          active: tab.key === activeTab
        }))}
      />
      <PremiumSegmentControl
        items={tabs.slice(3).map((tab) => ({
          id: tab.key,
          label: tab.label,
          href: sectionHref(residentPath, tab.key),
          active: tab.key === activeTab
        }))}
      />
    </nav>
  );
}

function PreferencesCard({ data }: { data: ActivitiesCarePlanData }) {
  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#111a2e]">
      <CardHeader>
        <CardTitle className="text-base text-white">Interests & Preferences</CardTitle>
        <p className="text-xs text-[#9cb4de]">Favorite activities, social style, and preference-based engagement details.</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <MetaCell label="Favorite activities" value={data.resident.preferences || "Not documented"} />
        <MetaCell label="Preferred 1:1 activities" value={data.resident.oneToOneNeeded ? "More 1:1 support currently recommended" : "1:1 rhythm stable"} />
        <MetaCell label="Music preferences" value={data.resident.chips.some((chip) => chip.toLowerCase().includes("music")) ? "Enjoys music-based programming" : "Not documented"} />
        <MetaCell label="Spiritual / religious preferences" value={data.docs.some((item) => item.summary.toLowerCase().includes("spiritual")) ? "Spiritual support referenced in documentation" : "No specific preference documented"} />
        <MetaCell label="Best time of day" value={data.resident.bestTimesOfDay || data.participation.bestTimeWindow} />
        <MetaCell label="Preferred social setting" value={data.summary.oneToOneNeeded ? "1:1 and selective small-group" : "Mix of group and 1:1"} />
      </CardContent>
    </Card>
  );
}

function StrengthsCard({ data }: { data: ActivitiesCarePlanData }) {
  const strengths = [
    data.resident.preferences ? "Expresses activity interests" : null,
    data.participation.groupAttendance30d > 0 ? "Engages with structured activity offers" : null,
    data.participation.oneToOneThisMonth > 0 ? "Responds to 1:1 contacts" : null,
    data.participation.mostAttendedCategory !== "Not enough data" ? `Most responsive to ${data.participation.mostAttendedCategory}` : null,
    data.summary.participationTrendLabel === "Improving" ? "Recent engagement trend improving" : null,
    "Benefits from consistent scheduling and cueing"
  ].filter((item): item is string => Boolean(item));

  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#111a2e]">
      <CardHeader>
        <CardTitle className="text-base text-white">Strengths</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {strengths.map((item) => (
            <li key={item} className="rounded-xl border border-[#2f3d64] bg-[#0f182a] px-3 py-2 text-sm text-[#dce8ff]">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function BarriersCard({ data }: { data: ActivitiesCarePlanData }) {
  const barriers = [
    ...(data.plan?.barriersList ?? []),
    data.resident.safetyNotes ? "Safety considerations documented" : null,
    data.summary.refusalsThisMonth > 0 ? `Refusals this month: ${data.summary.refusalsThisMonth}` : null,
    data.summary.oneToOneNeeded ? "Needs scheduled 1:1 contact" : null
  ].filter((item): item is string => Boolean(item));

  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#111a2e]">
      <CardHeader>
        <CardTitle className="text-base text-white">Barriers / Risks</CardTitle>
      </CardHeader>
      <CardContent>
        {barriers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#2f3d64] bg-[#0f182a] px-3 py-4 text-sm text-[#9eb6df]">No barriers documented yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {barriers.map((item) => (
              <li key={item} className="rounded-xl border border-[#2f3d64] bg-[#0f182a] px-3 py-2 text-sm text-[#dce8ff]">
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ParticipationProfileCard({ data }: { data: ActivitiesCarePlanData }) {
  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#111a2e]">
      <CardHeader>
        <CardTitle className="text-base text-white">Participation Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <MetaCell label="Group participation" value={`${data.participation.groupAttendance30d} attended sessions (30d)`} />
        <MetaCell label="1:1 participation" value={`${data.participation.oneToOneThisMonth} visits this month`} />
        <MetaCell label="Independent leisure" value={`${data.participation.independentEngagement30d} documented independent engagements`} />
        <MetaCell label="Preferred attendance style" value={data.summary.oneToOneNeeded ? "1:1 + selective group" : "Balanced group and 1:1"} />
        <MetaCell label="Most successful approaches" value={data.plan?.supportsList?.join(", ") || "Choice-based approach with cueing"} />
        <MetaCell label="Known refusal triggers" value={(data.plan?.barriersList ?? []).slice(0, 3).join(", ") || "None specifically documented"} />
      </CardContent>
    </Card>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">{label}</p>
      <p className="mt-1 text-sm text-[#dce8ff]">{value}</p>
    </div>
  );
}

function ActiveCarePlanFocusesSection({
  focusRows,
  timeZone,
  residentPath,
  canEdit,
  expanded = false
}: {
  focusRows: FocusRow[];
  timeZone: string;
  residentPath: string;
  canEdit: boolean;
  expanded?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base text-white">Active Care Plan Focuses</CardTitle>
          <p className="mt-1 text-xs text-[#9cb4de]">PCC-inspired focus/problem blocks with nested goals and interventions.</p>
        </div>
        <Button asChild variant="outline" className="h-8 rounded-full border-[#3a5b8f] bg-[#122342] px-3 text-xs text-[#d6e5ff] hover:bg-[#193055]">
          <Link href={`${residentPath}/edit`}>Manage</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {focusRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2f3d64] bg-[#0f182a] p-5 text-sm text-[#9eb6df]">
            No active focus yet. Start a care plan to create focus/problem statements, goals, and interventions.
          </div>
        ) : null}

        {focusRows.slice(0, expanded ? focusRows.length : 2).map((focus) => (
          <FocusCard key={focus.id} focus={focus} timeZone={timeZone} canEdit={canEdit} residentPath={residentPath} />
        ))}

        {!expanded && focusRows.length > 2 ? (
          <Button asChild variant="outline" className="h-9 w-full rounded-xl border-[#3a5b8f] bg-[#122342] text-xs text-[#d6e5ff] hover:bg-[#193055]">
            <Link href={`${residentPath}?tab=focuses`}>View all focuses</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FocusCard({
  focus,
  timeZone,
  residentPath,
  canEdit
}: {
  focus: FocusRow;
  timeZone: string;
  residentPath: string;
  canEdit: boolean;
}) {
  const priorityClass =
    focus.priority === "High"
      ? "border-rose-400/45 bg-rose-500/16 text-rose-100"
      : focus.priority === "Moderate"
        ? "border-amber-300/45 bg-amber-500/16 text-amber-100"
        : "border-emerald-400/45 bg-emerald-500/16 text-emerald-100";

  return (
    <article className="rounded-2xl border border-[#2c395b] bg-[#10192d] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{focus.title}</h3>
          <p className="mt-1 text-xs text-[#9cb4de]">{focus.focusStatement}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-[#3a5d93] bg-[#132648] text-[#d9e6ff]">{focus.status}</Badge>
          <Badge className={cn("border", priorityClass)}>{focus.priority}</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCell label="Date added" value={formatDate(focus.dateAddedIso, timeZone)} />
        <MetaCell label="Trigger source" value={focus.triggerSource} />
        <MetaCell label="Review date" value={formatDate(focus.reviewDateIso, timeZone)} />
        <MetaCell label="Priority" value={focus.priority} />
      </div>

      <div className="mt-3 rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Supporting rationale</p>
        <p className="mt-1 text-sm text-[#dce8ff]">{focus.rationale}</p>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Goals</p>
        {focus.goals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#2f3d64] bg-[#0f182a] px-3 py-2 text-sm text-[#9eb6df]">No goals linked yet.</p>
        ) : (
          focus.goals.map((goal) => <GoalItem key={goal.id} goal={goal} timeZone={timeZone} />)
        )}
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Interventions</p>
        {focus.interventions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#2f3d64] bg-[#0f182a] px-3 py-2 text-sm text-[#9eb6df]">No interventions linked yet.</p>
        ) : (
          focus.interventions.map((intervention) => (
            <InterventionItem key={intervention.id} intervention={intervention} timeZone={timeZone} />
          ))
        )}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Related documents</p>
          <div className="mt-2 space-y-2">
            {focus.relatedDocuments.slice(0, 3).map((doc) => (
              <Link key={doc.id} href={doc.href} className="block rounded-lg border border-[#36598d] bg-[#132647] px-2.5 py-2 text-xs text-[#dce8ff] hover:border-[#4d73ab]">
                {doc.title} · {doc.status}
              </Link>
            ))}
            {focus.relatedDocuments.length === 0 ? <p className="text-xs text-[#9cb4de]">No linked documents.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Review notes</p>
          <div className="mt-2 space-y-2">
            {focus.reviewNotes.slice(0, 2).map((review) => (
              <div key={review.id} className="rounded-lg border border-[#36598d] bg-[#132647] px-2.5 py-2 text-xs text-[#dce8ff]">
                <p>{formatDate(review.reviewDateIso, timeZone)} · {review.reason}</p>
                <p className="mt-1 text-[#b8caea]">{review.note || "No summary note."}</p>
              </div>
            ))}
            {focus.reviewNotes.length === 0 ? <p className="text-xs text-[#9cb4de]">No review notes yet.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="h-8 rounded-full border-[#3a5b8f] bg-[#122342] px-3 text-[11px] text-[#d6e5ff] hover:bg-[#193055]">
          <Link href={`${residentPath}/edit`}>Edit Focus</Link>
        </Button>
        {canEdit ? (
          <Button asChild variant="outline" className="h-8 rounded-full border-emerald-400/45 bg-emerald-500/16 px-3 text-[11px] text-emerald-100 hover:bg-emerald-500/24">
            <Link href={`${residentPath}/reviews/new`}>Mark Reviewed</Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function GoalItem({ goal, timeZone }: { goal: FocusRow["goals"][number]; timeZone: string }) {
  return (
    <article className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#e2ecff]">{goal.statement}</p>
        <Badge className={cn("border text-[10px]", progressTone(goal.progress))}>{goal.progress}</Badge>
      </div>
      <p className="mt-1 text-xs text-[#9cb4de]">Target: {formatDate(goal.targetDateIso, timeZone)} · Review frequency: {goal.reviewFrequency}</p>
      <p className="mt-2 text-xs text-[#c7d7f5]">{goal.outcomeSummary}</p>
    </article>
  );
}

function InterventionItem({
  intervention,
  timeZone
}: {
  intervention: FocusRow["interventions"][number];
  timeZone: string;
}) {
  return (
    <article className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#e2ecff]">{intervention.statement}</p>
        <Badge className={cn("border text-[10px]", effectivenessTone(intervention.effectiveness))}>
          {intervention.effectiveness}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-[#9cb4de]">
        {intervention.frequency} · {intervention.assignedDiscipline} · Started {formatDate(intervention.startDateIso, timeZone)}
      </p>
      <p className="mt-1 text-xs text-[#9cb4de]">Last completed: {formatDate(intervention.lastCompletedDateIso, timeZone)}</p>
      {intervention.notes ? <p className="mt-2 text-xs text-[#c7d7f5]">{intervention.notes}</p> : null}
    </article>
  );
}

function ParticipationAnalyticsPanel({
  data,
  detailed = false
}: {
  data: ActivitiesCarePlanData;
  detailed?: boolean;
}) {
  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
      <CardHeader>
        <CardTitle className="text-base text-white">Participation & Response</CardTitle>
        <p className="text-xs text-[#9cb4de]">Attendance and response signals tied to current activity care planning.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <MiniMetric label="Last 7 days" value={`${data.participation.sevenDayPercent}%`} />
          <MiniMetric label="Last 30 days" value={`${data.participation.thirtyDayPercent}%`} />
          <MiniMetric label="Group attended" value={String(data.participation.groupAttendance30d)} />
          <MiniMetric label="1:1 completed" value={String(data.participation.oneToOneThisMonth)} />
          <MiniMetric label="Refusals" value={String(data.participation.refusalsThisMonth)} />
          <MiniMetric label="Best time" value={data.participation.bestTimeWindow} />
        </div>

        <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">Response split</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <ResponseBar label="Positive" value={data.participation.responseBreakdown.positivePercent} tone="emerald" />
            <ResponseBar label="Neutral" value={data.participation.responseBreakdown.neutralPercent} tone="blue" />
            <ResponseBar label="Resistant" value={data.participation.responseBreakdown.resistantPercent} tone="rose" />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <MetaCell label="Most attended category" value={data.participation.mostAttendedCategory} />
          <MetaCell label="Documentation completion" value={`${data.summary.documentationCompletionPercent}% this month`} />
        </div>

        {detailed ? (
          <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3 text-sm text-[#dce8ff]">
            Activity response average: {data.participation.responseBreakdown.positivePercent >= 60 ? "Positive" : data.participation.responseBreakdown.resistantPercent >= 35 ? "Resistant trend" : "Mixed"}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#93abd6]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#e2ecff]">{value}</p>
    </div>
  );
}

function ResponseBar({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "emerald" | "blue" | "rose";
}) {
  const track = tone === "emerald" ? "bg-emerald-500/25" : tone === "blue" ? "bg-blue-500/25" : "bg-rose-500/25";
  const fill = tone === "emerald" ? "bg-emerald-400" : tone === "blue" ? "bg-blue-400" : "bg-rose-400";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[#c7d7f5]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className={cn("h-2 rounded-full", track)}>
        <div className={cn("h-2 rounded-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function DocumentationLinksPanel({
  data,
  timeZone,
  detailed = false
}: {
  data: ActivitiesCarePlanData;
  timeZone: string;
  detailed?: boolean;
}) {
  const rows = detailed ? data.docs : data.docs.slice(0, 8);

  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
      <CardHeader>
        <CardTitle className="text-base text-white">Related Documentation</CardTitle>
        <p className="text-xs text-[#9cb4de]">Progress Notes, 1:1, UDA, MDS, and review-linked support documentation.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#2f3d64] bg-[#0f182a] p-4 text-sm text-[#9eb6df]">No related documentation found.</p>
        ) : (
          rows.map((doc) => (
            <Link key={doc.id} href={doc.href} className="block rounded-xl border border-[#2f3d64] bg-[#0f182a] px-3 py-2 transition hover:border-[#4d73ab]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#e2ecff]">{doc.title}</p>
                <Badge className="border-[#3a5d93] bg-[#132648] text-[10px] text-[#d9e6ff]">{doc.status}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-[#9cb4de]">{formatDate(doc.createdAtIso, timeZone)} · {doc.author}</p>
              <p className="mt-1 line-clamp-2 text-xs text-[#c7d7f5]">{doc.summary || "No summary"}</p>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ReviewTimeline({ data, timeZone }: { data: ActivitiesCarePlanData; timeZone: string }) {
  return (
    <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
      <CardHeader>
        <CardTitle className="text-base text-white">Review History</CardTitle>
        <p className="text-xs text-[#9cb4de]">Created, reviewed, revised, and next-review milestones.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <TimelineRow
          title="Care plan created"
          date={formatDate(data.plan?.createdAt ? data.plan.createdAt.toISOString() : data.resident.createdAtIso, timeZone)}
          detail="Initial activity care planning started for this resident."
        />

        {data.reviewTimeline.map((review) => (
          <TimelineRow
            key={review.id}
            title={`${review.reason} review`}
            date={formatDate(review.reviewDateIso, timeZone)}
            detail={`${review.note || "Review completed."} · Next review ${formatDate(review.nextReviewDateAfterIso, timeZone)}`}
          />
        ))}

        <TimelineRow
          title="Next review due"
          date={formatDate(data.summary.nextReviewDateIso, timeZone)}
          detail="Review cadence can be updated in plan schedule settings."
        />
      </CardContent>
    </Card>
  );
}

function TimelineRow({ title, date, detail }: { title: string; date: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#e2ecff]">{title}</p>
        <p className="text-xs text-[#9cb4de]">{date}</p>
      </div>
      <p className="mt-1 text-xs text-[#c7d7f5]">{detail}</p>
    </div>
  );
}

function InterdisciplinarySignoffPanel({ data }: { data: ActivitiesCarePlanData }) {
  return (
    <div className="space-y-2">
      {data.interdisciplinary.map((item) => (
        <div key={item.key} className="flex items-center justify-between rounded-xl border border-[#2f3d64] bg-[#0f182a] px-3 py-2">
          <p className="text-sm text-[#dce8ff]">{item.label}</p>
          <Badge
            className={cn(
              "border text-[10px]",
              item.state === "Reviewed"
                ? "border-emerald-400/45 bg-emerald-500/16 text-emerald-100"
                : item.state === "Pending"
                  ? "border-amber-300/45 bg-amber-500/16 text-amber-100"
                  : "border-[#3a5d93] bg-[#132648] text-[#d9e6ff]"
            )}
          >
            {item.state}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function QuickAddFocusTemplateDrawer({ residentId, hasPlan }: { residentId: string; hasPlan: boolean }) {
  return (
    <details className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-[#e2ecff]">
        Quick-Add Focus Template Library
      </summary>
      <p className="mt-2 text-xs text-[#9cb4de]">Select a template to start a PCC-style focus, goals, and interventions set.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {CARE_PLAN_TEMPLATES.map((template) => (
          <Link
            key={template.key}
            href={
              hasPlan
                ? `/app/residents/${residentId}/care-plan/edit?template=${encodeURIComponent(template.key)}`
                : `/app/residents/${residentId}/care-plan/new?template=${encodeURIComponent(template.key)}`
            }
            className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3 transition hover:border-[#4d73ab]"
          >
            <p className="text-sm font-semibold text-[#e2ecff]">{template.name}</p>
            <p className="mt-1 text-xs text-[#9cb4de]">{template.description}</p>
            <p className="mt-2 text-[11px] text-[#c7d7f5]">Review cadence: {template.defaultReviewDays} days</p>
          </Link>
        ))}
      </div>
    </details>
  );
}

function GoalsAndInterventionsTab({
  focusRows,
  timeZone,
  residentId,
  canEdit
}: {
  focusRows: FocusRow[];
  timeZone: string;
  residentId: string;
  canEdit: boolean;
}) {
  const goalRows = focusRows.flatMap((focus) =>
    focus.goals.map((goal) => ({
      focus: focus.title,
      ...goal
    }))
  );

  const interventionRows = focusRows.flatMap((focus) =>
    focus.interventions.map((intervention) => ({
      focus: focus.title,
      ...intervention
    }))
  );

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
        <CardHeader>
          <CardTitle className="text-base text-white">Goals</CardTitle>
          <p className="text-xs text-[#9cb4de]">Centralized goals list with due status and progress outcome.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {goalRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2f3d64] bg-[#0f182a] p-4 text-sm text-[#9eb6df]">No goals available.</p>
          ) : (
            goalRows.map((goal) => (
              <div key={goal.id} className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#e2ecff]">{goal.statement}</p>
                  <Badge className={cn("border text-[10px]", progressTone(goal.progress))}>{goal.progress}</Badge>
                </div>
                <p className="mt-1 text-xs text-[#9cb4de]">{goal.focus} · Target {formatDate(goal.targetDateIso, timeZone)} · Review {goal.reviewFrequency}</p>
                <p className="mt-1 text-xs text-[#c7d7f5]">{goal.outcomeSummary}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#2c395b] bg-[#10192d]">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white">Interventions</CardTitle>
            <p className="text-xs text-[#9cb4de]">Frequency, discipline, effectiveness, and last completion visibility.</p>
          </div>
          {canEdit ? (
            <Button asChild variant="outline" className="h-8 rounded-full border-[#3a5b8f] bg-[#122342] px-3 text-xs text-[#d6e5ff] hover:bg-[#193055]">
              <Link href={`/app/residents/${residentId}/care-plan/edit`}>Edit Plan</Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {interventionRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2f3d64] bg-[#0f182a] p-4 text-sm text-[#9eb6df]">No interventions available.</p>
          ) : (
            interventionRows.map((intervention) => (
              <div key={intervention.id} className="rounded-xl border border-[#2f3d64] bg-[#0f182a] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#e2ecff]">{intervention.statement}</p>
                  <Badge className={cn("border text-[10px]", effectivenessTone(intervention.effectiveness))}>
                    {intervention.effectiveness}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[#9cb4de]">{intervention.focus} · {intervention.frequency} · {intervention.assignedDiscipline}</p>
                <p className="mt-1 text-xs text-[#9cb4de]">Start {formatDate(intervention.startDateIso, timeZone)} · Last completed {formatDate(intervention.lastCompletedDateIso, timeZone)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
