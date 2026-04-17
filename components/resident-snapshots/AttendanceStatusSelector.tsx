import {
  ATTENDANCE_STATUS_OPTIONS,
  attendanceStatusLabel,
  type AttendanceWorkflowStatus
} from "@/components/resident-snapshots/attendanceTypes";
import { cn } from "@/lib/utils";

const STATUS_SHORTCUTS: AttendanceWorkflowStatus[] = [
  "attended",
  "one_to_one_completed",
  "refused",
  "declined",
  "missed",
  "in_room_asleep",
  "out_of_facility",
  "not_appropriate"
];

export function AttendanceStatusSelector({
  value,
  onChange,
  compact
}: {
  value: AttendanceWorkflowStatus | null;
  onChange: (status: AttendanceWorkflowStatus) => void;
  compact?: boolean;
}) {
  const options = STATUS_SHORTCUTS.map((key) => ATTENDANCE_STATUS_OPTIONS.find((option) => option.key === key)).filter(
    (option): option is (typeof ATTENDANCE_STATUS_OPTIONS)[number] => Boolean(option)
  );

  if (compact) {
    return (
      <select
        value={value ?? ""}
        onChange={(event) => {
          if (!event.target.value) return;
          onChange(event.target.value as AttendanceWorkflowStatus);
        }}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        aria-label="Attendance status"
      >
        <option value="">Set status</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Attendance status">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {attendanceStatusLabel(option.key)}
          </button>
        );
      })}
    </div>
  );
}
