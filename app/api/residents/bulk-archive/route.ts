import { ResidentStatus } from "@prisma/client";
import { z } from "zod";

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

const bulkArchiveSchema = z.object({
  residentIds: z.array(z.string().trim().min(1)).min(1).max(250),
  date: z.string().trim().min(1).max(32),
  reason: z.enum(["Returned Home", "Transfer", "Hospital", "Other"]).default("Other"),
  note: z.string().trim().max(1000).optional().default("")
});

const ARCHIVED_STATUSES: ResidentStatus[] = [ResidentStatus.DISCHARGED, ResidentStatus.TRANSFERRED, ResidentStatus.DECEASED];

function parseDateInput(value: string) {
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = dateOnlyPattern.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ResidentsApiError("Invalid archive date.", 400);
  }
  return value.slice(0, 32);
}

function appendArchiveContext(input: { existingNotes: string | null; date: string; reason: string; note: string }) {
  const lines = (input.existingNotes ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !line.startsWith("Archive Date:") &&
        !line.startsWith("Archive Reason:") &&
        !line.startsWith("Archive Note:")
    );

  lines.push(`Archive Date: ${input.date}`);
  lines.push(`Archive Reason: ${input.reason}`);
  if (input.note.trim()) {
    lines.push(`Archive Note: ${input.note.trim()}`);
  }

  return lines.join("\n");
}

function parseTags(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function serializeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).join(", ");
}

export async function POST(request: Request) {
  try {
    const context = await requireResidentsApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = bulkArchiveSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ResidentsApiError("Invalid bulk archive payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const residentIds = Array.from(new Set(parsed.data.residentIds));
    const archiveDate = parseDateInput(parsed.data.date);

    const residentsToArchive = await prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        id: { in: residentIds },
        status: { notIn: ARCHIVED_STATUSES }
      },
      select: {
        id: true,
        notes: true,
        tags: true
      }
    });

    if (residentsToArchive.length === 0) {
      throw new ResidentsApiError("No active residents were selected for archive.", 400);
    }

    const archivedIds = residentsToArchive.map((resident) => resident.id);

    await prisma
      .$transaction(
        residentsToArchive.map((resident) =>
          prisma.resident.update({
            where: { id: resident.id },
            data: {
              status: ResidentStatus.DISCHARGED,
              isActive: false,
              notes: appendArchiveContext({
                existingNotes: resident.notes,
                date: archiveDate,
                reason: parsed.data.reason,
                note: parsed.data.note
              }),
              tags: serializeTags([...parseTags(resident.tags), `Archive: ${parsed.data.reason}`])
            },
            select: { id: true }
          })
        )
      )
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;
        await prisma.resident.updateMany({
          where: {
            facilityId: context.facilityId,
            id: { in: archivedIds }
          },
          data: {
            status: ResidentStatus.DISCHARGED,
            isActive: false
          }
        });
      });

    const updatedResidents = await prisma.resident
      .findMany({
        where: {
          facilityId: context.facilityId,
          id: { in: archivedIds }
        },
        ...residentListContextQuery,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { room: "asc" }]
      })
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;
        const legacyRows = await prisma.resident.findMany({
          where: {
            facilityId: context.facilityId,
            id: { in: archivedIds }
          },
          ...residentListContextLegacyQuery,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { room: "asc" }]
        });
        return legacyRows.map(inflateLegacyResidentContextRow);
      });

    const [completionByResident, attendanceByResident] = await Promise.all([
      getAssessmentCompletionMapForFacility(context.facilityId),
      getAttendanceSummaryMapForFacility(context.facilityId)
    ]);

    return Response.json({
      archivedCount: archivedIds.length,
      residents: updatedResidents.map((resident) =>
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
