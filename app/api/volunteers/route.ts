import { z } from "zod";

import { logAudit } from "@/lib/audit";
import {
  asVolunteersApiErrorResponse,
  requireVolunteersApiContext,
  VolunteersApiError
} from "@/lib/volunteers/api-context";
import { serializeVolunteerRequirements } from "@/lib/volunteers/service";
import { prisma } from "@/lib/prisma";

const createVolunteerSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().max(64).optional().nullable(),
  requirements: z.union([z.array(z.string()), z.string()]).optional()
});

export async function POST(request: Request) {
  try {
    const context = await requireVolunteersApiContext({ writable: true });
    const payload = await request.json().catch(() => null);
    const parsed = createVolunteerSchema.safeParse(payload);
    if (!parsed.success) {
      throw new VolunteersApiError("Invalid volunteer payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const volunteer = await prisma.volunteer.create({
      data: {
        facilityId: context.facilityId,
        name: parsed.data.name,
        phone: parsed.data.phone?.trim() || null,
        requirements: serializeVolunteerRequirements(parsed.data.requirements ?? [])
      }
    });

    await logAudit({
      facilityId: context.facilityId,
      actorUserId: context.user.id,
      action: "CREATE",
      entityType: "Volunteer",
      entityId: volunteer.id,
      after: volunteer
    });

    return Response.json({ volunteer }, { status: 201 });
  } catch (error) {
    return asVolunteersApiErrorResponse(error);
  }
}
