"use client";

import { addDays, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { useMemo, type DragEvent, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventCategory, formatEventTimeRange } from "@/components/calendar/utils";
import type { CalendarEventLite, CalendarTemplateLite } from "@/components/calendar/types";
import { zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";

type MonthViewProps = {
  anchorDateKey: string;
  events: CalendarEventLite[];
  templateById: Map<string, CalendarTemplateLite>;
  timeZone: string;
  hoveredDropDay: string | null;
  onHoverDropDay: (dayKey: string | null) => void;
  onDropTemplateOrEvent: (dayKey: string, event: DragEvent<HTMLButtonElement>) => void;
  onOpenDay: (dayKey: string) => void;
  onOpenEvent: (eventId: string) => void;
};

function getMonthDays(anchorDateKey: string, timeZone: string) {
  const anchor = zonedDateStringToUtcStart(anchorDateKey, timeZone) ?? new Date();
  const monthStart = startOfMonth(anchor);
  const start = startOfWeek(monthStart, { weekStartsOn: 1 });
  const end = endOfWeek(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0), { weekStartsOn: 1 });
  const rows: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    rows.push(cursor);
  }
  return { monthStart, rows };
}

export function MonthView(props: MonthViewProps) {
  const {
    anchorDateKey,
    events,
    templateById,
    timeZone,
    hoveredDropDay,
    onHoverDropDay,
    onDropTemplateOrEvent,
    onOpenDay,
    onOpenEvent
  } = props;
  const { monthStart, rows } = useMemo(() => getMonthDays(anchorDateKey, timeZone), [anchorDateKey, timeZone]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventLite[]>();
    for (const calendarEvent of events) {
      const key = zonedDateKey(new Date(calendarEvent.startAt), timeZone);
      const bucket = map.get(key) ?? [];
      bucket.push(calendarEvent);
      map.set(key, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [events, timeZone]);

  function handleKeyNav(event: KeyboardEvent<HTMLButtonElement>, dayKey: string) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onOpenDay(dayKey);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/78 shadow-[0_30px_70px_-45px_rgba(56,189,248,0.9)]">
      <div className="grid grid-cols-7 gap-2 border-b border-cyan-300/18 p-3 text-center text-xs font-semibold text-slate-300">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
          <div key={weekday} className="rounded-xl border border-cyan-300/18 bg-slate-900/76 px-2 py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 p-3">
        {rows.map((day) => {
          const dayKey = zonedDateKey(day, timeZone);
          const dayEvents = eventsByDay.get(dayKey) ?? [];
          const outsideMonth = format(day, "yyyy-MM") !== format(monthStart, "yyyy-MM");
          const today = dayKey === zonedDateKey(new Date(), timeZone);
          const previews = dayEvents.slice(0, 2);
          const overflow = Math.max(0, dayEvents.length - previews.length);

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onOpenDay(dayKey)}
              onKeyDown={(event) => handleKeyNav(event, dayKey)}
              onDragOver={(event) => {
                event.preventDefault();
                onHoverDropDay(dayKey);
              }}
              onDragLeave={() => {
                if (hoveredDropDay === dayKey) onHoverDropDay(null);
              }}
              onDrop={(event) => onDropTemplateOrEvent(dayKey, event)}
              aria-label={`Open ${format(day, "EEEE MMMM d")} details`}
              className={cn(
                "min-h-[154px] rounded-2xl border p-2 text-left transition",
                "border-cyan-300/18 bg-slate-900/82",
                outsideMonth && "opacity-55",
                today && "ring-2 ring-cyan-400/60",
                hoveredDropDay === dayKey && "bg-cyan-500/10"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{format(day, "d")}</p>
                <Badge variant="outline" className="border-cyan-300/25 bg-cyan-500/12 px-1.5 text-[10px] text-cyan-100">
                  {dayEvents.length} {dayEvents.length === 1 ? "activity" : "activities"}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {previews.map((calendarEvent) => (
                  <button
                    key={calendarEvent.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenEvent(calendarEvent.id);
                    }}
                    className="block w-full rounded-xl border border-cyan-300/18 bg-slate-800/80 px-2 py-1.5 text-left"
                  >
                    <p className="truncate text-xs font-medium text-slate-100">{calendarEvent.title}</p>
                    <p className="truncate text-[11px] text-slate-300/90">{formatEventTimeRange(calendarEvent, timeZone)}</p>
                  </button>
                ))}
                {overflow > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-cyan-100 hover:bg-cyan-500/15"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDay(dayKey);
                    }}
                  >
                    +{overflow} more
                  </Button>
                ) : null}
                {dayEvents.length > 0 ? (
                  <p className="truncate text-[10px] uppercase tracking-wide text-slate-400">
                    {eventCategory(dayEvents[0], templateById)}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
