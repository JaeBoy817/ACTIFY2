"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanItemCard, type ResidentPlanItemView } from "@/components/residents/PlanItemCard";
import { PlanItemModal, type ResidentPlanFormPayload } from "@/components/residents/PlanItemModal";
import { getPlanAreaLabel } from "@/lib/planLibrary";
import { useToast } from "@/lib/use-toast";

type ResidentPlanSectionProps = {
  residentId: string;
  residentName: string;
  items: ResidentPlanItemView[];
  canEdit: boolean;
  savePlanItemAction: (formData: FormData) => Promise<void> | void;
  archivePlanItemAction: (formData: FormData) => Promise<void> | void;
};

function sortPlanItems(items: ResidentPlanItemView[]) {
  return [...items].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function toFormData(residentId: string, payload: ResidentPlanFormPayload) {
  const formData = new FormData();
  formData.set("residentId", residentId);
  if (payload.id) formData.set("planItemId", payload.id);
  formData.set("planAreaKey", payload.planAreaKey);
  if (payload.goalTemplateId) formData.set("goalTemplateId", payload.goalTemplateId);
  if (payload.customGoalText) formData.set("customGoalText", payload.customGoalText);
  formData.set("targetFrequency", payload.targetFrequency);
  formData.set("cueingLevel", payload.cueingLevel);
  formData.set("groupPreference", payload.groupPreference);
  formData.set("active", payload.active ? "true" : "false");
  if (payload.notes) formData.set("notes", payload.notes);
  payload.interventions.forEach((value) => formData.append("interventions", value));
  payload.barriers.forEach((value) => formData.append("barriers", value));
  return formData;
}

export function ResidentPlanSection({
  residentId,
  residentName,
  items: initialItems,
  canEdit,
  savePlanItemAction,
  archivePlanItemAction
}: ResidentPlanSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<ResidentPlanItemView[]>(sortPlanItems(initialItems));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResidentPlanItemView | null>(null);

  useEffect(() => {
    setItems(sortPlanItems(initialItems));
  }, [initialItems]);

  const activeCount = useMemo(() => items.filter((item) => item.active).length, [items]);

  async function handleSave(payload: ResidentPlanFormPayload) {
    const timestamp = new Date().toISOString();
    const optimisticId = payload.id ?? `temp-${Math.random().toString(36).slice(2)}`;
    const optimisticItem: ResidentPlanItemView = {
      ...payload,
      id: optimisticId,
      goalTemplateId: payload.goalTemplateId ?? null,
      customGoalText: payload.customGoalText ?? null,
      notes: payload.notes ?? null,
      createdAt: payload.id
        ? items.find((item) => item.id === payload.id)?.createdAt ?? timestamp
        : timestamp,
      updatedAt: timestamp
    };

    setItems((prev) => sortPlanItems(payload.id ? prev.map((item) => (item.id === payload.id ? optimisticItem : item)) : [optimisticItem, ...prev]));

    try {
      await savePlanItemAction(toFormData(residentId, payload));
      toast({ title: payload.id ? "Plan item updated" : "Plan item added" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not save plan item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
      setItems(sortPlanItems(initialItems));
      throw error;
    }
  }

  async function handleArchive(itemId: string) {
    setItems((prev) =>
      sortPlanItems(prev.map((item) => (item.id === itemId ? { ...item, active: false, updatedAt: new Date().toISOString() } : item)))
    );

    const formData = new FormData();
    formData.set("residentId", residentId);
    formData.set("planItemId", itemId);

    try {
      await archivePlanItemAction(formData);
      toast({ title: "Plan item archived" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not archive plan item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
      setItems(sortPlanItems(initialItems));
    }
  }

  return (
    <GlassPanel variant="warm" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-display)] text-xl text-foreground">Plan Areas (Activities)</h2>
          <p className="text-sm text-muted-foreground">
            Track activity-focused plan areas, goals, interventions, and barriers for this resident.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white/75">
            {activeCount} active
          </Badge>
          <Button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
            disabled={!canEdit}
          >
            + Add Plan Area
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <GlassCard variant="dense" className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No plan areas yet. Add your first plan area to start documenting activity goals.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <PlanItemCard
              key={item.id}
              residentName={residentName}
              item={item}
              canEdit={canEdit}
              onEdit={(selectedItem) => {
                setEditingItem(selectedItem);
                setModalOpen(true);
              }}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <PlanItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        canEdit={canEdit}
        initialItem={
          editingItem
            ? {
                id: editingItem.id,
                planAreaKey: editingItem.planAreaKey,
                goalTemplateId: editingItem.goalTemplateId ?? null,
                customGoalText: editingItem.customGoalText ?? null,
                targetFrequency: editingItem.targetFrequency,
                interventions: editingItem.interventions,
                cueingLevel: editingItem.cueingLevel,
                groupPreference: editingItem.groupPreference,
                barriers: editingItem.barriers,
                notes: editingItem.notes ?? null,
                active: editingItem.active
              }
            : null
        }
        onSave={handleSave}
      />

      {!canEdit ? (
        <p className="text-xs text-muted-foreground">
          View-only mode. You can review {getPlanAreaLabel("LEISURE_ENGAGEMENT")} plans, but editing is disabled for your role.
        </p>
      ) : null}
    </GlassPanel>
  );
}
