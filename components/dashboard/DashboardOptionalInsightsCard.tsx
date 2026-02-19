"use client";

import Link from "next/link";
import { BarChart3, ChevronRight, CircleGauge, TrendingUp, UserCheck, UsersRound } from "lucide-react";

import { useDashboardPreferences } from "@/components/dashboard/DashboardSettingsPanel";
import { GlassCard } from "@/components/glass/GlassCard";

type ParticipationPreview = {
  averageDailyPercent: number;
  participationPercent: number;
  residentsParticipated: number;
  totalAttendedResidents: number;
  activeResidents: number;
};

export function DashboardOptionalInsightsCard({
  preview
}: {
  preview: ParticipationPreview;
}) {
  const { preferences } = useDashboardPreferences();

  if (!preferences.showAnalyticsPreviewCard) {
    return null;
  }

  return (
    <GlassCard variant="dense" className="rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Analytics Preview</p>
          <p className="text-sm text-foreground/70">Monthly and daily participation at a glance.</p>
        </div>

        <Link
          href="/app/analytics"
          className="inline-flex items-center gap-1 rounded-lg border border-white/45 bg-white/85 px-3 py-2 text-sm font-medium text-foreground"
        >
          <BarChart3 className="h-4 w-4" />
          View insights
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-sky-200/85 bg-gradient-to-br from-sky-50/90 to-sky-100/45 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-sky-800/85">Average Daily</p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-500/30 to-sky-300/10 text-sky-700">
              <CircleGauge className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-sky-900">{preview.averageDailyPercent.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-sky-900/70">Avg daily resident participation this month.</p>
          <div className="mt-2 h-2 rounded-full bg-white/70">
            <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.min(100, preview.averageDailyPercent)}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200/85 bg-gradient-to-br from-indigo-50/90 to-indigo-100/45 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-indigo-800/85">Participation %</p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-500/30 to-indigo-300/10 text-indigo-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-indigo-900">{preview.participationPercent.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-indigo-900/70">
            {preview.residentsParticipated} of {preview.activeResidents} residents this month.
          </p>
          <div className="mt-2 h-2 rounded-full bg-white/70">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, preview.participationPercent)}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/85 bg-gradient-to-br from-emerald-50/90 to-emerald-100/45 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-emerald-800/85">Residents Participated</p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500/30 to-emerald-300/10 text-emerald-700">
              <UserCheck className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-emerald-900">{preview.residentsParticipated}</p>
          <p className="mt-1 text-xs text-emerald-900/70">Unique residents with attendance this month.</p>
        </div>

        <div className="rounded-2xl border border-fuchsia-200/85 bg-gradient-to-br from-fuchsia-50/90 to-fuchsia-100/45 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-wide text-fuchsia-800/85">Total Attended Residents</p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-500/30 to-fuchsia-300/10 text-fuchsia-700">
              <UsersRound className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-fuchsia-900">{preview.totalAttendedResidents}</p>
          <p className="mt-1 text-xs text-fuchsia-900/70">Resident total for attended entries this month.</p>
        </div>
      </div>
    </GlassCard>
  );
}
