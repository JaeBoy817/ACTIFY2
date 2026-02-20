import { Building2, CalendarDays, CircleCheck, ListTodo, Users } from "lucide-react";

import { GlassTabs } from "@/components/resident-council/GlassTabs";
import { LiveDateTimeBadge } from "@/components/app/live-date-time-badge";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import type { ResidentCouncilSnapshot, ResidentCouncilView } from "@/lib/resident-council/types";

export function ResidentCouncilShell({
  writable,
  timeZone,
  currentView,
  snapshot,
  children
}: {
  writable: boolean;
  timeZone: string;
  currentView: ResidentCouncilView;
  snapshot: ResidentCouncilSnapshot;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden px-5 py-5">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 left-20 h-48 w-48 rounded-full bg-actifyMint/20 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[var(--font-display)] text-3xl text-foreground">Resident Council</h1>
                <Badge className="border-0 bg-actify-warm text-foreground">Council Hub</Badge>
                {!writable ? <Badge variant="outline">Read-only</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LiveDateTimeBadge timeZone={timeZone} mode="date-time" />
                <Badge variant="outline">Meetings: {snapshot.stats.meetingsCount}</Badge>
                <Badge variant="secondary">Open items: {snapshot.stats.openItemsCount}</Badge>
              </div>
              <p className="max-w-3xl text-sm text-foreground/75">
                One calm workspace for meeting minutes, resident voice topics, follow-up tasks, and exports.
              </p>
            </div>
          </div>
          <GlassTabs currentView={currentView} />
        </div>
      </GlassPanel>

      <section className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard variant="dense" hover className="h-full min-h-[132px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyBlue/15 text-actifyBlue">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Meetings</p>
              <p className="text-2xl font-semibold text-foreground">{snapshot.stats.meetingsCount}</p>
              <p className="text-xs text-foreground/70">Logged total</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dense" hover className="h-full min-h-[132px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <ListTodo className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Open Actions</p>
              <p className="text-2xl font-semibold text-foreground">{snapshot.stats.openItemsCount}</p>
              <p className="text-xs text-foreground/70">Needs follow-up</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dense" hover className="h-full min-h-[132px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CircleCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Resolved</p>
              <p className="text-2xl font-semibold text-foreground">{snapshot.stats.resolvedItemsCount}</p>
              <p className="text-xs text-foreground/70">Closed tasks</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dense" hover className="h-full min-h-[132px]">
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-actifyMint/25 text-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-foreground/65">Avg Attendance</p>
              <p className="text-2xl font-semibold text-foreground">{snapshot.stats.averageAttendance.toFixed(1)}</p>
              <p className="text-xs text-foreground/70">Per meeting</p>
            </div>
          </div>
        </GlassCard>
      </section>

      <div className="rounded-2xl border border-white/20 bg-white/40 p-1 shadow-xl shadow-black/10">
        {children}
      </div>

      <GlassCard variant="dense" className="flex items-center gap-2 rounded-2xl p-4">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-actifyBlue/15 text-actifyBlue">
          <Building2 className="h-4 w-4" />
        </div>
        <p className="text-sm text-foreground/75">
          Resident Council workflow stays aligned with care planning, notes, and attendance follow-through.
        </p>
      </GlassCard>
    </div>
  );
}
