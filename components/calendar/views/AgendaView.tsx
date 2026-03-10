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
    estimateSize: (index) => (rows[index]?.kind === "header" ? 42 : 90),
    overscan: 14
  });

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-slate-950/78 p-2 shadow-[0_30px_70px_-45px_rgba(56,189,248,0.9)]">
      <div ref={scrollRef} className="max-h-[74vh] overflow-auto rounded-2xl">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-slate-900/65 p-6 text-center text-sm text-slate-300">
            No activities in this range. Use <span className="font-semibold">New Activity</span> to schedule one.
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
                      className="h-8 w-full justify-start rounded-xl bg-slate-900/80 text-left text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/12"
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
                  <div className="rounded-2xl border border-cyan-300/20 bg-slate-900/82 p-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-100">{calendarEvent.title}</p>
                      <Badge variant="outline" className="border-cyan-300/25 bg-cyan-500/10 text-[10px] text-cyan-100">
                        {new Date(calendarEvent.endAt).getTime() < Date.now() ? "Completed" : "Scheduled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300/90">{formatEventTimeRange(calendarEvent, timeZone)}</p>
                    <p className="text-xs text-slate-400">{calendarEvent.location}</p>
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
