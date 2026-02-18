import type { ReactNode } from "react";
import { Compass, Flag, ListChecks, ShieldAlert, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GoalCardItem = {
  id: string;
  templateKey: string | null;
  customText: string | null;
  baseline: string;
  target: string;
  timeframeDays: number;
};

type InterventionCardItem = {
  id: string;
  title: string;
  type: string;
  bedBoundFriendly: boolean;
  dementiaFriendly: boolean;
  lowVisionFriendly: boolean;
  hardOfHearingFriendly: boolean;
};

export function FocusCard({ focusLabels }: { focusLabels: string[] }) {
  return (
    <Card className="glass-panel rounded-2xl border-white/15">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <IconBadge icon={Compass} className="bg-blue-100 text-blue-700 ring-blue-200" />
          <span>Focus Areas</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Primary directions for engagement and outcomes.</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {focusLabels.length === 0 ? <p className="text-sm text-muted-foreground">No focus areas selected.</p> : null}
        {focusLabels.map((focus) => (
          <Badge key={focus} variant="outline" className="glass-chip border-blue-200/60 bg-blue-50/70 text-blue-900">
            {focus}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}

export function GoalsCard({ goals }: { goals: GoalCardItem[] }) {
  return (
    <Card className="glass-panel rounded-2xl border-white/15">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <IconBadge icon={Flag} className="bg-emerald-100 text-emerald-700 ring-emerald-200" />
          <span>Goals</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Clear targets with baseline and timeframe.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals documented.</p> : null}
        {goals.slice(0, 3).map((goal) => (
          <div key={goal.id} className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-3">
            <p className="text-sm font-semibold text-foreground">{goal.customText ?? goal.templateKey ?? "Goal"}</p>
            <p className="mt-1 text-xs text-foreground/70">
              Baseline: {toTitle(goal.baseline)} to Target: {toTitle(goal.target)} in {goal.timeframeDays} days
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function InterventionsCard({ interventions }: { interventions: InterventionCardItem[] }) {
  const preview = interventions.slice(0, 6);
  const overflow = interventions.slice(6);

  return (
    <Card className="glass-panel rounded-2xl border-white/15">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <IconBadge icon={ListChecks} className="bg-violet-100 text-violet-700 ring-violet-200" />
          <span>Interventions</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Action steps staff can apply consistently.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {interventions.length === 0 ? <p className="text-sm text-muted-foreground">No interventions selected.</p> : null}
        {preview.map((intervention) => (
          <div key={intervention.id} className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{intervention.title}</p>
              <Badge variant="outline" className="glass-chip border-violet-200/70 bg-violet-100/70 text-xs text-violet-900">
                {toTypeLabel(intervention.type)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {intervention.bedBoundFriendly ? <AdaptationChip label="Bed-bound" /> : null}
              {intervention.dementiaFriendly ? <AdaptationChip label="Dementia" /> : null}
              {intervention.lowVisionFriendly ? <AdaptationChip label="Low vision" /> : null}
              {intervention.hardOfHearingFriendly ? <AdaptationChip label="HOH" /> : null}
            </div>
          </div>
        ))}
        {overflow.length > 0 ? (
          <details className="rounded-xl border border-white/20 bg-white/10 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Show {overflow.length} more interventions</summary>
            <div className="mt-3 space-y-2">
              {overflow.map((intervention) => (
                <div key={intervention.id} className="rounded-lg border border-white/15 bg-white/10 p-2 text-sm">
                  <p className="font-medium text-foreground">{intervention.title}</p>
                  <p className="text-xs text-muted-foreground">{toTypeLabel(intervention.type)}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function CollapsibleCard({
  title,
  icon = ShieldAlert,
  description,
  defaultOpen = false,
  children,
  className
}: {
  title: string;
  icon?: LucideIcon;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icon;
  return (
    <Card className={cn("glass-panel rounded-2xl border-white/15", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-base">
          <IconBadge icon={Icon} className="bg-rose-100 text-rose-700 ring-rose-200" />
          <span>{title}</span>
        </CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>
        <details open={defaultOpen} className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground/85">Show details</summary>
          <div className="mt-3">{children}</div>
        </details>
      </CardContent>
    </Card>
  );
}

function toTitle(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toTypeLabel(value: string) {
  if (value === "ONE_TO_ONE") return "1:1";
  return toTitle(value);
}

function AdaptationChip({ label }: { label: string }) {
  return <span className="rounded-full border border-violet-200/70 bg-violet-100/80 px-2 py-0.5 text-[11px] text-violet-900">{label}</span>;
}

function IconBadge({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full ring-1", className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
