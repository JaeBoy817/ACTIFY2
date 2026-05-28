"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

const GROUP_COLOR = "#38bdf8";
const ONE_TO_ONE_COLOR = "#14b8a6";
const TOOLTIP_CONTENT_STYLE = {
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
  fontSize: 12
} as const;

type ResidentParticipationPieChartProps = {
  residentName: string;
  groupActivityCount: number | null | undefined;
  oneOnOneActivityCount: number | null | undefined;
  monthLabel: string;
  compact?: boolean;
  className?: string;
};

function toSafeCount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? Number.NaN)) return 0;
  return Math.max(0, Math.trunc(value ?? 0));
}

function formatTooltipValue(value: unknown) {
  const displayValue = Array.isArray(value) ? value.join(" - ") : String(value);
  const count = Number(Array.isArray(value) ? value[0] : value);
  return `${displayValue} ${count === 1 ? "activity" : "activities"}`;
}

export function ResidentParticipationPieChart({
  residentName,
  groupActivityCount,
  oneOnOneActivityCount,
  monthLabel,
  compact = false,
  className
}: ResidentParticipationPieChartProps) {
  const groupCount = toSafeCount(groupActivityCount);
  const oneOnOneCount = toSafeCount(oneOnOneActivityCount);
  const total = groupCount + oneOnOneCount;
  const hasData = total > 0;

  const chartData = [
    { name: "Group Activities", value: groupCount, color: GROUP_COLOR },
    { name: "1:1 Activities", value: oneOnOneCount, color: ONE_TO_ONE_COLOR }
  ].filter((item) => item.value > 0);

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_100%)] p-3",
        compact ? "w-full lg:w-[280px]" : "mt-3",
        className
      )}
      aria-label={`Participation chart for ${residentName} showing group activities and 1:1 activities for ${monthLabel}.`}
    >
      <div className={cn("flex gap-3", compact ? "items-center justify-between" : "items-center")}>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{monthLabel}</p>
          <p className="text-sm font-semibold text-slate-900">Participation Breakdown</p>

          {!hasData ? (
            <p className="mt-2 text-xs font-medium text-slate-500">No participation recorded yet.</p>
          ) : null}

          <div className="mt-2 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
                Group Activities
              </span>
              <span className="font-semibold text-slate-900">{groupCount}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-500" aria-hidden />
                1:1 Activities
              </span>
              <span className="font-semibold text-slate-900">{oneOnOneCount}</span>
            </div>
          </div>
        </div>

        {hasData ? (
          <div className={cn("shrink-0", compact ? "h-20 w-20" : "h-24 w-24")} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 18 : 23}
                  outerRadius={compact ? 34 : 42}
                  paddingAngle={chartData.length > 1 ? 3 : 0}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatTooltipValue(value), String(name)]}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </section>
  );
}
