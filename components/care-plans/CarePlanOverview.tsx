import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Download,
  EllipsisVertical,
  FileClock,
  LayoutGrid,
  NotebookPen,
  PencilLine,
  Plus,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { CollapsibleCard, FocusCard, GoalsCard, InterventionsCard } from "@/components/care-plans/CarePlanCards";
import { ReviewTimeline } from "@/components/care-plans/ReviewTimeline";
import { StatusBadge } from "@/components/care-plans/StatusBadge";
import { TrendIndicator } from "@/components/care-plans/TrendIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { focusAreaLabel } from "@/lib/care-plans/enums";
import type { CarePlanDisplayStatus, CarePlanTrend } from "@/lib/care-plans/status";
import { formatInTimeZone } from "@/lib/timezone";

type ResidentHeader = {
  id: string;
  name: string;
  room: string;
  status: string;
  unitName: string | null;
};

type PlanShape = {
  id: string;
  status: "ACTIVE" | "ARCHIVED";
  focusAreasList: string[];
  goals: Array<{
    id: string;
    templateKey: string | null;
    customText: string | null;
    baseline: string;
    target: string;
    timeframeDays: number;
  }>;
  interventions: Array<{
    id: string;
    title: string;
    type: string;
    bedBoundFriendly: boolean;
    dementiaFriendly: boolean;
    lowVisionFriendly: boolean;
    hardOfHearingFriendly: boolean;
  }>;
  reviews: Array<{
    id: string;
    reviewDate: Date;
    result: "IMPROVED" | "NO_CHANGE" | "DECLINED";
    participation: string;
    response: string;
    note: string | null;
    workedChips: unknown;
    adjustChips: unknown;
    nextReviewDateAfter: Date;
  }>;
  frequency: string;
  frequencyCustom: string | null;
  nextReviewDate: Date;
  barriersList: string[];
  supportsList: string[];
  preferencesText: string | null;
  safetyNotes: string | null;
};

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function frequencyLabel(frequency: string, custom?: string | null) {
  if (frequency === "THREE_PER_WEEK") return "3x per week";
  if (frequency === "CUSTOM") return custom?.trim() || "Custom";
  return frequency
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CarePlanOverview({
  resident,
  plan,
  status,
  trend,
  timeZone,
  canEdit,
  archiveAction
}: {
  resident: ResidentHeader;
  plan: PlanShape | null;
  status: CarePlanDisplayStatus;
  trend: CarePlanTrend;
  timeZone: string;
  canEdit: boolean;
  archiveAction: (formData: FormData) => Promise<void> | void;
}) {
  if (!plan) {
    return (
      <div className="space-y-4">
        <Card className="glass-panel rounded-2xl border-white/15">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <p className="text-sm text-muted-foreground">
                {resident.name} · Room {resident.room}
                {resident.unitName ? ` · ${resident.unitName}` : ""}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Care Plan Overview</h1>
              <p className="mt-1 text-sm text-muted-foreground">No active care plan yet. Start with a template or build from scratch.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/app/residents/${resident.id}/care-plan/new`}>
                  <Plus className="mr-1 h-4 w-4" />
                  Create Care Plan
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/care-plans">Back to Care Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {resident.name} · Room {resident.room}
                {resident.unitName ? ` · ${resident.unitName}` : ""}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Care Plan Overview</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <Badge variant="outline" className="glass-chip border-white/20 bg-white/15">
                  {resident.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="bg-white/70">
                <Link href={`/app/residents/${resident.id}/care-plan/reviews/new`}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Review
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-white/70">
                <Link href={`/app/residents/${resident.id}/care-plan/edit`}>
                  <PencilLine className="mr-1 h-4 w-4" />
                  Edit Plan
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/api/care-plans/${plan.id}/pdf`} target="_blank">
                  <Download className="mr-1 h-4 w-4" />
                  Export PDF
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="bg-white/70">
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Care Plan</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/app/residents/${resident.id}/care-plan/reviews/new`}>Add Review</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/app/care-plans`}>View All Care Plans</Link>
                  </DropdownMenuItem>
                  {canEdit ? (
                    <DropdownMenuItem asChild>
                      <form action={archiveAction}>
                        <input type="hidden" name="carePlanId" value={plan.id} />
                        <button type="submit" className="w-full text-left">
                          Archive Plan
                        </button>
                      </form>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <SummaryItem
              icon={<Sparkles className="h-4 w-4 text-actifyBlue" />}
              iconWrapClassName="bg-blue-100 ring-blue-200/80"
              label="Primary Focus"
              value={plan.focusAreasList.length ? focusAreaLabel(plan.focusAreasList[0]) : "Not set"}
            />
            <SummaryItem
              icon={<CalendarDays className="h-4 w-4 text-emerald-700" />}
              iconWrapClassName="bg-emerald-100 ring-emerald-200/80"
              label="Frequency"
              value={frequencyLabel(plan.frequency, plan.frequencyCustom)}
            />
            <SummaryItem
              icon={<FileClock className="h-4 w-4 text-amber-700" />}
              iconWrapClassName="bg-amber-100 ring-amber-200/80"
              label="Next Review"
              value={formatInTimeZone(plan.nextReviewDate, timeZone, {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            />
            <div className="glass-chip rounded-xl border border-white/20 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/70">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 ring-1 ring-violet-200/80">
                  <Sparkles className="h-3.5 w-3.5 text-violet-700" />
                </span>
                Last 14 Days
              </div>
              <TrendIndicator trend={trend} className="mt-1 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      <SectionLead
        icon={<LayoutGrid className="h-4 w-4 text-blue-700" />}
        iconWrapClassName="bg-blue-100 ring-blue-200/80"
        title="Plan Core"
        subtitle="Focus and goals in one glance."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <FocusCard focusLabels={plan.focusAreasList.map((item) => focusAreaLabel(item))} />
        <GoalsCard goals={plan.goals} />
      </div>

      <SectionLead
        icon={<ClipboardList className="h-4 w-4 text-violet-700" />}
        iconWrapClassName="bg-violet-100 ring-violet-200/80"
        title="Intervention Delivery"
        subtitle="What staff should do and how it is adapted."
      />
      <InterventionsCard interventions={plan.interventions} />

      <SectionLead
        icon={<ShieldAlert className="h-4 w-4 text-rose-700" />}
        iconWrapClassName="bg-rose-100 ring-rose-200/80"
        title="Resident Context"
        subtitle="Barriers, supports, and preferences for safer personalization."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <CollapsibleCard title="Barriers & Supports" description="Key factors that may affect participation.">
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-foreground/70">Barriers</p>
              <p className="text-foreground/90">{plan.barriersList.length ? plan.barriersList.join(", ") : "No barriers documented."}</p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-foreground/70">Supports</p>
              <p className="text-foreground/90">{plan.supportsList.length ? plan.supportsList.join(", ") : "No supports documented."}</p>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Preferences & Safety" description="Resident preferences and risk-aware notes.">
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-foreground/70">Preferences</p>
              <p className="text-foreground/90">{plan.preferencesText?.trim() || "No preference notes."}</p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-foreground/70">Safety Notes</p>
              <p className="text-foreground/90">{plan.safetyNotes?.trim() || "No safety notes."}</p>
            </div>
          </div>
        </CollapsibleCard>
      </div>

      <SectionLead
        icon={<NotebookPen className="h-4 w-4 text-teal-700" />}
        iconWrapClassName="bg-teal-100 ring-teal-200/80"
        title="Review Timeline"
        subtitle="Track outcomes and adjustments over time."
      />
      <ReviewTimeline
        timeZone={timeZone}
        reviews={plan.reviews.map((review) => ({
          ...review,
          workedChips: toArray(review.workedChips),
          adjustChips: toArray(review.adjustChips)
        }))}
      />
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  iconWrapClassName
}: {
  icon: ReactNode;
  label: string;
  value: string;
  iconWrapClassName: string;
}) {
  return (
    <div className="glass-chip rounded-xl border border-white/20 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/70">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ring-1 ${iconWrapClassName}`}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{value}</p>
    </div>
  );
}

function SectionLead({
  icon,
  title,
  subtitle,
  iconWrapClassName
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  iconWrapClassName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/35 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ${iconWrapClassName}`}>
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
