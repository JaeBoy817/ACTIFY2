import { cn } from "@/lib/utils";

export function ParticipationTrendMiniChart({
  value,
  trend
}: {
  value: number | null;
  trend: "up" | "flat" | "down";
}) {
  const safeValue = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const toneClass =
    trend === "up"
      ? "bg-emerald-500"
      : trend === "down"
        ? "bg-rose-500"
        : "bg-slate-500";

  return (
    <div className="space-y-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full transition-all duration-200", toneClass)}
          style={{ width: `${safeValue}%` }}
          aria-hidden
        />
      </div>
      <p className="text-xs text-slate-600">
        {value === null ? "Not enough data yet" : `${safeValue}% participation`} ·{" "}
        {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable"}
      </p>
    </div>
  );
}
