import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  asVolunteersApiErrorResponse,
  requireVolunteersApiContext,
  VolunteersApiError
} from "@/lib/volunteers/api-context";

const createVisitSchema = z.object({
  volunteerId: z.string().trim().min(1),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().optional().nullable(),
  assignedLocation: z.string().trim().min(1),
  notes: z.string().trim().max(2000).optional().nullable()
});

function parseDateOrThrow(value: string, fieldName: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new VolunteersApiError(`Invalid ${fieldName}.`, 400);
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const context = await requireVolunteersApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createVisitSchema.safeParse(payload);

    if (!parsed.success) {
      throw new VolunteersApiError("Invalid shift payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const volunteer = await prisma.volunteer.findFirst({
      where: {
        id: parsed.data.volunteerId,
        facilityId: context.facilityId
      },
      select: { id: true }
    });
    if (!volunteer) {
      throw new VolunteersApiError("Volunteer not found.", 404);
    }

    const startAt = parseDateOrThrow(parsed.data.startAt, "start time");
    const endAt = parsed.data.endAt ? parseDateOrThrow(parsed.data.endAt, "end time") : null;
    if (endAt && endAt.getTime() <= startAt.getTime()) {
      throw new VolunteersApiError("End time must be after start time.", 400);
    }

    const visit = await prisma.volunteerVisit.create({
      data: {
        volunteerId: volunteer.id,
        startAt,
        endAt,
        assignedLocation: parsed.data.assignedLocation,
        notes: parsed.data.notes?.trim() || null,
        signedInByUserId: context.user.id,
        ...(endAt ? { signedOutByUserId: context.user.id } : {})
      }
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "CREATE",
      entityType: "VolunteerVisit",
      entityId: visit.id,
      after: visit
    });

    return Response.json({ visit }, { status: 201 });
  } catch (error) {
    return asVolunteersApiErrorResponse(error);
  }
}
