import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { CalendarConflictError, createActivityWithChecks, createSeriesWithChecks } from "@/lib/calendar/service";

const recurrencePayloadSchema = z
  .object({
    freq: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    interval: z.number().int().min(1).max(365).default(1),
    byDay: z.array(z.enum(["SU", "MO", "TU", "WE", "TH", "FR", "SA"])).optional(),
    count: z.number().int().min(1).max(3650).optional(),
    until: z.string().datetime().optional(),
    timezone: z.string().min(1).optional()
  })
  .optional();

const createActivityPayloadSchema = z.object({
  title: z.string().min(2).max(200),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  location: z.string().min(1).max(160).optional(),
  checklist: z.any().optional(),
  adaptationsEnabled: z.any().optional(),
  templateId: z.string().optional(),
  allowConflictOverride: z.boolean().optional(),
  allowOutsideBusinessHoursOverride: z.boolean().optional(),
  recurrence: recurrencePayloadSchema
});

function buildRRule(payload: NonNullable<z.infer<typeof recurrencePayloadSchema>>) {
  const parts = [`FREQ=${payload.freq}`, `INTERVAL=${payload.interval}`];
  if (payload.byDay && payload.byDay.length > 0) {
    parts.push(`BYDAY=${payload.byDay.join(",")}`);
  }
  if (payload.count) {
    parts.push(`COUNT=${payload.count}`);
  }
  if (payload.until) {
    parts.push(`UNTIL=${payload.until.replace(/[-:]/g, "").replace(".000", "").replace(".000Z", "Z")}`);
  }
  return parts.join(";");
}

export async function POST(request: Request) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const raw = await request.json();
    const parsed = createActivityPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CalendarApiError("Invalid create activity payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new CalendarApiError("Invalid activity date payload.", 400);
    }

    if (parsed.data.recurrence) {
      const recurrence = parsed.data.recurrence;
      const result = await createSeriesWithChecks({
        facilityId: context.facilityId,
        title: parsed.data.title,
        location: parsed.data.location,
        templateId: parsed.data.templateId ?? null,
        dtstart: startAt,
        durationMin: Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
        rrule: buildRRule(recurrence),
        until: recurrence.until ? new Date(recurrence.until) : null,
        timezone: recurrence.timezone ?? context.timezone,
        checklist: parsed.data.checklist,
        adaptations: parsed.data.adaptationsEnabled,
        allowConflictOverride: parsed.data.allowConflictOverride,
        allowOutsideBusinessHoursOverride: parsed.data.allowOutsideBusinessHoursOverride
      });

      return Response.json(
        {
          mode: "series",
          series: {
            id: result.series.id,
            title: result.series.title,
            dtstart: result.series.dtstart.toISOString(),
            durationMin: result.series.durationMin,
            rrule: result.series.rrule,
            until: result.series.until?.toISOString() ?? null,
            timezone: result.series.timezone
          },
          materialized: result.materialized
        },
        { status: 201 }
      );
    }

    const activity = await createActivityWithChecks({
      facilityId: context.facilityId,
      title: parsed.data.title,
      startAt,
      endAt,
      location: parsed.data.location,
      templateId: parsed.data.templateId ?? null,
      checklist: parsed.data.checklist,
      adaptationsEnabled: parsed.data.adaptationsEnabled,
      allowConflictOverride: parsed.data.allowConflictOverride,
      allowOutsideBusinessHoursOverride: parsed.data.allowOutsideBusinessHoursOverride
    });

    return Response.json(
      {
        mode: "single",
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
      },
      { status: 201 }
    );
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

