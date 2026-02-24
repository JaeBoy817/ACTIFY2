"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEventLite, ScheduleFormState } from "@/components/calendar/types";
import { emptyAdaptations, parseAdaptations, parseChecklistItems } from "@/components/calendar/utils";
import { formatInTimeZone, zonedDateKey } from "@/lib/timezone";

type ActivityTabProps = {
  event: CalendarEventLite | null;
  timeZone: string;
  saving: boolean;
  onEditActivity: () => void;
  onDeleteActivity: (activityId: string) => void;
  onSave: (draft: ScheduleFormState) => Promise<void>;
};

function parseIsoToTime(iso: string, timeZone: string) {
  return formatInTimeZone(new Date(iso), timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
}

export function ActivityTab({ event, timeZone, saving, onEditActivity, onDeleteActivity, onSave }: ActivityTabProps) {
  const [draft, setDraft] = useState<ScheduleFormState | null>(null);

  useEffect(() => {
    if (!event) {
      setDraft(null);
      return;
    }
    setDraft({
      id: event.id,
      templateId: event.templateId,
      title: event.title,
      dateKey: zonedDateKey(new Date(event.startAt), timeZone),
      startTime: parseIsoToTime(event.startAt, timeZone),
      endTime: parseIsoToTime(event.endAt, timeZone),
      location: event.location,
      notes: "",
      checklistItems: parseChecklistItems(event.checklist),
      adaptations: parseAdaptations(event.adaptationsEnabled)
    });
  }, [event, timeZone]);

  const checklistText = useMemo(() => (draft ? draft.checklistItems.join("\n") : ""), [draft]);

  if (!event || !draft) {
    return (
      <p className="rounded-xl border border-dashed border-white/35 bg-white/60 px-3 py-4 text-sm text-foreground/65">
        Select an activity to inspect and edit.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-white/35 bg-white/75 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{event.title}</p>
          <Badge variant="outline" className="bg-white/80 text-[10px]">
            {new Date(event.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-foreground/70">
          <CalendarClock className="mr-1 inline h-3 w-3" />
          {formatInTimeZone(new Date(event.startAt), timeZone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-white/35 bg-white/70 p-3">
        <label className="space-y-1 text-sm">
          Title
          <Input value={draft.title} onChange={(eventInput) => setDraft((current) => current ? { ...current, title: eventInput.target.value } : current)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm">
            Start
            <Input type="time" value={draft.startTime} onChange={(eventInput) => setDraft((current) => current ? { ...current, startTime: eventInput.target.value } : current)} />
          </label>
          <label className="space-y-1 text-sm">
            End
            <Input type="time" value={draft.endTime} onChange={(eventInput) => setDraft((current) => current ? { ...current, endTime: eventInput.target.value } : current)} />
          </label>
        </div>
        <label className="space-y-1 text-sm">
          Location
          <Input value={draft.location} onChange={(eventInput) => setDraft((current) => current ? { ...current, location: eventInput.target.value } : current)} />
        </label>
        <label className="space-y-1 text-sm">
          Checklist (one item per line)
          <Textarea
            value={checklistText}
            onChange={(eventInput) =>
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      checklistItems: eventInput.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    }
                  : current
              )
            }
            rows={4}
          />
        </label>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Adaptations</p>
          {(["bedBound", "dementiaFriendly", "lowVisionHearing", "oneToOneMini"] as const).map((key) => (
            <label key={key} className="inline-flex w-full items-center justify-between rounded-lg border border-white/30 bg-white/75 px-2 py-1.5 text-sm">
              <span className="capitalize text-foreground/80">{key.replace(/([A-Z])/g, " $1")}</span>
              <input
                type="checkbox"
                checked={draft.adaptations[key]?.enabled ?? false}
                onChange={(eventInput) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          adaptations: {
                            ...current.adaptations,
                            [key]: {
                              ...(current.adaptations[key] ?? emptyAdaptations()[key]),
                              enabled: eventInput.target.checked
                            }
                          }
                        }
                      : current
                  )
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void onSave(draft)} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onEditActivity}>
          Open full editor
        </Button>
        <Button type="button" variant="destructive" onClick={() => onDeleteActivity(event.id)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </section>
  );
}
