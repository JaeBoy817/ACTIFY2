import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CarePlanDisplayStatus } from "@/lib/care-plans/status";

function toneClass(status: CarePlanDisplayStatus) {
  switch (status) {
    case "NO_PLAN":
      return "border-rose-300/70 bg-rose-100/80 text-rose-700";
    case "OVERDUE":
      return "border-rose-300/70 bg-rose-100/80 text-rose-700";
    case "DUE_SOON":
      return "border-amber-300/70 bg-amber-100/80 text-amber-700";
    case "ARCHIVED":
      return "border-slate-300/70 bg-slate-100/80 text-slate-700";
    default:
      return "border-emerald-300/70 bg-emerald-100/80 text-emerald-700";
  }
}

function label(status: CarePlanDisplayStatus) {
  switch (status) {
    case "NO_PLAN":
      return "No Plan";
    case "DUE_SOON":
      return "Due Soon";
    case "OVERDUE":
      return "Overdue";
    case "ARCHIVED":
      return "Archived";
    default:
      return "Active";
  }
}

export function StatusBadge({ status, className }: { status: CarePlanDisplayStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("glass-chip border", toneClass(status), className)}>
      {label(status)}
    </Badge>
  );
}
