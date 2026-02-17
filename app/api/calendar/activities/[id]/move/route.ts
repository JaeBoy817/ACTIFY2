import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { CalendarConflictError, moveActivityWithChecks } from "@/lib/calendar/service";

const movePayloadSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  location: z.string().min(1).max(160).optional(),
  allowConflictOverride: z.boolean().optional(),
  allowOutsideBusinessHoursOverride: z.boolean().optional()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const raw = await request.json();
    const parsed = movePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CalendarApiError("Invalid move payload.", 400, { details: parsed.error.flatten() });
    }

    const activity = await moveActivityWithChecks({
      activityId: params.id,
      facilityId: context.facilityId,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      location: parsed.data.location,
      allowConflictOverride: parsed.data.allowConflictOverride,
      allowOutsideBusinessHoursOverride: parsed.data.allowOutsideBusinessHoursOverride
    });

    return Response.json({
      moved: true,
      activity: {
        id: activity.id,
        title: activity.title,
        startAt: activity.startAt.toISOString(),
        endAt: activity.endAt.toISOString(),
        location: activity.location,
        seriesId: activity.seriesId,
        occurrenceKey: activity.occurrenceKey,
        isOverride: activity.isOverride
      }
    });
  } catch (error) {
    if (error instanceof CalendarConflictError) {
      return Response.json(
        {
          error: error.message,
          code: "CALENDAR_CONFLICT",
          conflicts: error.conflicts,
          outsideBusinessHours: error.outsideBusinessHours
        },
        { status: 409 }
      );
    }
    return asCalendarApiErrorResponse(error);
  }
}

