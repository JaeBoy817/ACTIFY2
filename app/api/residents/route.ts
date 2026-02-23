import { ResidentStatus } from "@prisma/client";
import { z } from "zod";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { prisma } from "@/lib/prisma";
import { residentListContextQuery } from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";
import { serializeResidentTags } from "@/lib/residents/types";

const allowedStatuses = [
  ResidentStatus.ACTIVE,
  ResidentStatus.BED_BOUND,
  ResidentStatus.HOSPITALIZED,
  ResidentStatus.DISCHARGED
] as const;

const createResidentSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  room: z.string().trim().min(1),
  status: z.nativeEnum(ResidentStatus),
  birthDate: z.string().trim().max(32).optional().nullable(),
  preferences: z.string().trim().max(2000).optional().nullable(),
  safetyNotes: z.string().trim().max(2000).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  followUpFlag: z.boolean().optional()
});

function isWritableStatus(status: ResidentStatus) {
  return allowedStatuses.includes(status as (typeof allowedStatuses)[number]);
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

export async function GET(request: Request) {
  try {
    const context = await requireResidentsApiContext();
    const url = new URL(request.url);
    const archivedOnly = url.searchParams.get("archived") === "true";

    const residents = await prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        ...(archivedOnly ? { status: ResidentStatus.DISCHARGED } : { status: { not: ResidentStatus.DISCHARGED } })
      },
      ...residentListContextQuery,
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    });

    return Response.json({
      residents: residents.map(toResidentListRow)
    });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireResidentsApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createResidentSchema.safeParse(payload);

    if (!parsed.success) {
      throw new ResidentsApiError("Invalid resident payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    if (!isWritableStatus(parsed.data.status)) {
      throw new ResidentsApiError("Unsupported resident status.", 400);
    }

    const created = await prisma.resident.create({
      data: {
        facilityId: context.facilityId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        room: parsed.data.room,
        status: parsed.data.status,
        isActive: isResidentActive(parsed.data.status),
        birthDate: parseBirthDateInput(parsed.data.birthDate),
        preferences: parsed.data.preferences || null,
        safetyNotes: parsed.data.safetyNotes || null,
        tags: parsed.data.tags ? serializeResidentTags(parsed.data.tags) : null,
        followUpFlag: parsed.data.followUpFlag ?? false,
        notes: parsed.data.preferences || null
      },
      ...residentListContextQuery
    });

    return Response.json({ resident: toResidentListRow(created) }, { status: 201 });
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
