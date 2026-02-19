"use client";

import Link from "next/link";
import { CalendarDays, Clock3, PartyPopper, UsersRound } from "lucide-react";

import { useDashboardPreferences } from "@/components/dashboard/DashboardSettingsPanel";
import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import type { DashboardExtendedSummary } from "@/lib/dashboard/getDashboardSummary";

export function DashboardActivityFeedExtras({
  extended,
  showBirthdaysWidget
}: {
  extended: DashboardExtendedSummary | null;
  showBirthdaysWidget: boolean;
}) {
  const { preferences } = useDashboardPreferences();

  if (!extended) {
    return (
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <p className="text-sm text-foreground/70">Extra dashboard widgets are unavailable for this workspace.</p>
      </GlassCard>
    );
  }

  if (!preferences.showExtraWidgetsInActivityFeed) {
    return (
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Extra widgets are hidden</h3>
            <p className="text-sm text-foreground/70">Enable them in Dashboard Settings if you want schedule, participation, and birthdays here.</p>
          </div>
          <Link href="/app/dashboard/settings" className="rounded-lg border border-white/40 bg-white/80 px-3 py-1.5 text-sm font-medium text-foreground">
            Open settings
          </Link>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Participation Snapshot</h3>
            <p className="text-sm text-foreground/70">Monthly participation and entry mix.</p>
          </div>
          <UsersRound className="h-4 w-4 text-foreground/65" />
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/45 bg-white/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-foreground/65">Residents</p>
            <p className="text-xl font-semibold">{extended.participation.activeResidentCount}</p>
          </div>
          <div className="rounded-xl border border-white/45 bg-white/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-foreground/65">This month</p>
            <p className="text-xl font-semibold">{extended.participation.monthParticipationPercent.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-white/45 bg-white/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-foreground/65">Avg daily</p>
            <p className="text-xl font-semibold">{extended.participation.averageDailyPercent.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-2">
          {extended.statusBreakdown.map((item) => (
            <div key={item.status} className="rounded-lg border border-white/45 bg-white/70 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span>{item.label}</span>
                <span>{item.count} ({item.percent.toFixed(1)}%)</span>
              </div>
              <div className="h-2 rounded-full bg-white/60">
                <div className="h-2 rounded-full bg-actify-brand" style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Today&apos;s Schedule</h3>
            <p className="text-sm text-foreground/70">Quick read before opening full calendar.</p>
          </div>
          <CalendarDays className="h-4 w-4 text-foreground/65" />
        </div>

        {extended.schedulePreview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/45 bg-white/60 px-3 py-4 text-sm text-foreground/70">
            No activities scheduled today.
          </div>
        ) : (
          <div className="space-y-2">
            {extended.schedulePreview.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/45 bg-white/70 px-3 py-2.5 transition hover:bg-white/85"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-foreground/70">{item.location}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-foreground/70">
                  <Clock3 className="h-3 w-3" />
                  {item.timeLabel}
                </span>
              </Link>
            ))}
          </div>
        )}

        {showBirthdaysWidget ? (
          <div className="mt-4 space-y-2 rounded-xl border border-white/45 bg-white/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Birthdays Today</p>
              <Badge variant="secondary" className="bg-white/80">
                {extended.birthdaysToday.length}
              </Badge>
            </div>
            {extended.birthdaysToday.length === 0 ? (
              <p className="text-xs text-foreground/70">No birthdays today.</p>
            ) : (
              <div className="space-y-1.5">
                {extended.birthdaysToday.map((resident) => (
                  <div key={resident.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/45 bg-white/80 px-2.5 py-1.5">
                    <span className="text-sm">{resident.residentName}</span>
                    <span className="text-xs text-foreground/70">Room {resident.room}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-1">
              <Link href="/app/residents" className="inline-flex items-center gap-1 text-xs font-medium text-actifyBlue hover:underline">
                <PartyPopper className="h-3.5 w-3.5" />
                Open Residents
              </Link>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
