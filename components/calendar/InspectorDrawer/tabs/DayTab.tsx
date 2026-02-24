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
      <div className="rounded-xl border border-white/35 bg-white/75 p-3">
        <p className="text-xs uppercase tracking-wide text-foreground/60">Day Overview</p>
        <h3 className="text-lg font-semibold text-foreground">
          {dayDate
            ? formatInTimeZone(dayDate, timeZone, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric"
              })
            : "Select a day"}
        </h3>
        <p className="text-xs text-foreground/65">{events.length} scheduled activities</p>
        {selectedDateKey ? (
          <Button type="button" size="sm" className="mt-2" onClick={() => onCreateForDay(selectedDateKey)}>
            <CalendarPlus2 className="h-3.5 w-3.5" />
            Add activity
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/35 bg-white/60 px-3 py-4 text-sm text-foreground/65">
            No activities for this day.
          </p>
        ) : (
          events.map((calendarEvent) => (
            <button
              key={calendarEvent.id}
              type="button"
              onClick={() => onOpenActivity(calendarEvent.id)}
              className="w-full rounded-xl border border-white/35 bg-white/75 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{calendarEvent.title}</p>
                <Badge variant="outline" className="bg-white/80 text-[10px]">
                  {new Date(calendarEvent.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
                </Badge>
              </div>
              <p className="text-xs text-foreground/70">{formatEventTimeRange(calendarEvent, timeZone)}</p>
              <p className="text-xs text-foreground/60">{calendarEvent.location}</p>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
