import { ResidentsWorkspaceLazy } from "@/components/residents/ResidentsWorkspaceLazy";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { residentListContextQuery } from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsPage() {
  const context = await getFacilityContextWithSubscription();

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      status: { not: "DISCHARGED" }
    },
    ...residentListContextQuery,
    orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
  });

  return (
    <div className="residents-page-gradient min-h-screen space-y-4">
      <ResidentsWorkspaceLazy initialResidents={residents.map(toResidentListRow)} canEdit={canWrite(context.role)} />
    </div>
  );
}
