import { ResidentsWorkspace } from "@/components/residents/ResidentsWorkspace";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsPage() {
  const context = await getFacilityContextWithSubscription();

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      status: { not: "DISCHARGED" }
    },
    include: {
      carePlans: {
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          focusAreas: true,
          nextReviewDate: true
        }
      },
      progressNotes: {
        where: { type: "ONE_TO_ONE" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          narrative: true
        }
      }
    },
    orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
  });

  return (
    <div className="residents-page-gradient min-h-screen space-y-4">
      <ResidentsWorkspace initialResidents={residents.map(toResidentListRow)} canEdit={canWrite(context.role)} />
    </div>
  );
}
