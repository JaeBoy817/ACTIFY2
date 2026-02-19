"use client";

import { CalendarCheck2, Clock3, StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttendanceSessionSummary } from "@/lib/attendance-tracker/types";

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function AttendanceSessionList({
  sessions,
  selectedSessionId,
  onSelectSession
}: {
  sessions: AttendanceSessionSummary[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}) {
  return (
    <section className="glass-panel rounded-2xl border-white/15 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-[var(--font-display)] text-lg">Session History</h2>
        <Badge variant="outline" className="border-white/35 bg-white/70">
          {sessions.length} sessions
        </Badge>
      </div>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/35 bg-white/40 p-6 text-sm text-muted-foreground">
            No sessions found for this filter.
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "w-full rounded-xl border bg-white/65 p-3 text-left transition",
                "border-white/30 hover:bg-white/80",
                selectedSessionId === session.id && "ring-2 ring-[color:var(--actify-accent)]/45"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{session.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTimeRange(session.startAt, session.endAt)}</p>
                </div>
                <Badge variant="outline" className="border-white/35 bg-white/70 text-xs">
                  {session.completionPercent.toFixed(0)}%
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  {session.counts.present} present
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                  {session.counts.refused} refused
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                  {session.counts.asleep} asleep
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">
                  {session.counts.oneToOne} 1:1
                </span>
                {session.hasNotes ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                    <StickyNote className="h-3.5 w-3.5" />
                    Notes
                  </span>
                ) : null}
              </div>

              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Updated {new Date(session.updatedAt).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

