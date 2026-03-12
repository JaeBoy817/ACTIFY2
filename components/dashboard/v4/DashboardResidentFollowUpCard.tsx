import { AlertTriangle, Clock3, UsersRound } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";
import { cn } from "@/lib/utils";

export function DashboardResidentFollowUpCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  const board = summary.residentFollowUpBoard;
  const rows = board.items.slice(0, board.defaultVisibleCount);

  return (
    <GlowCard
      title="Resident Follow-Up Board"
      subtitle={`${board.totalSurfaced} surfaced`}
      accent="emerald"
      icon={<UsersRound className="h-4 w-4" />}
      action={
        <PremiumPillButton
          label={`View All (${board.totalSurfaced})`}
          href={board.viewAllHref}
          tone="emerald"
        />
      }
    >
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#36486f] bg-[#10192d] px-4 py-6 text-sm text-[#8ea3cd]">
          <p className="font-semibold text-white">No urgent follow-ups right now.</p>
          <p className="mt-1 text-xs text-[#8ea3cd]">Residents needing attention will appear here automatically.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const priorityTone = priorityToneClass(row.priorityLevel);
          const actionTone = actionToneForModule(row.suggestedAction.module);
          return (
            <article
              key={row.id}
              className={cn(
                "rounded-2xl border bg-[#10192d] p-4 transition",
                "hover:border-[#4766a0]",
                priorityTone.border
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#385283] bg-[#14264a] text-xs font-bold text-[#dce8ff]">
                    {row.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{row.name}</p>
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", priorityTone.pill)}>
                        {row.priorityLevel}
                      </span>
                    </div>
                    <p className="text-xs text-[#8ea3ce]">
                      Room {row.room} · {row.unit} · {row.status}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#374f7e] bg-[#162b50] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d7e6ff]">
                  {row.priorityScore}
                </span>
              </div>

              <div className="rounded-xl border border-[#2a3d64] bg-[#0d182f] px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ab3dc]">Primary reason</p>
                <p className="mt-1 text-sm text-[#d8e6ff]">{row.primaryReason}</p>
              </div>

              {row.secondaryReasons.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.secondaryReasons.map((reason) => (
                    <span
                      key={`${row.id}-${reason}`}
                      className="inline-flex items-center rounded-full border border-[#35517f] bg-[#14274a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c9dbfb]"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              ) : null}

              {row.recencyContext.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {row.recencyContext.map((context) => (
                    <li key={`${row.id}-${context}`} className="flex items-center gap-1.5 text-[11px] text-[#91a8d2]">
                      <Clock3 className="h-3 w-3" aria-hidden />
                      {context}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <PremiumPillButton
                  label={row.suggestedAction.label}
                  href={row.suggestedAction.href}
                  tone={actionTone}
                />
                {row.secondaryAction ? (
                  <PremiumPillButton label={row.secondaryAction.label} href={row.secondaryAction.href} tone="neutral" />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-[#90a7d1]">
        <AlertTriangle className="h-3.5 w-3.5" />
        Intelligent ranking from 1:1 notes, attendance trend, note sentiment, care plan, and documentation signals.
      </div>
    </GlowCard>
  );
}

function actionToneForModule(
  module: DashboardCommandCenterSummary["residentFollowUpBoard"]["items"][number]["suggestedAction"]["module"]
): "neutral" | "blue" | "sky" | "violet" | "emerald" | "orange" | "rose" {
  if (module === "oneToOne") return "orange";
  if (module === "attendance") return "sky";
  if (module === "notes") return "violet";
  if (module === "carePlan") return "emerald";
  if (module === "residents") return "blue";
  return "neutral";
}

function priorityToneClass(level: DashboardCommandCenterSummary["residentFollowUpBoard"]["items"][number]["priorityLevel"]) {
  if (level === "critical") {
    return {
      border: "border-rose-400/45",
      pill: "border-rose-400/45 bg-rose-500/16 text-rose-100"
    };
  }
  if (level === "high") {
    return {
      border: "border-amber-300/45",
      pill: "border-amber-300/45 bg-amber-500/16 text-amber-100"
    };
  }
  if (level === "medium") {
    return {
      border: "border-blue-400/45",
      pill: "border-blue-400/45 bg-blue-500/16 text-blue-100"
    };
  }
  return {
    border: "border-[#2c395b]",
    pill: "border-[#35517f] bg-[#14274a] text-[#c9dbfb]"
  };
}
