import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { GlowProgressBar } from "@/components/dashboard/v4/GlowProgressBar";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import { formatPercent } from "@/components/dashboard/v4/theme";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardDocumentationCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  const todayPrograms = Math.max(1, summary.base.dailyMetrics.programsToday);
  const todayCompletion = Math.round((summary.base.dailyMetrics.attendanceSessionsCompleted / todayPrograms) * 100);

  return (
    <GlowCard
      title="Documentation Progress"
      subtitle="Notes + 1:1"
      accent="rose"
      action={<PremiumPillButton label="Open Notes" href="/app/notes" tone="violet" />}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a7d2]">Notes completed today</p>
          <p className="mt-1 text-3xl font-black text-white">{summary.notesHub.notesCreatedToday}</p>
          <p className="mt-1 text-xs text-[#8ea3cc]">Includes group and resident entries.</p>
        </div>
        <div className="rounded-2xl border border-[#2c395b] bg-[#111a2e] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a7d2]">1:1 notes completed</p>
          <p className="mt-1 text-3xl font-black text-white">{summary.notesHub.oneToOneCreatedToday}</p>
          <p className="mt-1 text-xs text-[#8ea3cc]">Logged today for resident follow-up.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2c395b] bg-[#10192d] p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a7d2]">Today documentation completion</p>
          <p className="text-sm font-bold text-white">{formatPercent(todayCompletion)}</p>
        </div>
        <GlowProgressBar value={todayCompletion} tone="violet" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            Overdue 1:1 notes: {summary.notesHub.overdueOneToOneCount}
          </div>
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Missing group documentation: {summary.notesHub.groupDocumentationMissingCount}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91a7d2]">Recent note activity</p>
        {summary.notesHub.recentActivity.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#36486f] bg-[#10192d] px-3 py-2 text-xs text-[#8fa4cd]">No recent note activity.</p>
        ) : null}
        {summary.notesHub.recentActivity.slice(0, 5).map((note) => (
          <Link
            key={note.id}
            href={note.href}
            className="flex items-center justify-between rounded-xl border border-[#2c395b] bg-[#10192d] px-3 py-2 text-sm text-[#dce8ff] transition hover:border-[#44598b]"
          >
            <span>{note.residentName} · Room {note.room}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#8ea4cf]">{note.type === "ONE_TO_ONE" ? "1:1" : "Group"}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <PremiumPillButton label="New Note" href="/app/notes/new?type=general" tone="violet" />
        <PremiumPillButton label="New 1:1 Note" href="/app/notes/new?type=1on1" tone="orange" />
        <PremiumPillButton label="Continue Draft" href="/app/notes" tone="neutral" />
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-[#8ca3ce]">
        <FileCheck2 className="h-3.5 w-3.5" />
        Documentation and follow-up readiness for today.
      </div>
    </GlowCard>
  );
}
