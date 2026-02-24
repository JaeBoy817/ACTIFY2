"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventTimeRange } from "@/components/calendar/utils";
import type { CalendarEventLite } from "@/components/calendar/types";
import { formatInTimeZone, zonedDateKey } from "@/lib/timezone";

type AgendaRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "event"; key: string; event: CalendarEventLite };

type AgendaViewProps = {
  events: CalendarEventLite[];
  timeZone: string;
  onOpenEvent: (eventId: string) => void;
  onOpenDay: (dayKey: string) => void;
};

export function AgendaView({ events, timeZone, onOpenEvent, onOpenDay }: AgendaViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo<AgendaRow[]>(() => {
    const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const items: AgendaRow[] = [];
    let current = "";
    for (const calendarEvent of sorted) {
      const dayKey = zonedDateKey(new Date(calendarEvent.startAt), timeZone);
      if (dayKey !== current) {
        current = dayKey;
        items.push({
          kind: "header",
          key: `header-${dayKey}`,
          label: formatInTimeZone(new Date(calendarEvent.startAt), timeZone, {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric"
          })
        });
      }
      items.push({
        kind: "event",
        key: calendarEvent.id,
        event: calendarEvent
      });
    }
    return items;
  }, [events, timeZone]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index]?.kind === "header" ? 40 : 84),
    overscan: 14
  });

  return (
    <section className="rounded-2xl border border-white/20 bg-white/45 p-2 shadow-lg shadow-black/10">
      <div ref={scrollRef} className="max-h-[74vh] overflow-auto rounded-xl">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/40 bg-white/55 p-6 text-center text-sm text-foreground/65">
            No activities in this range. Use <span className="font-semibold">Quick Add</span> to schedule one.
          </div>
        ) : (
          <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              if (row.kind === "header") {
                const dayKey = row.key.replace("header-", "");
                return (
                  <div
                    key={row.key}
                    className="absolute left-0 top-0 w-full px-2 py-1"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-full justify-start rounded-lg bg-white/70 text-left text-xs font-semibold uppercase tracking-wide text-foreground/70"
                      onClick={() => onOpenDay(dayKey)}
                    >
                      {row.label}
                    </Button>
                  </div>
                );
              }

              const calendarEvent = row.event;
              return (
                <button
                  key={row.key}
                  type="button"
                  className="absolute left-0 top-0 w-full px-2"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  onClick={() => onOpenEvent(calendarEvent.id)}
                >
                  <div className="rounded-xl border border-white/35 bg-white/82 p-3 text-left shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{calendarEvent.title}</p>
                      <Badge variant="outline" className="bg-white/75 text-[10px]">
                        {new Date(calendarEvent.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground/70">{formatEventTimeRange(calendarEvent, timeZone)}</p>
                    <p className="text-xs text-foreground/60">{calendarEvent.location}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
