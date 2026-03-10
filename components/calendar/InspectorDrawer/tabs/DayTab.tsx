"use client";

import { CalendarPlus2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarEventLite } from "@/components/calendar/types";
import { formatEventTimeRange } from "@/components/calendar/utils";
import { formatInTimeZone, zonedDateStringToUtcStart } from "@/lib/timezone";

type DayTabProps = {
  selectedDateKey: string | null;
  events: CalendarEventLite[];
  timeZone: string;
  onOpenActivity: (activityId: string) => void;
  onCreateForDay: (dateKey: string) => void;
};

export function DayTab({ selectedDateKey, events, timeZone, onOpenActivity, onCreateForDay }: DayTabProps) {
  const dayDate = selectedDateKey ? zonedDateStringToUtcStart(selectedDateKey, timeZone) : null;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-3">
        <p className="text-xs uppercase tracking-wide text-cyan-100/70">Selected Day</p>
        <h3 className="text-lg font-semibold text-slate-100">
          {dayDate
            ? formatInTimeZone(dayDate, timeZone, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric"
              })
            : "Select a day"}
        </h3>
        <p className="text-xs text-slate-300/85">{events.length} scheduled activities</p>
        {selectedDateKey ? (
          <Button
            type="button"
            size="sm"
            className="mt-2 bg-gradient-to-r from-cyan-500/85 to-indigo-500/85 text-white"
            onClick={() => onCreateForDay(selectedDateKey)}
          >
            <CalendarPlus2 className="h-3.5 w-3.5" />
            Add Activity
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-cyan-300/25 bg-slate-900/60 px-3 py-4 text-sm text-slate-300">
            No activities for this day.
          </p>
        ) : (
          events.map((calendarEvent) => (
            <button
              key={calendarEvent.id}
              type="button"
              onClick={() => onOpenActivity(calendarEvent.id)}
              className="w-full rounded-2xl border border-cyan-300/20 bg-slate-900/75 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-100">{calendarEvent.title}</p>
                <Badge variant="outline" className="border-cyan-300/30 bg-cyan-500/10 text-[10px] text-cyan-100">
                  {new Date(calendarEvent.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
                </Badge>
              </div>
              <p className="text-xs text-slate-300/90">{formatEventTimeRange(calendarEvent, timeZone)}</p>
              <p className="text-xs text-slate-400">{calendarEvent.location}</p>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
