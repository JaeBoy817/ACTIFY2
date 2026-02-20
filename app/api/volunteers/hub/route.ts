import { z } from "zod";

import {
  asVolunteersApiErrorResponse,
  requireVolunteersApiContext,
  VolunteersApiError
} from "@/lib/volunteers/api-context";
import { getVolunteerHubPayload } from "@/lib/volunteers/service";

const querySchema = z.object({
  hoursOffset: z.coerce.number().int().min(0).optional(),
  hoursLimit: z.coerce.number().int().min(10).max(100).optional()
});

export async function GET(request: Request) {
  try {
    const context = await requireVolunteersApiContext();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      hoursOffset: url.searchParams.get("hoursOffset") ?? undefined,
      hoursLimit: url.searchParams.get("hoursLimit") ?? undefined
    });

    if (!parsed.success) {
      throw new VolunteersApiError("Invalid volunteers hub query.", 400, {
        details: parsed.error.flatten()
      });
    }

    const payload = await getVolunteerHubPayload({
      facilityId: context.facilityId,
      hoursOffset: parsed.data.hoursOffset,
      hoursLimit: parsed.data.hoursLimit
    });

    return Response.json(payload);
  } catch (error) {
    return asVolunteersApiErrorResponse(error);
  }
}
