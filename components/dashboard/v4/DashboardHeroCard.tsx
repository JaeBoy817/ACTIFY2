import Link from "next/link";
import { ArrowRight, ClipboardCheck, Flame, Stethoscope, Target, Users } from "lucide-react";

import { DashboardKPIBlock } from "@/components/dashboard/v4/DashboardKPIBlock";
import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { GlowProgressBar } from "@/components/dashboard/v4/GlowProgressBar";
import { formatPercent, moduleToneFor } from "@/components/dashboard/v4/theme";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

function resolveGreeting(isoDate: string) {
  const hour = new Date(isoDate).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeroCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  const greeting = resolveGreeting(summary.generatedAt);
  const totalActivities = Math.max(summary.timeline.length, summary.hero.scheduledTodayCount);
  const attendanceCompleteCount = summary.timeline.filter((item) => item.attendanceCompleted).length;
  const documentationCompleteCount = summary.timeline.filter((item) => item.documentationCompleted).length;
  const activitiesProgress =
    totalActivities === 0 ? 0 : Math.round(((attendanceCompleteCount + documentationCompleteCount) / (totalActivities * 2)) * 100);

  return (
    <GlowCard title="Daily Overview" subtitle="Hero" accent="blue" icon={<Flame className="h-4 w-4" />}>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8ea5d0]">{summary.hero.dayOfWeek} · {summary.hero.fullDate}</p>
          <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">{greeting}</h2>
          <p className="text-base text-[#d8e6ff]">{summary.hero.facilityName}</p>
          <p className="max-w-2xl text-sm leading-relaxed text-[#9db2d8]">{summary.hero.smartSummary}</p>

          <div className="rounded-2xl border border-[#33446b] bg-[#121c31] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a9d6]">Participation goal status</p>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-white">
                <Target className="h-4 w-4 text-blue-300" />
                {formatPercent(summary.momentum.monthlyParticipationGoalProgress)}
              </span>
            </div>
            <GlowProgressBar value={summary.momentum.monthlyParticipationGoalProgress} tone="blue" />
            <p className="mt-2 text-xs text-[#8ca2ca]">Monthly participation target benchmark: 70%</p>
          </div>

          <div className="rounded-2xl border border-[#33446b] bg-[#121c31] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a9d6]">Activities progress bar</p>
              <span className="text-sm font-bold text-white">{activitiesProgress}%</span>
            </div>
            <GlowProgressBar value={activitiesProgress} tone="sky" />
            <p className="mt-2 text-xs text-[#8ca2ca]">
              {attendanceCompleteCount} attendance complete · {documentationCompleteCount} documentation complete out of {totalActivities} activities.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <DashboardKPIBlock label="Census" value={summary.hero.censusCount} helper="Active residents" icon={Users} />
          <DashboardKPIBlock label="Activities Today" value={summary.hero.scheduledTodayCount} helper="Scheduled in calendar" tone="sky" icon={ClipboardCheck} />
          <DashboardKPIBlock label="Needs 1:1" value={summary.hero.oneToOneNeededThisMonthCount} helper="Still missing this month" tone="orange" icon={Stethoscope} />
          <DashboardKPIBlock label="Overdue" value={summary.hero.overdueItemsCount} helper="Docs or care plan items" tone="rose" icon={Target} />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">Daily Mission Strip</p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {summary.missions.slice(0, 6).map((mission) => {
            const tone = moduleToneFor(mission.module);
            return (
              <article
                key={mission.id}
                className="rounded-2xl border border-[#2f3d63] bg-[#11192e] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9db2d8]">
                    <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                    {mission.priority}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#88a1cc]">{mission.module}</span>
                </div>
                <h3 className="text-sm font-bold text-white">{mission.title}</h3>
                <p className="mt-1 text-xs text-[#8ea4cf]">{mission.detail}</p>
                <PremiumPillButton
                  label={mission.ctaLabel}
                  href={mission.href}
                  tone="neutral"
                  className="mt-3"
                  size="sm"
                />
              </article>
            );
          })}
        </div>
        <div className="pt-1">
          <Link href="/app/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-200 hover:text-blue-100">
            Open analytics cockpit
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </GlowCard>
  );
}
