import { ResidentStatus } from "@prisma/client";
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
import { serializeResidentTags } from "@/lib/residents/types";
import { ensureResidentExtendedColumns } from "@/lib/residents/ensure-columns";

const patchResidentSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    preferredName: z.string().trim().max(120).nullable().optional(),
    room: z.string().trim().min(1).optional(),
    status: z.nativeEnum(ResidentStatus).optional(),
    unitId: z.string().trim().min(1).nullable().optional(),
    birthDate: z.string().trim().max(32).nullable().optional(),
    admissionDate: z.string().trim().max(32).nullable().optional(),
    mdsManualDueDate: z.string().trim().max(32).nullable().optional(),
    bestTimesOfDay: z.string().trim().max(300).nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    preferences: z.string().trim().max(2000).nullable().optional(),
    safetyNotes: z.string().trim().max(2000).nullable().optional(),
    tags: z.array(z.string().trim().min(1)).max(20).nullable().optional(),
    followUpFlag: z.boolean().optional(),
    lastOneOnOneAt: z.string().datetime().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

function parseDateInput(value: string | null | undefined, fieldLabel: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = dateOnlyPattern.test(trimmed) ? new Date(`${trimmed}T12:00:00.000Z`) : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ResidentsApiError(`Invalid ${fieldLabel}.`, 400);
  }

  return parsed;
}

export async function PATCH(
  request: Request,
  { params }: { params: { residentId: string } }
) {
  try {
    const context = await requireResidentsApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = patchResidentSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ResidentsApiError("Invalid resident update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

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

    const updateData = {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      preferredName: parsed.data.preferredName,
      room: parsed.data.room,
      status: parsed.data.status,
      isActive: parsed.data.status ? statusIsActive(parsed.data.status) : undefined,
      unitId: parsed.data.unitId,
      birthDate: parseDateInput(parsed.data.birthDate, "birth date"),
      admissionDate: parseDateInput(parsed.data.admissionDate, "admission date"),
      mdsManualDueDate: parseDateInput(parsed.data.mdsManualDueDate, "MDS manual due date"),
      bestTimesOfDay: parsed.data.bestTimesOfDay,
      notes: parsed.data.notes,
      preferences: parsed.data.preferences,
      safetyNotes: parsed.data.safetyNotes,
      tags:
        parsed.data.tags !== undefined
          ? parsed.data.tags
            ? serializeResidentTags(parsed.data.tags)
            : null
          : undefined,
      followUpFlag: parsed.data.followUpFlag,
      lastOneOnOneAt: parsed.data.lastOneOnOneAt ? new Date(parsed.data.lastOneOnOneAt) : parsed.data.lastOneOnOneAt
    };

    await prisma.resident
      .update({
        where: {
          id: existing.id
        },
        data: updateData,
        select: {
          id: true
        }
      })
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;

        const healed = await ensureResidentExtendedColumns();
        if (healed) {
          try {
            await prisma.resident.update({
              where: {
                id: existing.id
              },
              data: updateData,
              select: {
                id: true
              }
            });
            return;
          } catch (retryError) {
            if (!isResidentSchemaDriftError(retryError)) throw retryError;
          }
        }

        await prisma.resident.update({
          where: {
            id: existing.id
          },
          data: {
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            room: parsed.data.room,
            status: parsed.data.status,
            isActive: parsed.data.status ? statusIsActive(parsed.data.status) : undefined,
            unitId: parsed.data.unitId,
            birthDate: parseDateInput(parsed.data.birthDate, "birth date"),
            bestTimesOfDay: parsed.data.bestTimesOfDay,
            notes: parsed.data.notes,
            preferences: parsed.data.preferences,
            safetyNotes: parsed.data.safetyNotes,
            tags:
              parsed.data.tags !== undefined
                ? parsed.data.tags
                  ? serializeResidentTags(parsed.data.tags)
                  : null
                : undefined,
            followUpFlag: parsed.data.followUpFlag,
            lastOneOnOneAt: parsed.data.lastOneOnOneAt ? new Date(parsed.data.lastOneOnOneAt) : parsed.data.lastOneOnOneAt
          },
          select: {
            id: true
          }
        });
      });

    const updated = await prisma.resident
      .findFirst({
        where: {
          id: existing.id,
          facilityId: context.facilityId
        },
        ...residentListContextQuery
      })
      .catch(async (error) => {
        if (!isResidentSchemaDriftError(error)) throw error;

        const healed = await ensureResidentExtendedColumns();
        if (healed) {
          try {
            const healedRow = await prisma.resident.findFirst({
              where: {
                id: existing.id,
                facilityId: context.facilityId
              },
              ...residentListContextQuery
            });
            if (healedRow) {
              return healedRow;
            }
          } catch (retryError) {
            if (!isResidentSchemaDriftError(retryError)) throw retryError;
          }
        }

        const legacyUpdated = await prisma.resident.findFirst({
          where: {
            id: existing.id,
            facilityId: context.facilityId
          },
          ...residentListContextLegacyQuery
        });
        if (!legacyUpdated) {
          throw new ResidentsApiError("Resident not found after update.", 404);
        }
        return inflateLegacyResidentContextRow(legacyUpdated);
      });

    if (!updated) {
      throw new ResidentsApiError("Resident not found after update.", 404);
    }

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
