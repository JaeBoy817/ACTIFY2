"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, GaugeCircle, HeartHandshake, Stethoscope, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnalyticsTab = "today" | "month";

type AnalyticsCardClientProps = {
  analytics: {
    today: {
      rangeLabel: string;
      averageDailyPercent: number;
      participationPercent: number;
      residentsParticipated: number;
      totalAttendedResidents: number;
      oneOnOneNotes: number;
      carePlanReviews: number;
    };
    month: {
      rangeLabel: string;
      averageDailyPercent: number;
      participationPercent: number;
      residentsParticipated: number;
      totalAttendedResidents: number;
      oneOnOneNotes: number;
      carePlanReviews: number;
      volunteerHours: number;
    };
  };
};

export function AnalyticsCardClient({
  analytics
}: AnalyticsCardClientProps) {
  const [tab, setTab] = useState<AnalyticsTab>("today");

  const current = useMemo(() => (tab === "today" ? analytics.today : analytics.month), [analytics.month, analytics.today, tab]);

  return (
    <div className="rounded-3xl border border-white/45 bg-gradient-to-br from-white/86 via-indigo-100/42 to-cyan-100/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">Analytics</p>
          <p className="text-sm text-foreground/70">Synced to the same snapshot source used by the Analytics page.</p>
        </div>
        <Link
          href="/app/analytics"
          className="inline-flex items-center gap-1 rounded-xl border border-white/45 bg-white/85 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-white"
        >
          <BarChart3 className="h-4 w-4 text-indigo-700" />
          View Analytics
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mb-4 inline-flex rounded-xl border border-white/45 bg-white/75 p-1">
        <Button
          type="button"
          size="sm"
          variant={tab === "today" ? "default" : "ghost"}
          className={cn("rounded-lg px-3", tab === "today" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "text-foreground/75")}
          onClick={() => setTab("today")}
        >
          Today
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "month" ? "default" : "ghost"}
          className={cn("rounded-lg px-3", tab === "month" ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "text-foreground/75")}
          onClick={() => setTab("month")}
        >
          This Month
        </Button>
      </div>

      <div className="mb-3 rounded-xl border border-indigo-200/60 bg-gradient-to-r from-indigo-500/16 via-violet-500/10 to-cyan-500/16 px-3 py-2 text-xs text-foreground/70">
        Range: {current.rangeLabel}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-200/85 bg-gradient-to-br from-cyan-100/85 via-sky-100/75 to-blue-100/55 p-3.5">
          <p className="text-xs uppercase tracking-wide text-sky-800/80">Average Daily</p>
          <p className="mt-1 text-3xl font-semibold text-sky-900">{current.averageDailyPercent.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-sky-900/75">Directly from analytics attendance snapshot.</p>
        </div>
        <div className="rounded-2xl border border-indigo-200/85 bg-gradient-to-br from-indigo-100/85 via-violet-100/70 to-fuchsia-100/50 p-3.5">
          <p className="text-xs uppercase tracking-wide text-indigo-800/80">Participation %</p>
          <p className="mt-1 text-3xl font-semibold text-indigo-900">{current.participationPercent.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-indigo-900/75">Current filtered participation rate.</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/45 bg-white/80 px-3 py-2">
          <UsersRound className="h-4 w-4 text-emerald-700" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-foreground/60">Residents Participated</p>
            <p className="text-sm font-semibold text-foreground">{current.residentsParticipated}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/45 bg-white/80 px-3 py-2">
          <GaugeCircle className="h-4 w-4 text-fuchsia-700" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-foreground/60">Total Attended Residents</p>
            <p className="text-sm font-semibold text-foreground">{current.totalAttendedResidents}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/45 bg-white/80 px-3 py-2">
          <HeartHandshake className="h-4 w-4 text-rose-700" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-foreground/60">1:1 Notes</p>
            <p className="text-sm font-semibold text-foreground">{current.oneOnOneNotes}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/45 bg-white/80 px-3 py-2">
          <Stethoscope className="h-4 w-4 text-amber-700" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-foreground/60">Care Plan Reviews</p>
            <p className="text-sm font-semibold text-foreground">{current.carePlanReviews}</p>
          </div>
        </div>
      </div>

      {tab === "month" ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/45 bg-white/80 px-3 py-2">
          <CalendarDays className="h-4 w-4 text-blue-700" />
          <p className="text-xs text-foreground/70">
            Volunteer hours in this range: <span className="font-semibold text-foreground">{analytics.month.volunteerHours.toFixed(1)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
