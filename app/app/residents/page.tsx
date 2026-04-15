import { ResidentsWorkspaceLazy } from "@/components/residents/ResidentsWorkspaceLazy";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import {
  inflateLegacyResidentContextRow,
  isResidentSchemaDriftError,
  residentListContextLegacyQuery,
  residentListContextQuery
} from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsPage() {
  const context = await getFacilityContextWithSubscription();

  const [completionByResident, attendanceByResident] = await Promise.all([
    getAssessmentCompletionMapForFacility(context.facilityId),
    getAttendanceSummaryMapForFacility(context.facilityId)
  ]);

  const residents = await prisma.resident
    .findMany({
      where: {
        facilityId: context.facilityId
      },
      ...residentListContextQuery,
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    })
    .catch(async (error) => {
      if (!isResidentSchemaDriftError(error)) throw error;
      const legacyRows = await prisma.resident.findMany({
        where: {
          facilityId: context.facilityId
        },
        ...residentListContextLegacyQuery,
        orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
      });
      return legacyRows.map(inflateLegacyResidentContextRow);
    });

  return (
    <div className="min-h-screen space-y-4 bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 p-1">
      <ResidentsWorkspaceLazy
        initialResidents={residents.map((resident) =>
          toResidentListRow(resident, {
            completionByResident,
            attendanceByResident
          })
        )}
        canEdit={canWrite(context.role)}
      />
    </div>
  );
}
