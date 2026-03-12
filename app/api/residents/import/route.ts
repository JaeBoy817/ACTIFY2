import { z } from "zod";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import { prisma } from "@/lib/prisma";
import { statusIsActive } from "@/lib/resident-status";
import {
  inflateLegacyResidentContextRow,
  isResidentSchemaDriftError,
  residentListContextLegacyQuery,
  residentListContextQuery
} from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";
import { normalizeResidentStatusForImport } from "@/lib/residents/types";

const importRowSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  room: z.string().trim().min(1),
  status: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional().nullable()
});

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500)
});

export async function POST(request: Request) {
  try {
    const context = await requireResidentsApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = importSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ResidentsApiError("Invalid import payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const importedResidents = await prisma.$transaction(async (tx) => {
      const results: string[] = [];

      for (const row of parsed.data.rows) {
        const mappedStatus = normalizeResidentStatusForImport(row.status);
        if (!mappedStatus) {
          skipped += 1;
          continue;
        }

        const existing = await tx.resident.findFirst({
          where: {
            facilityId: context.facilityId,
            room: row.room
          },
          select: {
            id: true
          }
        });

        if (existing) {
          await tx.resident.update({
            where: { id: existing.id },
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              room: row.room,
              status: mappedStatus,
              isActive: statusIsActive(mappedStatus),
              preferences: row.notes || undefined,
              notes: row.notes || undefined
            }
          });
          updated += 1;
          results.push(existing.id);
          continue;
        }

        const createdResident = await tx.resident.create({
          data: {
            facilityId: context.facilityId,
            firstName: row.firstName,
            lastName: row.lastName,
            room: row.room,
            status: mappedStatus,
            isActive: statusIsActive(mappedStatus),
            preferences: row.notes || null,
            notes: row.notes || null
          },
          select: {
            id: true
          }
        });
        created += 1;
        results.push(createdResident.id);
      }

      return results;
    });

    const rows = await prisma.resident
      .findMany({
        where: {
          id: { in: importedResidents },
          facilityId: context.facilityId
        },
        ...residentListContextQuery,
        orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
      })
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;
        const legacyRows = await prisma.resident.findMany({
          where: {
            id: { in: importedResidents },
            facilityId: context.facilityId
          },
          ...residentListContextLegacyQuery,
          orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
        });
        return legacyRows.map(inflateLegacyResidentContextRow);
      });

    const [completionByResident, attendanceByResident] = await Promise.all([
      getAssessmentCompletionMapForFacility(context.facilityId),
      getAttendanceSummaryMapForFacility(context.facilityId)
    ]);

    return Response.json({
      summary: {
        created,
        updated,
        skipped,
        processed: parsed.data.rows.length
      },
      residents: rows.map((resident) =>
        toResidentListRow(resident, {
          completionByResident,
          attendanceByResident
        })
      )
    });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
