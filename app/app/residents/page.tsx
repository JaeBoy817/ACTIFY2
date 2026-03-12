import { ResidentsWorkspaceLazy } from "@/components/residents/ResidentsWorkspaceLazy";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import { residentListContextQuery } from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsPage() {
  const context = await getFacilityContextWithSubscription();

  const [residents, units, completionByResident, attendanceByResident] = await Promise.all([
    prisma.resident.findMany({
      where: {
        facilityId: context.facilityId
      },
      ...residentListContextQuery,
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    }),
    prisma.unit.findMany({
      where: {
        facilityId: context.facilityId
      },
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        name: true
      }
    }),
    getAssessmentCompletionMapForFacility(context.facilityId),
    getAttendanceSummaryMapForFacility(context.facilityId)
  ]);

  return (
    <div className="residents-page-gradient min-h-screen space-y-4">
      <ResidentsWorkspaceLazy
        initialResidents={residents.map((resident) =>
          toResidentListRow(resident, {
            completionByResident,
            attendanceByResident
          })
        )}
        initialUnits={units}
        canEdit={canWrite(context.role)}
      />
    </div>
  );
}
