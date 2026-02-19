import {
  Activity,
  BarChart3,
  CalendarClock,
  Triangle,
  UserCheck2,
  Users,
  UserSquare2,
  Waves
} from "lucide-react";

import { IconBadge } from "@/components/analytics/IconBadge";
import type { AnalyticsKpi } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const iconMap = {
  users: Users,
  "user-check": UserCheck2,
  percent: BarChart3,
  pulse: Waves,
  calendar: CalendarClock,
  barriers: Triangle,
  notes: UserSquare2,
  "care-plan": Activity,
  programs: BarChart3,
  volunteer: Users
} as const;

export function KpiCardGlass({ kpi }: { kpi: AnalyticsKpi }) {
  const Icon = iconMap[kpi.icon] ?? BarChart3;
  return (
    <article className="glass-panel rounded-2xl border-white/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-foreground/65">{kpi.label}</p>
          <p className="text-2xl font-semibold text-foreground">{kpi.value}</p>
          <p className="text-xs text-foreground/70">{kpi.detail}</p>
        </div>
        <IconBadge icon={Icon} className={cn("bg-gradient-to-br", kpi.accent)} />
      </div>
      {kpi.delta ? (
        <p className="mt-3 text-xs font-medium">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1",
              kpi.trend === "up" && "border-emerald-300/70 bg-emerald-100/80 text-emerald-800",
              kpi.trend === "down" && "border-rose-300/70 bg-rose-100/80 text-rose-800",
              (!kpi.trend || kpi.trend === "flat") && "border-slate-300/70 bg-slate-100/80 text-slate-700"
            )}
          >
            {kpi.delta}
          </span>
        </p>
      ) : null}
    </article>
  );
}
