import { ResidentStatus } from "@prisma/client";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import { prisma } from "@/lib/prisma";
import {
  inflateLegacyResidentContextRow,
  isResidentSchemaDriftError,
  residentListContextLegacyQuery,
  residentListContextQuery
} from "@/lib/residents/query";
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

    const updated = await prisma.resident
      .update({
        where: { id: existing.id },
        data: {
          status: ResidentStatus.ACTIVE,
          isActive: true
        },
        ...residentListContextQuery
      })
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;
        const legacyUpdated = await prisma.resident.update({
          where: { id: existing.id },
          data: {
            status: ResidentStatus.ACTIVE,
            isActive: true
          },
          ...residentListContextLegacyQuery
        });
        return inflateLegacyResidentContextRow(legacyUpdated);
      });

    const [completionByResident, attendanceByResident] = await Promise.all([
      getAssessmentCompletionMapForFacility(context.facilityId),
      getAttendanceSummaryMapForFacility(context.facilityId)
    ]);

    return Response.json({
      resident: toResidentListRow(updated, {
        completionByResident,
        attendanceByResident
      })
    });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
