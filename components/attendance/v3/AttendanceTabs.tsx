import { ActivitySquare, Clock3, ListChecks, UsersRound } from "lucide-react";
import type { ComponentType } from "react";

import { AttendanceSegmentControl } from "@/components/attendance/v3/AttendanceSegmentControl";
import type { AttendanceMode } from "@/components/attendance/v3/types";

const TAB_OPTIONS: Array<{ value: AttendanceMode; label: string }> = [
  { value: "today", label: "Today" },
  { value: "activity", label: "By Activity" },
  { value: "resident", label: "By Resident" },
  { value: "history", label: "History" }
];

const TAB_ICONS: Record<AttendanceMode, ComponentType<{ className?: string }>> = {
  today: Clock3,
  activity: ActivitySquare,
  resident: UsersRound,
  history: ListChecks
};

export function AttendanceTabs({
  mode,
  onChange
}: {
  mode: AttendanceMode;
  onChange: (next: AttendanceMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <AttendanceSegmentControl value={mode} onChange={onChange} options={TAB_OPTIONS} />
      <div className="inline-flex items-center gap-2 rounded-full border border-[#2a3c61] bg-[#0e192e] px-3 py-1.5 text-xs text-[#9db2d6]">
        {TAB_OPTIONS.map((tab) => {
          const Icon = TAB_ICONS[tab.value];
          const active = tab.value === mode;
          return (
            <span
              key={tab.value}
              className={active ? "inline-flex items-center gap-1 font-semibold text-[#dfeaff]" : "inline-flex items-center gap-1"}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
