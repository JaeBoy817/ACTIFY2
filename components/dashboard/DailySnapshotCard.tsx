import Link from "next/link";
import { AlertTriangle, CalendarClock, ClipboardCheck, PlusCircle, Printer } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";

function AgendaStatusBadge({ attendanceCompleted }: { attendanceCompleted: boolean }) {
  if (attendanceCompleted) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
        Attendance saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      Attendance pending
    </span>
  );
}

export async function DailySnapshotCard({
  summaryPromise
}: {
  summaryPromise: Promise<DashboardHomeSummary>;
}) {
  const summary = await summaryPromise;

  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="-mx-5 -mt-5 mb-4 rounded-t-3xl border-b border-white/35 bg-gradient-to-r from-cyan-500/24 via-blue-500/22 to-violet-500/24 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground/80">Today Planner</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/35 bg-gradient-to-br from-blue-500/25 to-cyan-400/20 text-blue-700">
            <CalendarClock className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Daily Snapshot</h2>
          <p className="text-sm text-foreground/70">List view for today only. Keep moving with the next action.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/45 bg-gradient-to-r from-white/84 via-blue-100/55 to-cyan-100/58 p-3">
        <p className="text-xs uppercase tracking-wide text-foreground/65">Next Up</p>
        {summary.nextUp ? (
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium text-foreground">{summary.nextUp.title}</p>
              <p className="text-xs text-foreground/70">
                {summary.nextUp.timeLabel} · {summary.nextUp.location || "No location"}
              </p>
            </div>
            <AgendaStatusBadge attendanceCompleted={summary.nextUp.attendanceCompleted} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-foreground/70">No upcoming activities today.</p>
        )}
      </div>

      {(summary.agendaInsights.overlapCount > 0 || summary.agendaInsights.missingLocationCount > 0) && (
        <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-900">
          <p className="inline-flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Agenda checks
          </p>
          <p className="mt-1">
            {summary.agendaInsights.overlapCount > 0 ? `${summary.agendaInsights.overlapCount} overlapping time blocks.` : "No overlaps."}{" "}
            {summary.agendaInsights.missingLocationCount > 0 ? `${summary.agendaInsights.missingLocationCount} activities missing location.` : ""}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {summary.todayAgenda.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/45 bg-white/65 px-3 py-5 text-sm text-foreground/70">
            No activities scheduled for today.
          </div>
        ) : (
          summary.todayAgenda.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-3 rounded-2xl border border-white/45 bg-gradient-to-r from-white/80 to-cyan-50/55 px-3 py-2.5 transition hover:brightness-105"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="truncate text-xs text-foreground/70">
                  {item.timeLabel} · {item.location || "No location"}
                </p>
              </div>
              <AgendaStatusBadge attendanceCompleted={item.attendanceCompleted} />
            </Link>
          ))
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link
          href="/app/attendance"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-500/20 to-teal-400/15 px-3 py-2 text-sm font-medium text-foreground transition hover:brightness-105"
        >
          <ClipboardCheck className="h-4 w-4 text-emerald-700" />
          Start Attendance
        </Link>
        <Link
          href="/app/calendar?view=week&create=1"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-500/20 to-cyan-400/15 px-3 py-2 text-sm font-medium text-foreground transition hover:brightness-105"
        >
          <PlusCircle className="h-4 w-4 text-blue-700" />
          Add Activity
        </Link>
        <Link
          href="/app/calendar/pdf"
          target="_blank"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200/60 bg-gradient-to-r from-violet-500/20 to-fuchsia-400/15 px-3 py-2 text-sm font-medium text-foreground transition hover:brightness-105"
        >
          <Printer className="h-4 w-4 text-violet-700" />
          Print Today
        </Link>
      </div>
    </GlassCard>
  );
}

export function DailySnapshotCardSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="mb-4 space-y-2">
        <div className="skeleton shimmer h-5 w-36 rounded" />
        <div className="skeleton shimmer h-3 w-64 rounded" />
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/65 p-3">
        <div className="skeleton shimmer h-3 w-20 rounded" />
        <div className="mt-2 skeleton shimmer h-4 w-3/4 rounded" />
        <div className="mt-2 skeleton shimmer h-3 w-1/2 rounded" />
      </div>

      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/40 bg-white/65 px-3 py-2.5">
            <div className="skeleton shimmer h-3.5 w-40 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-52 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
