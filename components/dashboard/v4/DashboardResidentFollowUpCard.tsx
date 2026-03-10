import { UsersRound } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { MODULE_TONE } from "@/components/dashboard/v4/theme";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";

export function DashboardResidentFollowUpCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  const rows = summary.residentAttention
    .flatMap((group) =>
      group.items.slice(0, 3).map((item) => ({
        ...item,
        categoryTitle: group.title,
        categoryModule: group.module,
        viewAllHref: group.viewAllHref
      }))
    )
    .slice(0, 12);

  return (
    <GlowCard
      title="Resident Follow-Up Board"
      subtitle="Needs attention"
      accent="emerald"
      action={<PremiumPillButton label="Open Residents" href="/app/residents" tone="emerald" />}
    >
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#36486f] bg-[#10192d] px-4 py-6 text-sm text-[#8ea3cd]">
          No residents currently surfaced for follow-up.
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const tone = MODULE_TONE[row.categoryModule];
          return (
            <article key={row.id} className="rounded-2xl border border-[#2c395b] bg-[#10192d] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{row.name}</p>
                  <p className="text-xs text-[#8ea3ce]">Room {row.room} · {row.status}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone.pill} ${tone.text}`}>
                  {row.categoryTitle}
                </span>
              </div>
              <p className="text-xs text-[#92a9d3]">{row.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PremiumPillButton label={row.primaryAction.label} href={row.primaryAction.href} tone="blue" />
                {row.secondaryAction ? (
                  <PremiumPillButton label={row.secondaryAction.label} href={row.secondaryAction.href} tone="neutral" />
                ) : null}
                <PremiumPillButton label="View category" href={row.viewAllHref} tone="neutral" />
              </div>
            </article>
          );
        })}
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-[#90a7d1]">
        <UsersRound className="h-3.5 w-3.5" />
        Aggregated from Notes, 1:1, Attendance, Care Plan, and Residents modules.
      </div>
    </GlowCard>
  );
}
