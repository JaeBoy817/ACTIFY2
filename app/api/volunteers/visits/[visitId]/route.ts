import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  asVolunteersApiErrorResponse,
  requireVolunteersApiContext,
  VolunteersApiError
} from "@/lib/volunteers/api-context";
import { markVisitApprovedNotes, markVisitDeniedNotes } from "@/lib/volunteers/service";

const patchVisitSchema = z.object({
  action: z.enum(["signOut", "reassign", "approve", "deny", "update"]).optional(),
  volunteerId: z.string().trim().optional(),
  endAt: z.string().trim().optional(),
  assignedLocation: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  denialReason: z.string().trim().max(255).optional().nullable()
});

type RouteParams = { params: { visitId: string } };

function parseDateOrThrow(value: string, fieldName: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new VolunteersApiError(`Invalid ${fieldName}.`, 400);
  }
  return parsed;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await requireVolunteersApiContext({ writable: true });
    const visitId = params.visitId;
    if (!visitId) {
      throw new VolunteersApiError("Visit id is required.", 400);
    }

    const existing = await prisma.volunteerVisit.findFirst({
      where: {
        id: visitId,
        volunteer: { facilityId: context.facilityId }
      }
    });
    if (!existing) {
      throw new VolunteersApiError("Visit not found.", 404);
    }

    const payload = await request.json().catch(() => null);
    const parsed = patchVisitSchema.safeParse(payload);
    if (!parsed.success) {
      throw new VolunteersApiError("Invalid visit update payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const action = parsed.data.action ?? "update";
    const updateData: {
      endAt?: Date | null;
      assignedLocation?: string;
      notes?: string | null;
      volunteerId?: string;
      signedOutByUserId?: string | null;
    } = {};

    if (action === "signOut") {
      updateData.endAt = new Date();
      updateData.signedOutByUserId = context.user.id;
    }

    if (action === "reassign") {
      if (!parsed.data.volunteerId) {
        throw new VolunteersApiError("Volunteer id is required for reassignment.", 400);
      }
      const targetVolunteer = await prisma.volunteer.findFirst({
        where: { id: parsed.data.volunteerId, facilityId: context.facilityId },
        select: { id: true }
      });
      if (!targetVolunteer) {
        throw new VolunteersApiError("Target volunteer not found.", 404);
      }
      updateData.volunteerId = targetVolunteer.id;
    }

    if (action === "approve") {
      updateData.notes = markVisitApprovedNotes(existing.notes);
    }

    if (action === "deny") {
      updateData.notes = markVisitDeniedNotes(existing.notes, parsed.data.denialReason);
    }

    if (action === "update") {
      if (parsed.data.assignedLocation !== undefined) {
        updateData.assignedLocation = parsed.data.assignedLocation;
      }
      if (parsed.data.notes !== undefined) {
        updateData.notes = parsed.data.notes?.trim() || null;
      }
      if (parsed.data.endAt) {
        updateData.endAt = parseDateOrThrow(parsed.data.endAt, "end time");
      }
    }

    const updated = await prisma.volunteerVisit.update({
      where: { id: existing.id },
      data: updateData
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "UPDATE",
      entityType: "VolunteerVisit",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    return Response.json({ visit: updated });
  } catch (error) {
    return asVolunteersApiErrorResponse(error);
  }
}
