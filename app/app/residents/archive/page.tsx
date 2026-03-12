import { ResidentsArchiveWorkspace } from "@/components/residents/ResidentsArchiveWorkspace";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import { residentListContextQuery } from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsArchivePage() {
  const context = await getFacilityContextWithSubscription();

  const [residents, completionByResident, attendanceByResident] = await Promise.all([
    prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        status: "DISCHARGED"
      },
      ...residentListContextQuery,
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    }),
    getAssessmentCompletionMapForFacility(context.facilityId),
    getAttendanceSummaryMapForFacility(context.facilityId)
  ]);

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
