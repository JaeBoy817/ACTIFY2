import { AttendanceSessionsWorkspace } from "@/components/attendance/AttendanceSessionsWorkspace";
import type { AttendanceSessionFiltersState } from "@/components/attendance/AttendanceFilters";
import { getAttendanceSessionsHistory } from "@/lib/attendance-tracker/service";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { addZonedDays, startOfZonedDay, zonedDateKey } from "@/lib/timezone";

export default async function AttendanceSessionsPage({
  searchParams
}: {
  searchParams?: {
    from?: string;
    to?: string;
    activity?: string;
    location?: string;
    hasNotes?: "all" | "yes" | "no";
  };
}) {
  const context = await requireModulePage("attendanceTracking");
  const timeZone = context.facility.timezone;

  const todayStart = startOfZonedDay(new Date(), timeZone);
  const defaultTo = zonedDateKey(todayStart, timeZone);
  const defaultFrom = zonedDateKey(addZonedDays(todayStart, timeZone, -30), timeZone);

  const initialFilters: AttendanceSessionFiltersState = {
    from: searchParams?.from ?? defaultFrom,
    to: searchParams?.to ?? defaultTo,
    activity: searchParams?.activity ?? "",
    location: searchParams?.location ?? "all",
    hasNotes: searchParams?.hasNotes === "yes" || searchParams?.hasNotes === "no" ? searchParams.hasNotes : "all"
  };

  const history = await getAttendanceSessionsHistory({
    facilityId: context.facilityId,
    timeZone,
    from: initialFilters.from,
    to: initialFilters.to,
    activityQuery: initialFilters.activity,
    location: initialFilters.location,
    hasNotes: initialFilters.hasNotes === "yes" ? true : initialFilters.hasNotes === "no" ? false : undefined
  });

  return (
    <div className="space-y-4">
      <AttendanceSessionsWorkspace
        initialSessions={history.sessions}
        initialLocations={history.locations}
        initialFilters={initialFilters}
        canEdit={canWrite(context.role)}
      />
    </div>
  );
}
