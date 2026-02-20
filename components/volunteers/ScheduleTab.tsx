"use client";

import dynamic from "next/dynamic";
import { format } from "date-fns";
import { CalendarDays, Clock3, MapPin, RefreshCw, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VolunteerShift, VolunteerSummary } from "@/lib/volunteers/types";
import { cn } from "@/lib/utils";

const LazyScheduleCalendarView = dynamic(
  () => import("@/components/volunteers/ScheduleCalendarView").then((mod) => mod.ScheduleCalendarView),
  {
    loading: () => (
      <div className="space-y-2">
        <div className="skeleton shimmer h-7 w-52 rounded" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, index) => (
            <div key={`calendar-skeleton-${index}`} className="skeleton shimmer h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
);

function shiftStatusClass(status: VolunteerShift["status"]) {
  if (status === "IN_PROGRESS") return "border-cyan-200 bg-cyan-100/90 text-cyan-800";
  if (status === "COMPLETE") return "border-emerald-200 bg-emerald-100/90 text-emerald-800";
  return "border-amber-200 bg-amber-100/90 text-amber-900";
}

export function ScheduleTab({
  shifts,
  volunteers,
  onOpenVolunteer,
  onReassign,
  onSignOut,
  onOpenSchedule
}: {
  shifts: VolunteerShift[];
  volunteers: VolunteerSummary[];
  onOpenVolunteer: (volunteerId: string) => void;
  onReassign: (visitId: string, volunteerId: string) => void;
  onSignOut: (visitId: string) => void;
  onOpenSchedule: () => void;
}) {
  const [rangeDays, setRangeDays] = useState<7 | 14>(7);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const now = Date.now();
  const visibleShifts = useMemo(() => {
    const end = now + rangeDays * 24 * 60 * 60 * 1000;
    return shifts
      .filter((shift) => {
        const startAt = new Date(shift.startAt).getTime();
        return startAt >= now && startAt <= end;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [now, rangeDays, shifts]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/45 bg-white/70 p-1">
          <Button type="button" size="sm" variant={rangeDays === 7 ? "default" : "ghost"} onClick={() => setRangeDays(7)}>
            Next 7 days
          </Button>
          <Button type="button" size="sm" variant={rangeDays === 14 ? "default" : "ghost"} onClick={() => setRangeDays(14)}>
            Next 14 days
          </Button>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/45 bg-white/70 p-1">
          <Button type="button" size="sm" variant={viewMode === "list" ? "default" : "ghost"} onClick={() => setViewMode("list")}>
            Upcoming List
          </Button>
          <Button type="button" size="sm" variant={viewMode === "calendar" ? "default" : "ghost"} onClick={() => setViewMode("calendar")}>
            Calendar
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <LazyScheduleCalendarView
          shifts={visibleShifts}
          anchorDate={new Date()}
          onSelectShift={(shiftId) => {
            setSelectedShiftId(shiftId);
            const target = visibleShifts.find((shift) => shift.id === shiftId);
            if (target) onOpenVolunteer(target.volunteerId);
          }}
        />
      ) : (
        <div className="space-y-2">
          {visibleShifts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/50 bg-white/72 p-6 text-center text-sm text-foreground/70">
              No upcoming shifts in this window.
              <div className="mt-3">
                <Button type="button" size="sm" onClick={onOpenSchedule}>
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                  Schedule Shift
                </Button>
              </div>
            </div>
          ) : (
            visibleShifts.map((shift) => (
              <article
                key={shift.id}
                className={cn(
                  "rounded-xl border border-white/55 bg-white/84 p-3",
                  selectedShiftId === shift.id && "ring-2 ring-cyan-300/70"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-teal-200 bg-gradient-to-br from-teal-200/70 to-cyan-100/65 text-teal-700">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <button type="button" className="truncate text-left hover:underline" onClick={() => onOpenVolunteer(shift.volunteerId)}>
                        {shift.volunteerName}
                      </button>
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground/70">
                      <Clock3 className="h-3.5 w-3.5" />
                      {format(new Date(shift.startAt), "EEE, MMM d · p")}
                      {shift.endAt ? ` - ${format(new Date(shift.endAt), "p")}` : ""}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-foreground/70">
                      <MapPin className="h-3.5 w-3.5" />
                      {shift.assignedLocation}
                    </p>
                  </div>
                  <Badge className={cn("border text-[11px]", shiftStatusClass(shift.status))}>
                    {shift.status === "IN_PROGRESS" ? "In Progress" : shift.status === "COMPLETE" ? "Complete" : "Scheduled"}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-md border border-white/50 bg-white/80 px-2 py-1">
                    <span className="text-[11px] text-foreground/65">Reassign</span>
                    <select
                      className="bg-transparent text-xs focus:outline-none"
                      defaultValue={shift.volunteerId}
                      onChange={(event) => onReassign(shift.id, event.target.value)}
                    >
                      {volunteers.map((volunteer) => (
                        <option key={volunteer.id} value={volunteer.id}>
                          {volunteer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {shift.status !== "COMPLETE" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onSignOut(shift.id)}>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
