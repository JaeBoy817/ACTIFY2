import { BarChart3 } from "lucide-react";

import { DashboardKPIBlock } from "@/components/dashboard/v4/DashboardKPIBlock";
import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { GlowProgressBar } from "@/components/dashboard/v4/GlowProgressBar";
import { formatPercent } from "@/components/dashboard/v4/theme";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardParticipationCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <GlowCard
      title="Participation + Attendance"
      subtitle="Momentum"
      accent="violet"
      icon={<BarChart3 className="h-4 w-4" />}
      action={<PremiumPillButton label="View Analytics" href="/app/analytics" tone="violet" />}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardKPIBlock
          label="Daily Participation"
          value={formatPercent(summary.momentum.dailyParticipationRate)}
          helper="Residents engaged today"
          progress={summary.momentum.dailyParticipationRate}
          tone="sky"
        />
        <DashboardKPIBlock
          label="Weekly Trend"
          value={`${summary.momentum.weeklyParticipationTrend >= 0 ? "+" : ""}${summary.momentum.weeklyParticipationTrend}%`}
          helper="Compared to previous week"
          progress={Math.min(100, Math.abs(summary.momentum.weeklyParticipationTrend))}
          tone="blue"
        />
        <DashboardKPIBlock
          label="Monthly Goal"
          value={formatPercent(summary.momentum.monthlyParticipationGoalProgress)}
          helper="Goal benchmark progress"
          progress={summary.momentum.monthlyParticipationGoalProgress}
          tone="violet"
        />
        <DashboardKPIBlock
          label="1:1 Completion"
          value={formatPercent(summary.momentum.monthlyOneOnOneCompletionRate)}
          helper="Residents with monthly 1:1"
          progress={summary.momentum.monthlyOneOnOneCompletionRate}
          tone="orange"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a7d2]">Residents attended today</p>
          <p className="mt-1 text-2xl font-black text-white">
            {summary.base.analytics.today.residentsParticipated} / {summary.base.analytics.today.totalAttendedResidents}
          </p>
          <GlowProgressBar
            className="mt-3"
            tone="emerald"
            value={summary.base.analytics.today.totalAttendedResidents === 0 ? 0 : (summary.base.analytics.today.residentsParticipated / summary.base.analytics.today.totalAttendedResidents) * 100}
          />
        </div>
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a7d2]">Low participation residents</p>
          <p className="mt-1 text-2xl font-black text-white">{summary.residentAttention.find((group) => group.key === "low-participation")?.items.length ?? 0}</p>
          <p className="mt-2 text-xs text-[#8fa3cd]">Review and schedule targeted follow-up sessions.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2c395b] bg-[#10192d] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa5d0]">Monthly trend strip</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {summary.momentum.miniSeries.map((value, index) => (
            <div key={`trend-${index}`} className="space-y-1">
              <div className="h-14 rounded-xl border border-[#2c395b] bg-[#0f182a] p-1">
                <div className="h-full rounded-lg bg-gradient-to-t from-blue-500/80 to-indigo-300/70" style={{ height: `${Math.max(8, value)}%` }} />
              </div>
              <p className="text-center text-[10px] text-[#7f96c1]">{Math.round(value)}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-[#8ca3cf]">
        <BarChart3 className="h-3.5 w-3.5" />
        Daily, weekly, and monthly trend signal from attendance + notes modules.
      </div>
    </GlowCard>
  );
}
