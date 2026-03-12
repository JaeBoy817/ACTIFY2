import { ResidentStatus } from "@prisma/client";
import { z } from "zod";

import { asResidentsApiErrorResponse, requireResidentsApiContext, ResidentsApiError } from "@/lib/residents/api-context";
import { getAssessmentCompletionMapForFacility, getAttendanceSummaryMapForFacility } from "@/lib/residents/metrics";
import { prisma } from "@/lib/prisma";
import { statusIsActive } from "@/lib/resident-status";
import { residentListContextQuery } from "@/lib/residents/query";
import { toResidentListRow } from "@/lib/residents/serializers";
import { serializeResidentTags } from "@/lib/residents/types";

const createResidentSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  preferredName: z.string().trim().max(120).optional().nullable(),
  room: z.string().trim().min(1),
  status: z.nativeEnum(ResidentStatus),
  unitId: z.string().trim().min(1).optional().nullable(),
  birthDate: z.string().trim().max(32).optional().nullable(),
  admissionDate: z.string().trim().max(32).optional().nullable(),
  mdsManualDueDate: z.string().trim().max(32).optional().nullable(),
  bestTimesOfDay: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  preferences: z.string().trim().max(2000).optional().nullable(),
  safetyNotes: z.string().trim().max(2000).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  followUpFlag: z.boolean().optional()
});

function parseDateInput(value: string | null | undefined, fieldLabel: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = dateOnlyPattern.test(trimmed) ? new Date(`${trimmed}T12:00:00.000Z`) : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new ResidentsApiError(`Invalid ${fieldLabel}.`, 400);
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const context = await requireResidentsApiContext();
    const url = new URL(request.url);
    const archivedOnly = url.searchParams.get("archived") === "true";
    const includeAll = url.searchParams.get("includeAll") === "true";

    const residents = await prisma.resident.findMany({
      where: {
        facilityId: context.facilityId,
        ...(archivedOnly
          ? { status: ResidentStatus.DISCHARGED }
          : includeAll
            ? {}
            : { status: { not: ResidentStatus.DISCHARGED } })
      },
      ...residentListContextQuery,
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    });

    const [completionByResident, attendanceByResident] = await Promise.all([
      getAssessmentCompletionMapForFacility(context.facilityId),
      getAttendanceSummaryMapForFacility(context.facilityId)
    ]);

    return Response.json({
      residents: residents.map((resident) =>
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

    const created = await prisma.resident.create({
      data: {
        facilityId: context.facilityId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        preferredName: parsed.data.preferredName || null,
        room: parsed.data.room,
        status: parsed.data.status,
        isActive: statusIsActive(parsed.data.status),
        unitId: parsed.data.unitId || null,
        birthDate: parseDateInput(parsed.data.birthDate, "birth date"),
        admissionDate: parseDateInput(parsed.data.admissionDate, "admission date"),
        mdsManualDueDate: parseDateInput(parsed.data.mdsManualDueDate, "MDS manual due date"),
        bestTimesOfDay: parsed.data.bestTimesOfDay || null,
        notes: parsed.data.notes || null,
        preferences: parsed.data.preferences || null,
        safetyNotes: parsed.data.safetyNotes || null,
        tags: parsed.data.tags ? serializeResidentTags(parsed.data.tags) : null,
        followUpFlag: parsed.data.followUpFlag ?? false
      },
      ...residentListContextQuery
    });

    const [completionByResident, attendanceByResident] = await Promise.all([
      getAssessmentCompletionMapForFacility(context.facilityId),
      getAttendanceSummaryMapForFacility(context.facilityId)
    ]);

    return Response.json(
      {
        resident: toResidentListRow(created, {
          completionByResident,
          attendanceByResident
        })
      },
      { status: 201 }
    );
  } catch (error) {
    return asResidentsApiErrorResponse(error);
  }
}
