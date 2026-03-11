import { BedDouble, DoorOpen, UsersRound } from "lucide-react";

import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";
import { AttendanceStatusPill } from "@/components/attendance/v3/AttendanceStatusPill";
import { cn } from "@/lib/utils";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";
import type { AttendanceQuickResident } from "@/lib/attendance-tracker/types";

const QUICK_BUTTONS: Array<{
  value: QuickAttendanceStatus;
  label: string;
  tone: "emerald" | "rose" | "violet" | "sky" | "blue" | "neutral";
}> = [
  { value: "PRESENT", label: "Present", tone: "emerald" },
  { value: "REFUSED", label: "Refused", tone: "rose" },
  { value: "ASLEEP", label: "Asleep", tone: "violet" },
  { value: "OUT_OF_ROOM", label: "Out", tone: "sky" },
  { value: "ONE_TO_ONE", label: "1:1", tone: "blue" },
  { value: "CLEAR", label: "Clear", tone: "neutral" }
];

function residentStatusChip(status: string) {
  const text = status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  return text;
}

export function AttendanceResidentRow({
  resident,
  status,
  selected,
  disabled,
  onFocus,
  onStatusChange
}: {
  resident: AttendanceQuickResident;
  status: QuickAttendanceStatus;
  selected?: boolean;
  disabled?: boolean;
  onFocus: () => void;
  onStatusChange: (next: QuickAttendanceStatus) => void;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-[#22385e] bg-[linear-gradient(180deg,#0c1830_0%,#0a1529_100%)] p-3 transition",
        "shadow-[0_14px_28px_-24px_rgba(56,189,248,0.7)]",
        selected && "border-blue-300/45 ring-1 ring-blue-300/30"
      )}
      onClick={onFocus}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {resident.lastName}, {resident.firstName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9eb4d8]">
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" />
              Room {resident.room}
            </span>
            {resident.unitName ? (
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="h-3.5 w-3.5" />
                {resident.unitName}
              </span>
            ) : null}
            <span className="rounded-full border border-[#314f7a] bg-[#10213d] px-2 py-0.5 text-[10px]">
              {residentStatusChip(resident.residentStatus)}
            </span>
          </div>
        </div>
        <AttendanceStatusPill status={status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_BUTTONS.map((button) => (
          <AttendanceQuickActionButton
            key={button.value}
            label={button.label}
            tone={button.tone}
            disabled={disabled}
            onClick={() => onStatusChange(button.value)}
            className={cn(
              "h-7 px-2.5 text-[10px]",
              button.value === status ? "ring-1 ring-white/35" : ""
            )}
          />
        ))}
        <AttendanceQuickActionButton
          label="Note"
          icon={UsersRound}
          tone="neutral"
          disabled={disabled}
          className="h-7 px-2.5 text-[10px]"
        />
      </div>
    </article>
  );
}
