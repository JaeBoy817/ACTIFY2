import { Check, Clock3, CircleDot, CircleOff, UserRoundX, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { quickStatusLabel, type QuickAttendanceStatus } from "@/lib/attendance-tracker/status";

function toneForStatus(status: QuickAttendanceStatus) {
  switch (status) {
    case "PRESENT":
      return {
        icon: Check,
        className: "border-emerald-400/45 bg-emerald-500/18 text-emerald-100"
      };
    case "REFUSED":
      return {
        icon: UserRoundX,
        className: "border-rose-400/45 bg-rose-500/18 text-rose-100"
      };
    case "ASLEEP":
      return {
        icon: Clock3,
        className: "border-violet-400/45 bg-violet-500/18 text-violet-100"
      };
    case "OUT_OF_ROOM":
      return {
        icon: Users,
        className: "border-sky-400/45 bg-sky-500/20 text-sky-100"
      };
    case "ONE_TO_ONE":
      return {
        icon: Check,
        className: "border-blue-400/45 bg-blue-500/18 text-blue-100"
      };
    case "NOT_APPLICABLE":
      return {
        icon: CircleOff,
        className: "border-amber-400/45 bg-amber-500/18 text-amber-100"
      };
    default:
      return {
        icon: CircleDot,
        className: "border-zinc-400/45 bg-zinc-500/14 text-zinc-200"
      };
  }
}

export function AttendanceStatusPill({
  status,
  className
}: {
  status: QuickAttendanceStatus;
  className?: string;
}) {
  const tone = toneForStatus(status);
  const Icon = tone.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold", tone.className, className)}>
      <Icon className="h-3 w-3" />
      {quickStatusLabel(status)}
    </span>
  );
}

