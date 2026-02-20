"use client";

import { addDays, endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek } from "date-fns";

import { Badge } from "@/components/ui/badge";
import type { VolunteerShift } from "@/lib/volunteers/types";

export function ScheduleCalendarView({
  shifts,
  anchorDate,
  onSelectShift
}: {
  shifts: VolunteerShift[];
  anchorDate: Date;
  onSelectShift: (shiftId: string) => void;
}) {
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/65">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="rounded-lg border border-white/45 bg-white/70 px-2 py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayShifts = shifts.filter((shift) => isSameDay(new Date(shift.startAt), day));
          const outsideMonth = day.getMonth() !== monthStart.getMonth();
          return (
            <div
              key={day.toISOString()}
              className="min-h-[106px] rounded-xl border border-white/45 bg-white/72 p-2 text-xs shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={outsideMonth ? "text-foreground/50" : "text-foreground"}>{format(day, "d")}</span>
                <Badge variant="outline" className="bg-white/80 text-[10px]">
                  {dayShifts.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {dayShifts.slice(0, 2).map((shift) => (
                  <button
                    key={shift.id}
                    type="button"
                    className="w-full truncate rounded-md border border-teal-200 bg-teal-100/80 px-1.5 py-1 text-left text-[10px] text-teal-900"
                    onClick={() => onSelectShift(shift.id)}
                    title={`${shift.volunteerName} · ${format(new Date(shift.startAt), "p")} · ${shift.assignedLocation}`}
                  >
                    {shift.volunteerName}
                  </button>
                ))}
                {dayShifts.length > 2 ? <p className="text-[10px] text-foreground/60">+{dayShifts.length - 2} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
