import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  asVolunteersApiErrorResponse,
  requireVolunteersApiContext,
  VolunteersApiError
} from "@/lib/volunteers/api-context";
import { serializeVolunteerRequirements } from "@/lib/volunteers/service";

const patchVolunteerSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().max(64).optional().nullable(),
  requirements: z.union([z.array(z.string()), z.string()]).optional()
});

type RouteParams = { params: { volunteerId: string } };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const context = await requireVolunteersApiContext({ writable: true });
    const volunteerId = params.volunteerId;
    if (!volunteerId) {
      throw new VolunteersApiError("Volunteer id is required.", 400);
    }

    const existing = await prisma.volunteer.findFirst({
      where: {
        id: volunteerId,
        facilityId: context.facilityId
      }
    });
    if (!existing) {
      throw new VolunteersApiError("Volunteer not found.", 404);
    }

    const payload = await request.json().catch(() => null);
    const parsed = patchVolunteerSchema.safeParse(payload);
    if (!parsed.success) {
      throw new VolunteersApiError("Invalid volunteer payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const updated = await prisma.volunteer.update({
      where: { id: volunteerId },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone?.trim() || null } : {}),
        ...(parsed.data.requirements !== undefined
          ? { requirements: serializeVolunteerRequirements(parsed.data.requirements) }
          : {})
      }
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "UPDATE",
      entityType: "Volunteer",
      entityId: updated.id,
      before: existing,
      after: updated
    });

    return Response.json({ volunteer: updated });
  } catch (error) {
    return asVolunteersApiErrorResponse(error);
  }
}
