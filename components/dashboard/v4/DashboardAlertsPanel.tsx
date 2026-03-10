import Link from "next/link";
import { AlertTriangle, CalendarDays, FileClock, Handshake, Landmark } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { formatPercent } from "@/components/dashboard/v4/theme";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

function parseCount(detail: string) {
  const match = detail.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function DashboardAlertsPanel({ summary }: { summary: DashboardCommandCenterSummary }) {
  const carePlanAlert = summary.base.alerts.items.find((item) => item.id === "careplan-overdue");
  const missingPrefs = summary.residentAttention.find((group) => group.key === "new-admission")?.items.length ?? 0;
  const lowStockAlert = summary.base.alerts.items.find((item) => item.id === "inventory-low");
  const lowStockCount = lowStockAlert ? parseCount(lowStockAlert.detail) : summary.inventoryPulse.lowStockCount;

  return (
    <div className="space-y-4">
      <GlowCard
        title="Needs Attention"
        subtitle="Priority Queue"
        accent="amber"
        icon={<AlertTriangle className="h-4 w-4" />}
        action={<PremiumPillButton label="Open Alerts" href="/app/notifications" tone="orange" />}
      >
        <div className="space-y-2">
          {summary.base.alerts.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#394b72] bg-[#10192d] px-3 py-3 text-sm text-[#8fa4cd]">
              No critical alerts right now.
            </p>
          ) : null}
          {summary.base.alerts.items.slice(0, 6).map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              className="block rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-3 transition hover:border-[#435789]"
            >
              <p className="text-sm font-bold text-white">{alert.title}</p>
              <p className="mt-1 text-xs text-[#8ea3ce]">{alert.detail}</p>
            </Link>
          ))}
        </div>
      </GlowCard>

      <GlowCard title="Care Plan + Compliance" subtitle="Status" accent="emerald" icon={<FileClock className="h-4 w-4" />}>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="text-[#9ab0d9]">Overdue care plan reviews</span>
            <span className="font-bold text-white">{carePlanAlert ? parseCount(carePlanAlert.detail) : 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="text-[#9ab0d9]">Missing activity preferences</span>
            <span className="font-bold text-white">{missingPrefs}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="text-[#9ab0d9]">Plan completion coverage</span>
            <span className="font-bold text-white">{formatPercent(summary.momentum.carePlanCompletionRate)}</span>
          </div>
        </div>
        <PremiumPillButton label="Go to Care Plans" href="/app/care-plans" tone="emerald" />
      </GlowCard>

      <GlowCard title="Upcoming + Planning" subtitle="Forward view" accent="blue" icon={<CalendarDays className="h-4 w-4" />}>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-[#9ab0d9]"><CalendarDays className="h-4 w-4 text-blue-300" />Tomorrow activities</span>
            <span className="font-bold text-white">{summary.upcoming.tomorrowActivityCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-[#9ab0d9]"><Handshake className="h-4 w-4 text-fuchsia-300" />Volunteer shifts (7d)</span>
            <span className="font-bold text-white">{summary.upcoming.volunteerCoverageSoon.shifts}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-[#9ab0d9]"><Landmark className="h-4 w-4 text-amber-300" />Low stock categories</span>
            <span className="font-bold text-white">{lowStockCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-[#9ab0d9]"><FileClock className="h-4 w-4 text-zinc-300" />Report due</span>
            <span className="font-bold text-white">{summary.upcoming.reportDueIndicator.dueDate}</span>
          </div>
          {summary.upcoming.nextOuting ? (
            <div className="rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ea4cf]">Next outing</p>
              <p className="text-sm font-semibold text-white">{summary.upcoming.nextOuting.title}</p>
              <p className="text-xs text-[#8ea3ce]">{summary.upcoming.nextOuting.when} · {summary.upcoming.nextOuting.location}</p>
            </div>
          ) : null}
          {summary.upcoming.nextResidentCouncilMeeting ? (
            <div className="rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ea4cf]">Resident council meeting</p>
              <p className="text-sm font-semibold text-white">{summary.upcoming.nextResidentCouncilMeeting.when}</p>
              <p className="text-xs text-[#8ea3ce]">Last attendance: {summary.upcoming.nextResidentCouncilMeeting.attendanceCount}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <PremiumPillButton label="Open Reports" href={summary.upcoming.reportDueIndicator.href} tone="neutral" />
          <PremiumPillButton label="Open Volunteers" href="/app/volunteers" tone="neutral" />
          <PremiumPillButton label="Open Council" href="/app/resident-council" tone="neutral" />
        </div>
      </GlowCard>

      <GlowCard title={summary.morale.title} subtitle="Morale / Idea" accent="rose" icon={<Handshake className="h-4 w-4" />}>
        <p className="text-sm leading-relaxed text-[#dce8ff]">{summary.morale.message}</p>
        <div className="rounded-xl border border-orange-300/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-100">
          {summary.morale.prompt}
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-[#8ea3cd]">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-300" />
          Rotates daily for team momentum.
        </div>
      </GlowCard>
    </div>
  );
}
