import { ResidentsArchiveWorkspace } from "@/components/residents/ResidentsArchiveWorkspace";
import { getFacilityContextWithSubscription } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { toResidentListRow } from "@/lib/residents/serializers";

export default async function ResidentsArchivePage() {
  const context = await getFacilityContextWithSubscription();

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      status: "DISCHARGED"
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
    <div className="residents-page-gradient min-h-screen">
      <ResidentsArchiveWorkspace initialResidents={residents.map(toResidentListRow)} />
    </div>
  );
}
