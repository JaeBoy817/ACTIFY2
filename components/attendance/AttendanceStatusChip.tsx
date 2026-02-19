"use client";

import { Check, Clock3, CircleSlash, PersonStanding, UserRoundX, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { cycleAttendanceStatus, quickStatusLabel, type QuickAttendanceStatus } from "@/lib/attendance-tracker/status";

function statusStyles(status: QuickAttendanceStatus) {
  switch (status) {
    case "PRESENT":
      return {
        icon: Check,
        className: "border-emerald-300 bg-emerald-100 text-emerald-800"
      };
    case "REFUSED":
      return {
        icon: UserRoundX,
        className: "border-rose-300 bg-rose-100 text-rose-700"
      };
    case "ASLEEP":
      return {
        icon: Clock3,
        className: "border-indigo-300 bg-indigo-100 text-indigo-700"
      };
    case "OUT_OF_ROOM":
      return {
        icon: PersonStanding,
        className: "border-amber-300 bg-amber-100 text-amber-700"
      };
    case "ONE_TO_ONE":
      return {
        icon: Check,
        className: "border-sky-300 bg-sky-100 text-sky-700"
      };
    case "NOT_APPLICABLE":
      return {
        icon: XCircle,
        className: "border-slate-300 bg-slate-100 text-slate-700"
      };
    default:
      return {
        icon: CircleSlash,
        className: "border-white/45 bg-white/70 text-foreground/70"
      };
  }
}

export function AttendanceStatusChip({
  status,
  onStatusChange,
  disabled
}: {
  status: QuickAttendanceStatus;
  onStatusChange: (next: QuickAttendanceStatus) => void;
  disabled?: boolean;
}) {
  const styles = statusStyles(status);
  const Icon = styles.icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onStatusChange(cycleAttendanceStatus(status))}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition",
        styles.className,
        "disabled:cursor-not-allowed disabled:opacity-55"
      )}
      aria-label={`Attendance status: ${quickStatusLabel(status)}. Tap to cycle.`}
    >
      <Icon className="h-3.5 w-3.5" />
      {quickStatusLabel(status)}
    </button>
  );
}

