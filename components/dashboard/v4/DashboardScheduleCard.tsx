import { CalendarClock } from "lucide-react";

import { GlowCard } from "@/components/dashboard/v4/GlowCard";
import { PremiumPillButton } from "@/components/dashboard/v4/PremiumPillButton";
import type { DashboardCommandCenterSummary } from "@/lib/dashboard/getDashboardCommandCenterSummary";
import { cn } from "@/lib/utils";

export function DashboardScheduleCard({ summary }: { summary: DashboardCommandCenterSummary }) {
  return (
    <GlowCard
      title="Today’s Schedule"
      subtitle="Timeline"
      accent="sky"
      action={<PremiumPillButton label="Open Calendar" href="/app/calendar?view=day" tone="blue" />}
    >
      {summary.timeline.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3c4c74] bg-[#0f172a] px-4 py-8 text-sm text-[#90a6cf]">
          No activities scheduled today.
        </div>
      ) : null}

      <div className="space-y-3">
        {summary.timeline.map((activity) => (
          <article
            key={activity.id}
            className={cn(
              "rounded-2xl border bg-[#101a2f] p-4",
              activity.isNextUp ? "border-blue-400/60 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]" : "border-[#2c395b]"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{activity.title}</h3>
                  {activity.isNextUp ? (
                    <span className="rounded-full border border-blue-300/40 bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100">
                      Next Up
                    </span>
                  ) : null}
                  {activity.isInProgress ? (
                    <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                      In Progress
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#91a8d2]">{activity.timeLabel} · {activity.location}</p>
                {activity.templateSource ? (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7893c5]">
                    Template: {activity.templateSource}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    activity.attendanceCompleted
                      ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                      : "border-amber-300/40 bg-amber-500/20 text-amber-100"
                  )}
                >
                  {activity.attendanceCompleted ? "Attendance done" : "Attendance open"}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    activity.documentationCompleted
                      ? "border-violet-300/40 bg-violet-500/20 text-violet-100"
                      : "border-rose-300/40 bg-rose-500/20 text-rose-100"
                  )}
                >
                  {activity.documentationCompleted ? "Doc done" : "Doc missing"}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <PremiumPillButton label="Mark attendance" href={activity.attendanceHref} tone="sky" />
              <PremiumPillButton label="Open details" href={activity.openHref} tone="neutral" />
              <PremiumPillButton label="Edit activity" href={activity.editHref} tone="neutral" />
              <PremiumPillButton label="Create note" href={activity.noteHref} tone="violet" />
            </div>
          </article>
        ))}
      </div>

      <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#89a5d8]">
        <CalendarClock className="h-3.5 w-3.5" />
        {summary.timeline.filter((item) => item.attendanceCompleted).length} / {summary.timeline.length} attendance sessions completed
      </div>
    </GlowCard>
  );
}
