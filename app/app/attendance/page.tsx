import { AttendanceTrackerPageShell } from "@/components/attendance/AttendanceTrackerPageShell";
import { getAttendanceQuickTakePayload, getAttendanceTrackerSummary } from "@/lib/attendance-tracker/service";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";

export default async function AttendanceTrackerPage({
  searchParams
}: {
  searchParams?: {
    date?: string;
    sessionId?: string;
  };
}) {
  const context = await requireModulePage("attendanceTracking");

  const [quickTake, summary] = await Promise.all([
    getAttendanceQuickTakePayload({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      dateKey: searchParams?.date,
      sessionId: searchParams?.sessionId
    }),
    getAttendanceTrackerSummary({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      dateKey: searchParams?.date
    })
  ]);

  return (
    <AttendanceTrackerPageShell
      initialData={quickTake}
      summary={summary}
      facilityName={context.facility.name}
      canEdit={canWrite(context.role)}
      timeZone={context.timeZone}
    />
  );
}
