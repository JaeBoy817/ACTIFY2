import { isValid, parseISO } from "date-fns";
import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { getCalendarRangeActivities } from "@/lib/calendar/service";

const querySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  view: z.enum(["week", "month", "day"]).optional()
});

function parseDateOrThrow(value: string, label: string) {
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    throw new CalendarApiError(`Invalid ${label} date`, 400);
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const context = await requireCalendarApiContext();
    const url = new URL(request.url);
    const parsedQuery = querySchema.safeParse({
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
      view: url.searchParams.get("view") ?? undefined
    });
    if (!parsedQuery.success) {
      throw new CalendarApiError("Invalid calendar range query.", 400, {
        details: parsedQuery.error.flatten()
      });
    }

    const rangeStart = parseDateOrThrow(parsedQuery.data.start, "start");
    const rangeEnd = parseDateOrThrow(parsedQuery.data.end, "end");

    const { activities, materialized } = await getCalendarRangeActivities({
      facilityId: context.facilityId,
      rangeStart,
      rangeEnd
    });

    return Response.json({
      range: {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        view: parsedQuery.data.view ?? "week"
      },
      materialized,
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        startAt: activity.startAt.toISOString(),
        endAt: activity.endAt.toISOString(),
        location: activity.location,
        templateId: activity.templateId,
        seriesId: activity.seriesId,
        occurrenceKey: activity.occurrenceKey,
        isOverride: activity.isOverride,
        conflictOverride: activity.conflictOverride,
        attendanceCount: activity._count.attendance,
        checklist: activity.checklist,
        adaptationsEnabled: activity.adaptationsEnabled
      }))
    });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}

