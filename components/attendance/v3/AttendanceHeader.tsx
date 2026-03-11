import { CalendarCheck2, FileSpreadsheet, LayoutList } from "lucide-react";

import { AttendanceQuickActionButton } from "@/components/attendance/v3/AttendanceQuickActionButton";
import { AttendanceSearchField } from "@/components/attendance/v3/AttendanceSearchField";

export function AttendanceHeader({
  searchValue,
  onSearchChange
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="rounded-[1.7rem] border border-[#1e3150] bg-[linear-gradient(160deg,#0a1325_0%,#0c172e_48%,#091225_100%)] p-4 shadow-[0_26px_54px_-36px_rgba(37,99,235,0.75)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#92a9d1]">Attendance Workspace</p>
          <h1 className="mt-1 text-3xl font-black leading-none text-white md:text-4xl">Attendance</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#a9c0e4]">
            Track resident participation and complete attendance sessions without leaving the page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AttendanceQuickActionButton href="/app/attendance/sessions" icon={LayoutList} label="Sessions" tone="blue" />
          <AttendanceQuickActionButton href="/app/attendance/reports" icon={FileSpreadsheet} label="Reports" tone="violet" />
          <AttendanceQuickActionButton href="/app/calendar" icon={CalendarCheck2} label="Calendar" tone="sky" />
        </div>
      </div>
      <div className="mt-4">
        <AttendanceSearchField
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search residents, activities, rooms, or units..."
          className="max-w-2xl"
        />
      </div>
    </header>
  );
}

