"use client";

import { format } from "date-fns";
import { GripVertical, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { memo, useMemo, type DragEvent, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatEventTimeRange, GRID_END_HOUR, GRID_START_HOUR, SLOT_HEIGHT, SLOT_MINUTES } from "@/components/calendar/utils";
import type { CalendarEventLite } from "@/components/calendar/types";
import { zonedDateKey } from "@/lib/timezone";

type WeekViewProps = {
  mode: "week" | "day";
  days: Date[];
  events: CalendarEventLite[];
  timeZone: string;
  hoveredDropDay: string | null;
  onHoverDropDay: (dayKey: string | null) => void;
  onDropToDay: (dayKey: string, minutes: number, event: DragEvent<HTMLElement>) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenDay: (dayKey: string) => void;
  onCreateAt: (dayKey: string, minutes: number) => void;
};

type PositionedEvent = {
  event: CalendarEventLite;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
};

const columnTemplateByCount: Record<number, string> = {
  1: "76px repeat(1, minmax(140px, 1fr))",
  7: "76px repeat(7, minmax(140px, 1fr))"
};

function eventMinutesFromStart(iso: string, timeZone: string) {
  const hhmm = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(new Date(iso))
    .replace(":", "");
  const hour = Number(hhmm.slice(0, 2));
  const minute = Number(hhmm.slice(2, 4));
  return hour * 60 + minute;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildSlots() {
  const slots: Array<{ minute: number; label: string }> = [];
  const start = GRID_START_HOUR * 60;
  const end = GRID_END_HOUR * 60;
  for (let minute = start; minute <= end; minute += SLOT_MINUTES) {
    const hour24 = Math.floor(minute / 60);
    const label = format(new Date(2000, 0, 1, hour24, minute % 60), "h a");
    slots.push({ minute, label });
  }
  return slots;
}

function positionDayEvents(dayEvents: CalendarEventLite[], timeZone: string, totalHeight: number): PositionedEvent[] {
  if (dayEvents.length === 0) return [];
  const entries = dayEvents
    .map((event) => {
      const start = eventMinutesFromStart(event.startAt, timeZone);
      const end = eventMinutesFromStart(event.endAt, timeZone);
      return {
        event,
        start: Math.max(start, GRID_START_HOUR * 60),
        end: Math.max(start + SLOT_MINUTES, Math.min(end, GRID_END_HOUR * 60))
      };
    })
    .sort((a, b) => a.start - b.start);

  const columns: Array<Array<{ start: number; end: number; index: number }>> = [];
  const placements: Array<{ index: number; col: number }> = [];
  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index];
    let assigned = false;
    for (let col = 0; col < columns.length; col += 1) {
      const last = columns[col][columns[col].length - 1];
      if (current.start >= last.end) {
        columns[col].push({ start: current.start, end: current.end, index });
        placements.push({ index, col });
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      columns.push([{ start: current.start, end: current.end, index }]);
      placements.push({ index, col: columns.length - 1 });
    }
  }

  const columnCount = Math.max(1, columns.length);
  const widthPct = 100 / columnCount;

  return placements.map(({ index, col }) => {
    const row = entries[index];
    const top = ((row.start - GRID_START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT;
    const height = Math.max(SLOT_HEIGHT - 2, ((row.end - row.start) / SLOT_MINUTES) * SLOT_HEIGHT - 2);
    return {
      event: row.event,
      top: clamp(top, 0, totalHeight),
      height: clamp(height, SLOT_HEIGHT - 2, totalHeight),
      leftPct: col * widthPct,
      widthPct
    };
  });
}

const DayColumn = memo(function DayColumn(props: {
  day: Date;
  dayEvents: CalendarEventLite[];
  slots: Array<{ minute: number; label: string }>;
  totalHeight: number;
  hoveredDropDay: string | null;
  timeZone: string;
  onHoverDropDay: (dayKey: string | null) => void;
  onDropToDay: (dayKey: string, minutes: number, event: DragEvent<HTMLElement>) => void;
  onOpenEvent: (eventId: string) => void;
  onCreateAt: (dayKey: string, minutes: number) => void;
  onOpenDay: (dayKey: string) => void;
}) {
  const {
    day,
    dayEvents,
    slots,
    totalHeight,
    hoveredDropDay,
    timeZone,
    onHoverDropDay,
    onDropToDay,
    onOpenEvent,
    onCreateAt,
    onOpenDay
  } = props;
  const dayKey = zonedDateKey(day, timeZone);
  const today = dayKey === zonedDateKey(new Date(), timeZone);
  const positionedEvents = useMemo(() => positionDayEvents(dayEvents, timeZone, totalHeight), [dayEvents, timeZone, totalHeight]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, minutes: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      onCreateAt(dayKey, minutes);
    }
  }

  return (
    <div
      className={cn(
        "relative border-r border-white/35 bg-white/45",
        today && "bg-actifyBlue/8",
        hoveredDropDay === dayKey && "bg-actifyMint/16"
      )}
      style={{ height: totalHeight }}
      onDragOver={(event) => {
        event.preventDefault();
        onHoverDropDay(dayKey);
      }}
      onDragLeave={() => onHoverDropDay(null)}
      onDrop={(event) => {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const offsetY = event.clientY - bounds.top;
        const minute = GRID_START_HOUR * 60 + Math.floor(offsetY / SLOT_HEIGHT) * SLOT_MINUTES;
        onDropToDay(dayKey, clamp(minute, GRID_START_HOUR * 60, GRID_END_HOUR * 60), event);
      }}
    >
      {slots.map((slot, slotIndex) => (
        <button
          key={`${dayKey}-${slot.minute}`}
          type="button"
          className="absolute left-0 right-0 z-[1] border-b border-transparent bg-transparent text-left focus-visible:bg-actifyBlue/10 focus-visible:outline-none"
          style={{ top: slotIndex * SLOT_HEIGHT, height: SLOT_HEIGHT }}
          onClick={() => onCreateAt(dayKey, slot.minute)}
          onKeyDown={(event) => handleKeyDown(event, slot.minute)}
          aria-label={`Create activity on ${format(day, "EEEE MMM d")} at ${slot.label}`}
        />
      ))}

      {slots.map((slot, slotIndex) => (
        <div
          key={`line-${dayKey}-${slot.minute}`}
          className={cn("pointer-events-none absolute left-0 right-0 border-b border-white/30", slotIndex % 6 === 0 && "border-b-white/60")}
          style={{ top: slotIndex * SLOT_HEIGHT, height: SLOT_HEIGHT }}
        />
      ))}

      {positionedEvents.map(({ event, top, height, leftPct, widthPct }) => (
        <button
          key={event.id}
          type="button"
          draggable
          onDragStart={(dragEvent) => {
            dragEvent.dataTransfer.effectAllowed = "move";
            dragEvent.dataTransfer.setData("application/x-actify-calendar", JSON.stringify({ type: "event", id: event.id }));
          }}
          onClick={() => onOpenEvent(event.id)}
          className="group absolute z-[2] overflow-hidden rounded-xl border border-white/45 bg-white/88 p-2 text-left shadow-md shadow-black/15 transition hover:bg-white"
          style={{
            top,
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            height
          }}
        >
          <p className="truncate text-xs font-semibold text-foreground">{event.title}</p>
          <p className="truncate text-[11px] text-foreground/65">{formatEventTimeRange(event, timeZone)}</p>
          <p className="truncate text-[11px] text-foreground/55">{event.location}</p>
          <div className="mt-1 flex items-center justify-between gap-1">
            <Badge variant="outline" className="bg-white/80 text-[10px]">
              {new Date(event.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
            </Badge>
            <GripVertical className="h-3.5 w-3.5 text-foreground/50" />
          </div>
          <Link
            href={`/app/calendar/${event.id}/attendance`}
            className="absolute right-1 top-1 hidden rounded-md border border-white/45 bg-white/80 p-1 text-[11px] group-hover:inline-flex"
            onClick={(eventClick) => eventClick.stopPropagation()}
          >
            <LinkIcon className="h-3 w-3" />
          </Link>
        </button>
      ))}

      <button
        type="button"
        className="absolute inset-0 z-[0]"
        aria-label={`Open ${format(day, "EEEE MMM d")} day details`}
        onClick={() => onOpenDay(dayKey)}
      />
    </div>
  );
});

export function WeekView(props: WeekViewProps) {
  const { mode, days, events, timeZone, hoveredDropDay, onHoverDropDay, onDropToDay, onOpenEvent, onOpenDay, onCreateAt } = props;
  const slots = useMemo(() => buildSlots(), []);
  const totalHeight = slots.length * SLOT_HEIGHT;

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

  const templateColumns = columnTemplateByCount[days.length] ?? `76px repeat(${days.length}, minmax(140px, 1fr))`;

  return (
    <section className="rounded-2xl border border-white/20 bg-white/45 shadow-lg shadow-black/10">
      <div className="max-h-[78vh] overflow-auto rounded-2xl">
        <div className={cn(mode === "week" ? "min-w-[1040px]" : "min-w-[520px]")}>
          <div className="sticky top-0 z-20 grid border-b border-white/35 bg-white/90 backdrop-blur-sm" style={{ gridTemplateColumns: templateColumns }}>
            <div className="border-r border-white/35 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/65">
              Time
            </div>
            {days.map((day) => {
              const dayKey = zonedDateKey(day, timeZone);
              const dayEvents = eventsByDay.get(dayKey) ?? [];
              return (
                <button
                  key={dayKey}
                  type="button"
                  className={cn(
                    "border-r border-white/35 px-2 py-2 text-left transition",
                    dayKey === zonedDateKey(new Date(), timeZone) && "bg-actifyBlue/10",
                    hoveredDropDay === dayKey && "bg-actifyMint/16"
                  )}
                  onClick={() => onOpenDay(dayKey)}
                >
                  <p className="text-xs font-semibold text-foreground">{format(day, "EEE")}</p>
                  <p className="text-sm text-foreground/85">{format(day, "MMM d")}</p>
                  <p className="text-[11px] text-foreground/65">{dayEvents.length} activities</p>
                </button>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: templateColumns }}>
            <div className="border-r border-white/35 bg-white/70">
              {slots.map((slot, slotIndex) => (
                <div
                  key={`slot-label-${slot.minute}`}
                  className={cn(
                    "border-b border-white/30 px-2 py-1 text-[11px] text-foreground/60",
                    slotIndex % 6 === 0 && "border-b-white/60"
                  )}
                  style={{ height: SLOT_HEIGHT }}
                >
                  {slot.minute % 60 === 0 ? slot.label : ""}
                </div>
              ))}
            </div>

            {days.map((day) => (
              <DayColumn
                key={zonedDateKey(day, timeZone)}
                day={day}
                dayEvents={eventsByDay.get(zonedDateKey(day, timeZone)) ?? []}
                slots={slots}
                totalHeight={totalHeight}
                hoveredDropDay={hoveredDropDay}
                timeZone={timeZone}
                onHoverDropDay={onHoverDropDay}
                onDropToDay={onDropToDay}
                onOpenEvent={onOpenEvent}
                onCreateAt={onCreateAt}
                onOpenDay={onOpenDay}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
