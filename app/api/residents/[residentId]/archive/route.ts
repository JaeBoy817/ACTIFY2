import { ResidentStatus } from "@prisma/client";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { prisma } from "@/lib/prisma";
import { toResidentListRow } from "@/lib/residents/serializers";

export async function POST(
  _request: Request,
  { params }: { params: { residentId: string } }
) {
  try {
    const context = await requireResidentsApiContext({ writable: true });

    const existing = await prisma.resident.findFirst({
      where: {
        id: params.residentId,
        facilityId: context.facilityId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new ResidentsApiError("Resident not found.", 404);
    }

    const updated = await prisma.resident.update({
      where: { id: existing.id },
      data: {
        status: ResidentStatus.DISCHARGED,
        isActive: false
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
      }
    });

    return Response.json({ resident: toResidentListRow(updated) });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
