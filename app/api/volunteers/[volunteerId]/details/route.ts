import { getVolunteerDetailPayload } from "@/lib/volunteers/service";
import {
  asVolunteersApiErrorResponse,
  requireVolunteersApiContext,
  VolunteersApiError
} from "@/lib/volunteers/api-context";

type RouteParams = { params: { volunteerId: string } };

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const context = await requireVolunteersApiContext();
    const volunteerId = params.volunteerId;
    if (!volunteerId) {
      throw new VolunteersApiError("Volunteer id is required.", 400);
    }

    const payload = await getVolunteerDetailPayload({
      facilityId: context.facilityId,
      volunteerId
    });

    if (!payload) {
      throw new VolunteersApiError("Volunteer not found.", 404);
    }

    return Response.json(payload);
  } catch (error) {
    return asVolunteersApiErrorResponse(error);
  }
}
