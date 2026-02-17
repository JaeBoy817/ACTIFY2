import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { addSeriesExdate, CalendarConflictError, updateActivityWithChecks } from "@/lib/calendar/service";
import { prisma } from "@/lib/prisma";

const updatePayloadSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  location: z.string().min(1).max(160).optional(),
  checklist: z.any().optional(),
  adaptationsEnabled: z.any().optional(),
  allowConflictOverride: z.boolean().optional(),
  allowOutsideBusinessHoursOverride: z.boolean().optional(),
  scope: z.enum(["instance", "series"]).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const raw = await request.json();
    const parsed = updatePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CalendarApiError("Invalid update payload.", 400, { details: parsed.error.flatten() });
    }

    if (parsed.data.scope === "series") {
      throw new CalendarApiError("Use /api/calendar/series/:id to edit a series.", 400);
    }

    const activity = await updateActivityWithChecks({
      activityId: params.id,
      facilityId: context.facilityId,
      title: parsed.data.title,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : undefined,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : undefined,
      location: parsed.data.location,
      checklist: parsed.data.checklist,
      adaptationsEnabled: parsed.data.adaptationsEnabled,
      forceInstanceOverride: true,
      allowConflictOverride: parsed.data.allowConflictOverride,
      allowOutsideBusinessHoursOverride: parsed.data.allowOutsideBusinessHoursOverride
    });

    return Response.json({
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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const existing = await prisma.activityInstance.findFirst({
      where: {
        id: params.id,
        facilityId: context.facilityId
      },
      select: {
        id: true,
        seriesId: true,
        occurrenceKey: true,
        isOverride: true
      }
    });

    if (!existing) {
      throw new CalendarApiError("Activity not found.", 404);
    }

    let seriesOccurrenceSkipped = false;
    if (existing.seriesId && existing.occurrenceKey && !existing.isOverride) {
      const occurrenceStartAt = new Date(existing.occurrenceKey);
      if (!Number.isNaN(occurrenceStartAt.getTime())) {
        await addSeriesExdate({
          seriesId: existing.seriesId,
          facilityId: context.facilityId,
          occurrenceStartAt
        });
        seriesOccurrenceSkipped = true;
      }
    }

    await prisma.activityInstance.deleteMany({
      where: {
        id: existing.id,
        facilityId: context.facilityId
      }
    });

    return Response.json({
      deleted: true,
      skippedSeriesOccurrence: seriesOccurrenceSkipped,
      id: existing.id
    });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}
