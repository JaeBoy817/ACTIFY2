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
      <p className="rounded-2xl border border-dashed border-cyan-300/25 bg-slate-900/60 px-3 py-4 text-sm text-slate-300">
        Select an activity to inspect and edit.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-100">{event.title}</p>
          <Badge variant="outline" className="border-cyan-300/30 bg-cyan-500/10 text-[10px] text-cyan-100">
            {new Date(event.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-300">
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

      <div className="space-y-2 rounded-2xl border border-cyan-300/20 bg-slate-900/75 p-3">
        <label className="space-y-1 text-sm text-slate-200">
          Title
          <Input
            value={draft.title}
            className="border-cyan-300/20 bg-slate-900/80 text-slate-100"
            onChange={(eventInput) => setDraft((current) => (current ? { ...current, title: eventInput.target.value } : current))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm text-slate-200">
            Start
            <Input
              type="time"
              value={draft.startTime}
              className="border-cyan-300/20 bg-slate-900/80 text-slate-100"
              onChange={(eventInput) => setDraft((current) => (current ? { ...current, startTime: eventInput.target.value } : current))}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            End
            <Input
              type="time"
              value={draft.endTime}
              className="border-cyan-300/20 bg-slate-900/80 text-slate-100"
              onChange={(eventInput) => setDraft((current) => (current ? { ...current, endTime: eventInput.target.value } : current))}
            />
          </label>
        </div>
        <label className="space-y-1 text-sm text-slate-200">
          Location
          <Input
            value={draft.location}
            className="border-cyan-300/20 bg-slate-900/80 text-slate-100"
            onChange={(eventInput) => setDraft((current) => (current ? { ...current, location: eventInput.target.value } : current))}
          />
        </label>
        <label className="space-y-1 text-sm text-slate-200">
          Checklist (one item per line)
          <Textarea
            value={checklistText}
            className="border-cyan-300/20 bg-slate-900/80 text-slate-100"
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
          <p className="text-xs uppercase tracking-wide text-slate-300/80">Adaptations</p>
          {(["bedBound", "dementiaFriendly", "lowVisionHearing", "oneToOneMini"] as const).map((key) => (
            <label
              key={key}
              className="inline-flex w-full items-center justify-between rounded-lg border border-cyan-300/18 bg-slate-900/75 px-2 py-1.5 text-sm"
            >
              <span className="capitalize text-slate-200">{key.replace(/([A-Z])/g, " $1")}</span>
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
        <Button
          type="button"
          onClick={() => void onSave(draft)}
          disabled={saving}
          className="bg-gradient-to-r from-cyan-500/85 to-indigo-500/85 text-white"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onEditActivity} className="border-cyan-300/25 bg-slate-900/80 text-slate-100">
          Open Full Editor
        </Button>
        <Button type="button" variant="destructive" onClick={() => onDeleteActivity(event.id)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </section>
  );
}
