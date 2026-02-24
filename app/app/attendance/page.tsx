import { AttendanceQuickTakeWorkspaceLazy } from "@/components/attendance/AttendanceQuickTakeWorkspaceLazy";
import { getAttendanceQuickTakePayload } from "@/lib/attendance-tracker/service";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";

export default async function AttendanceQuickTakePage({
  searchParams
}: {
  searchParams?: {
    date?: string;
    sessionId?: string;
  };
}) {
  const context = await requireModulePage("attendanceTracking");

  const initialData = await getAttendanceQuickTakePayload({
    facilityId: context.facilityId,
    timeZone: context.timeZone,
    dateKey: searchParams?.date,
    sessionId: searchParams?.sessionId
  });

  return (
    <div className="space-y-4">
      <AttendanceQuickTakeWorkspaceLazy initialData={initialData} canEdit={canWrite(context.role)} />
    </div>
  );
}
