import { ResidentStatus } from "@prisma/client";
import { z } from "zod";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { prisma } from "@/lib/prisma";
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

function isResidentActive(status: ResidentStatus) {
  return status === ResidentStatus.ACTIVE || status === ResidentStatus.BED_BOUND;
}

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
              isActive: isResidentActive(mappedStatus),
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
            isActive: isResidentActive(mappedStatus),
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

    const rows = await prisma.resident.findMany({
      where: {
        id: { in: importedResidents },
        facilityId: context.facilityId
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

    return Response.json({
      summary: {
        created,
        updated,
        skipped,
        processed: parsed.data.rows.length
      },
      residents: rows.map(toResidentListRow)
    });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
