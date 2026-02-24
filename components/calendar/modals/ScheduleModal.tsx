"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdaptationFieldKey, ScheduleFormState } from "@/components/calendar/types";

const adaptationLabels: Array<{ key: AdaptationFieldKey; label: string }> = [
  { key: "bedBound", label: "Bed-bound adaptation" },
  { key: "dementiaFriendly", label: "Dementia adaptation" },
  { key: "lowVisionHearing", label: "Low-vision adaptation" },
  { key: "oneToOneMini", label: "1:1 mini adaptation" }
];

type ScheduleModalProps = {
  open: boolean;
  mode: "create" | "edit";
  value: ScheduleFormState | null;
  saving: boolean;
  onClose: () => void;
  onChange: (next: ScheduleFormState) => void;
  onSave: () => void;
  onDelete?: () => void;
};

export function ScheduleModal({ open, mode, value, saving, onClose, onChange, onSave, onDelete }: ScheduleModalProps) {
  const [showChecklist, setShowChecklist] = useState(true);
  const [showAdaptations, setShowAdaptations] = useState(true);

  const checklistText = useMemo(() => (value ? value.checklistItems.join("\n") : ""), [value]);

  if (!value) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/35 bg-white/95 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Schedule Activity" : "Edit Activity"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <label className="space-y-1 text-sm">
            Title
            <Input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} placeholder="Activity title" />
          </label>

          <div className="grid gap-2 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              Date
              <Input type="date" value={value.dateKey} onChange={(event) => onChange({ ...value, dateKey: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              Start
              <Input type="time" value={value.startTime} onChange={(event) => onChange({ ...value, startTime: event.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              End
              <Input type="time" value={value.endTime} onChange={(event) => onChange({ ...value, endTime: event.target.value })} />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            Location
            <Input value={value.location} onChange={(event) => onChange({ ...value, location: event.target.value })} placeholder="Activity Room" />
          </label>

          <label className="space-y-1 text-sm">
            Notes (optional)
            <Textarea value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} rows={3} />
          </label>

          <div className="rounded-xl border border-white/35 bg-white/70 p-3">
            <button
              type="button"
              className="mb-2 text-sm font-semibold text-foreground"
              onClick={() => setShowChecklist((current) => !current)}
            >
              Checklist {showChecklist ? "▾" : "▸"}
            </button>
            {showChecklist ? (
              <Textarea
                value={checklistText}
                onChange={(event) =>
                  onChange({
                    ...value,
                    checklistItems: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  })
                }
                rows={4}
                placeholder="One line per checklist item"
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-white/35 bg-white/70 p-3">
            <button
              type="button"
              className="mb-2 text-sm font-semibold text-foreground"
              onClick={() => setShowAdaptations((current) => !current)}
            >
              Adaptations {showAdaptations ? "▾" : "▸"}
            </button>
            {showAdaptations ? (
              <div className="space-y-2">
                {adaptationLabels.map(({ key, label }) => (
                  <div key={key} className="space-y-1 rounded-lg border border-white/35 bg-white/75 p-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={value.adaptations[key].enabled}
                        onChange={(event) =>
                          onChange({
                            ...value,
                            adaptations: {
                              ...value.adaptations,
                              [key]: {
                                ...value.adaptations[key],
                                enabled: event.target.checked
                              }
                            }
                          })
                        }
                      />
                      {label}
                    </label>
                    <Input
                      value={value.adaptations[key].override}
                      onChange={(event) =>
                        onChange({
                          ...value,
                          adaptations: {
                            ...value.adaptations,
                            [key]: {
                              ...value.adaptations[key],
                              override: event.target.value
                            }
                          }
                        })
                      }
                      placeholder="Optional override text"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="justify-between">
          <div>
            {mode === "edit" && onDelete ? (
              <Button type="button" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Save activity" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
