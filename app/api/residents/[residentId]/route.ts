import { ResidentStatus } from "@prisma/client";
import { z } from "zod";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { prisma } from "@/lib/prisma";
import { residentListContextQuery } from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";
import { serializeResidentTags } from "@/lib/residents/types";

const patchResidentSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    room: z.string().trim().min(1).optional(),
    status: z.nativeEnum(ResidentStatus).optional(),
    birthDate: z.string().trim().max(32).nullable().optional(),
    preferences: z.string().trim().max(2000).nullable().optional(),
    safetyNotes: z.string().trim().max(2000).nullable().optional(),
    tags: z.array(z.string().trim().min(1)).max(20).optional(),
    followUpFlag: z.boolean().optional(),
    lastOneOnOneAt: z.string().datetime().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

function isWritableStatus(status: ResidentStatus) {
  return (
    status === ResidentStatus.ACTIVE ||
    status === ResidentStatus.BED_BOUND ||
    status === ResidentStatus.HOSPITALIZED ||
    status === ResidentStatus.DISCHARGED
  );
}

function isResidentActive(status: ResidentStatus) {
  return status === ResidentStatus.ACTIVE || status === ResidentStatus.BED_BOUND;
}

function parseBirthDateInput(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = dateOnlyPattern.test(trimmed) ? new Date(`${trimmed}T12:00:00.000Z`) : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ResidentsApiError("Invalid birth date.", 400);
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

    if (parsed.data.status && !isWritableStatus(parsed.data.status)) {
      throw new ResidentsApiError("Unsupported resident status.", 400);
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

    const updated = await prisma.resident.update({
      where: {
        id: existing.id
      },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        room: parsed.data.room,
        status: parsed.data.status,
        isActive: parsed.data.status ? isResidentActive(parsed.data.status) : undefined,
        birthDate: parsed.data.birthDate !== undefined ? parseBirthDateInput(parsed.data.birthDate) : undefined,
        preferences: parsed.data.preferences,
        safetyNotes: parsed.data.safetyNotes,
        tags: parsed.data.tags ? serializeResidentTags(parsed.data.tags) : undefined,
        followUpFlag: parsed.data.followUpFlag,
        lastOneOnOneAt: parsed.data.lastOneOnOneAt ? new Date(parsed.data.lastOneOnOneAt) : parsed.data.lastOneOnOneAt
      },
      ...residentListContextQuery
    });

    return Response.json({ resident: toResidentListRow(updated) });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
