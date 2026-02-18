"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCueingLabel,
  getFrequencyLabel,
  getGoalTemplate,
  getGroupPreferenceLabel,
  getPlanAreaLabel,
  interventions,
  resolveGoalText,
  type CueingLevelKey,
  type GroupPreferenceKey,
  type PlanAreaKey,
  type TargetFrequencyKey
} from "@/lib/planLibrary";
import { type ResidentPlanFormPayload } from "@/components/residents/PlanItemModal";

export type ResidentPlanItemView = ResidentPlanFormPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type PlanItemCardProps = {
  residentName: string;
  item: ResidentPlanItemView;
  onEdit: (item: ResidentPlanItemView) => void;
  onArchive: (itemId: string) => Promise<void> | void;
  canEdit: boolean;
};

function formatInterventionLabel(planAreaKey: PlanAreaKey, interventionKey: string) {
  return interventions[planAreaKey].find((option) => option.key === interventionKey)?.label ?? interventionKey;
}

function buildSummary(residentName: string, item: ResidentPlanItemView) {
  const planAreaLabel = getPlanAreaLabel(item.planAreaKey);
  const frequencyLabel = getFrequencyLabel(item.targetFrequency).toLowerCase();
  const cueingLabel = getCueingLabel(item.cueingLevel).toLowerCase();
  const topInterventions = item.interventions
    .slice(0, 3)
    .map((interventionKey) => formatInterventionLabel(item.planAreaKey, interventionKey));

  const interventionText =
    topInterventions.length > 0
      ? `${topInterventions.slice(0, -1).join(", ")}${topInterventions.length > 1 ? ", and " : ""}${topInterventions.at(-1)}`
      : "individualized engagement supports";

  return `${residentName} will participate in ${planAreaLabel.toLowerCase()} interventions ${frequencyLabel} with ${cueingLabel} cueing as needed. Interventions include ${interventionText}.`;
}

export function PlanItemCard({ residentName, item, onEdit, onArchive, canEdit }: PlanItemCardProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const goalText = useMemo(
    () =>
      resolveGoalText({
        residentName,
        planAreaKey: item.planAreaKey,
        templateId: item.goalTemplateId,
        customGoalText: item.customGoalText,
        targetFrequency: item.targetFrequency as TargetFrequencyKey,
        cueingLevel: item.cueingLevel as CueingLevelKey
      }),
    [item.cueingLevel, item.customGoalText, item.goalTemplateId, item.planAreaKey, item.targetFrequency, residentName]
  );

  const summaryText = useMemo(() => buildSummary(residentName, item), [item, residentName]);
  const goalTemplate = getGoalTemplate(item.planAreaKey, item.goalTemplateId);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{getPlanAreaLabel(item.planAreaKey)}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={item.active ? "secondary" : "outline"}>{item.active ? "Active" : "Archived"}</Badge>
            <Badge variant="outline">{getFrequencyLabel(item.targetFrequency as TargetFrequencyKey)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-white/70 bg-white/70 p-3">
          <p className="text-xs uppercase tracking-wide text-foreground/65">Goal</p>
          <p className="mt-1 text-sm text-foreground">{goalText}</p>
          {goalTemplate ? <p className="mt-1 text-xs text-muted-foreground">Template: {goalTemplate.title}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Cueing: {getCueingLabel(item.cueingLevel as CueingLevelKey)}</Badge>
          <Badge variant="outline">Group: {getGroupPreferenceLabel(item.groupPreference as GroupPreferenceKey)}</Badge>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-foreground/65">Interventions</p>
          <div className="flex flex-wrap gap-2">
            {item.interventions.length === 0 ? (
              <Badge variant="outline">No interventions selected</Badge>
            ) : (
              item.interventions.map((interventionKey) => (
                <Badge key={interventionKey} variant="outline" className="bg-white/80">
                  {formatInterventionLabel(item.planAreaKey, interventionKey)}
                </Badge>
              ))
            )}
          </div>
        </div>

        {item.barriers.length > 0 ? (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-foreground/65">Barriers</p>
            <div className="flex flex-wrap gap-2">
              {item.barriers.map((barrier) => (
                <Badge key={barrier} variant="outline">{barrier.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {item.notes?.trim() ? (
          <div className="rounded-lg border border-white/70 bg-white/65 p-3">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{item.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowSummary((prev) => !prev)}>
            {showSummary ? "Hide Summary" : "Generate Summary"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)} disabled={!canEdit}>
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={!canEdit || !item.active || archiving}
            onClick={async () => {
              setArchiving(true);
              try {
                await onArchive(item.id);
              } finally {
                setArchiving(false);
              }
            }}
          >
            {archiving ? "Archiving..." : "Archive"}
          </Button>
        </div>

        {showSummary ? (
          <div className="rounded-lg border border-actifyBlue/30 bg-actifyBlue/10 p-3 text-sm text-foreground">
            {summaryText}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
