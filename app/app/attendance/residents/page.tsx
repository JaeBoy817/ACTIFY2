import { AttendanceResidentsWorkspace } from "@/components/attendance/AttendanceResidentsWorkspace";
import { getAttendanceResidents, getResidentAttendanceSummary } from "@/lib/attendance-tracker/service";
import { requireModulePage } from "@/lib/page-guards";

export default async function AttendanceResidentsPage({
  searchParams
}: {
  searchParams?: {
    residentId?: string;
  };
}) {
  const context = await requireModulePage("attendanceTracking");
  const residents = await getAttendanceResidents(context.facilityId);

  const initialResidentId =
    (searchParams?.residentId && residents.some((resident) => resident.id === searchParams.residentId)
      ? searchParams.residentId
      : residents[0]?.id) ?? null;

  const initialSummary = initialResidentId
    ? await getResidentAttendanceSummary({
        facilityId: context.facilityId,
        residentId: initialResidentId,
        timeZone: context.timeZone
      })
    : null;

  return (
    <div className="space-y-4">
      <AttendanceResidentsWorkspace
        residents={residents}
        initialResidentId={initialResidentId}
        initialSummary={initialSummary}
      />
    </div>
  );
}
