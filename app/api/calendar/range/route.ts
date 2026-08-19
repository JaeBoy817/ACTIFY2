import { isValid, parseISO } from "date-fns";
import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { getCalendarRangeActivities } from "@/lib/calendar/service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  view: z.enum(["week", "month", "day"]).optional(),
  includeStats: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return true;
      const normalized = value.trim().toLowerCase();
      return !(normalized === "0" || normalized === "false" || normalized === "no");
    })
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
      view: url.searchParams.get("view") ?? undefined,
      includeStats: url.searchParams.get("includeStats") ?? undefined
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

    const activityIds = activities.map((activity) => activity.id);

    const includeStats = parsedQuery.data.includeStats;

    const [attendanceCounts, documentationCounts] = includeStats && activityIds.length
      ? await Promise.all([
          prisma.attendance.groupBy({
            by: ["activityInstanceId"],
            where: {
              activityInstanceId: {
                in: activityIds
              }
            },
            _count: {
              _all: true
            }
          }),
          prisma.progressNote.groupBy({
            by: ["activityInstanceId"],
            where: {
              activityInstanceId: {
                in: activityIds
              },
              type: "GROUP"
            },
            _count: {
              _all: true
            }
          })
        ])
      : [[], []];

    const attendanceByActivityId = includeStats
      ? new Map(attendanceCounts.map((entry) => [entry.activityInstanceId, entry._count._all ?? 0]))
      : null;
    const documentationByActivityId = includeStats
      ? new Map(
          documentationCounts
            .filter((entry): entry is typeof entry & { activityInstanceId: string } => Boolean(entry.activityInstanceId))
            .map((entry) => [entry.activityInstanceId, entry._count._all ?? 0])
        )
      : null;

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
        checklist: activity.checklist,
        adaptationsEnabled: activity.adaptationsEnabled,
        ...(includeStats
          ? {
              attendanceCount: attendanceByActivityId?.get(activity.id) ?? 0,
              attendanceTaken: (attendanceByActivityId?.get(activity.id) ?? 0) > 0,
              documentationCount: documentationByActivityId?.get(activity.id) ?? 0
            }
          : {})
      }))
    });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}
