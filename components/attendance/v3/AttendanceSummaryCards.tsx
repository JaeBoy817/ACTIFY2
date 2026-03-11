import { Activity, AlertTriangle, Gauge, UsersRound } from "lucide-react";

import { AttendanceMetricCard } from "@/components/attendance/v3/AttendanceMetricCard";
import type { AttendanceSummaryMetric } from "@/components/attendance/v3/types";

const ICONS = [Activity, UsersRound, AlertTriangle, Gauge] as const;

export function AttendanceSummaryCards({ metrics }: { metrics: AttendanceSummaryMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = ICONS[index % ICONS.length];
        return (
          <div key={metric.label} className="relative">
            <div className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#111f38] text-[#c4d8ff]">
              <Icon className="h-4 w-4" />
            </div>
            <AttendanceMetricCard
              label={metric.label}
              value={metric.value}
              helpText={metric.helpText}
              tone={metric.tone}
            />
          </div>
        );
      })}
    </div>
  );
}

