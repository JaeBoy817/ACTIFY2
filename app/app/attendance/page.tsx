import { AttendancePageShell } from "@/components/attendance/v3/AttendancePageShell";
import { getAttendanceQuickTakePayload, getAttendanceSessionsHistory } from "@/lib/attendance-tracker/service";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { addZonedDays, startOfZonedDay, zonedDateKey } from "@/lib/timezone";

export default async function AttendanceQuickTakePage({
  searchParams
}: {
  searchParams?: {
    date?: string;
    sessionId?: string;
    from?: string;
    to?: string;
  };
}) {
  const context = await requireModulePage("attendanceTracking");
  const todayStart = startOfZonedDay(new Date(), context.timeZone);
  const defaultTo = zonedDateKey(todayStart, context.timeZone);
  const defaultFrom = zonedDateKey(addZonedDays(todayStart, context.timeZone, -30), context.timeZone);

  const [quickTake, history] = await Promise.all([
    getAttendanceQuickTakePayload({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      dateKey: searchParams?.date,
      sessionId: searchParams?.sessionId
    }),
    getAttendanceSessionsHistory({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      from: searchParams?.from ?? defaultFrom,
      to: searchParams?.to ?? defaultTo
    })
  ]);

  return (
    <AttendancePageShell
      initialData={{
        ...quickTake,
        historySessions: history.sessions,
        historyLocations: history.locations,
        historyFrom: searchParams?.from ?? defaultFrom,
        historyTo: searchParams?.to ?? defaultTo
      }}
      canEdit={canWrite(context.role)}
    />
  );
}
