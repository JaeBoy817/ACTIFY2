import { ResidentsArchiveWorkspace } from "@/components/residents/ResidentsArchiveWorkspace";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import {
  inflateLegacyResidentContextRow,
  isResidentSchemaDriftError,
  residentListContextLegacyQuery,
  residentListContextQuery
} from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsArchivePage() {
  const context = await getFacilityContextWithSubscription();

  const [completionByResident, attendanceByResident] = await Promise.all([
    getAssessmentCompletionMapForFacility(context.facilityId),
    getAttendanceSummaryMapForFacility(context.facilityId)
  ]);

  const residents = await prisma.resident
    .findMany({
      where: {
        facilityId: context.facilityId,
        status: {
          in: ["DISCHARGED", "TRANSFERRED", "DECEASED", "OTHER"]
        }
      },
      ...residentListContextQuery,
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    })
    .catch(async (error) => {
      if (!isResidentSchemaDriftError(error)) throw error;
      const legacyRows = await prisma.resident.findMany({
        where: {
          facilityId: context.facilityId,
          status: {
            in: ["DISCHARGED", "TRANSFERRED", "DECEASED", "OTHER"]
          }
        },
        ...residentListContextLegacyQuery,
        orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
      });
      return legacyRows.map(inflateLegacyResidentContextRow);
    });

  return (
    <div className="residents-page-gradient min-h-screen">
      <ResidentsArchiveWorkspace
        initialResidents={residents.map((resident) =>
          toResidentListRow(resident, {
            completionByResident,
            attendanceByResident
          })
        )}
      />
    </div>
  );
}
