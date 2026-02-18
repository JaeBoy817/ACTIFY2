import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import type { CarePlanTrend } from "@/lib/care-plans/status";
import { cn } from "@/lib/utils";

export function TrendIndicator({ trend, className }: { trend: CarePlanTrend; className?: string }) {
  const icon =
    trend === "UP" ? (
      <ArrowUpRight className="h-4 w-4 text-emerald-600" />
    ) : trend === "DOWN" ? (
      <ArrowDownRight className="h-4 w-4 text-rose-600" />
    ) : (
      <ArrowRight className="h-4 w-4 text-slate-600" />
    );

  const label = trend === "UP" ? "Improving" : trend === "DOWN" ? "Declining" : "Stable";

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-foreground/80", className)}>
      {icon}
      {label}
    </span>
  );
}
