import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { updateSeriesAndRefresh } from "@/lib/calendar/service";

const seriesPatchSchema = z.object({
  scope: z.enum(["series", "future"]).optional(),
  fromDate: z.string().datetime().optional(),
  title: z.string().min(2).max(200).optional(),
  location: z.string().min(1).max(160).nullable().optional(),
  templateId: z.string().nullable().optional(),
  dtstart: z.string().datetime().optional(),
  durationMin: z.number().int().min(5).max(24 * 60).optional(),
  rrule: z.string().min(6).max(200).optional(),
  until: z.string().datetime().nullable().optional(),
  timezone: z.string().min(1).max(80).optional(),
  checklist: z.any().optional(),
  adaptations: z.any().optional(),
  materializeHorizonDays: z.number().int().min(7).max(730).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const raw = await request.json();
    const parsed = seriesPatchSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CalendarApiError("Invalid series update payload.", 400, { details: parsed.error.flatten() });
    }

    const fromDate = parsed.data.fromDate ? new Date(parsed.data.fromDate) : undefined;

    const result = await updateSeriesAndRefresh({
      seriesId: params.id,
      facilityId: context.facilityId,
      fromDate,
      materializeHorizonDays: parsed.data.materializeHorizonDays,
      data: {
        title: parsed.data.title,
        location: parsed.data.location,
        templateId: parsed.data.templateId,
        dtstart: parsed.data.dtstart ? new Date(parsed.data.dtstart) : undefined,
        durationMin: parsed.data.durationMin,
        rrule: parsed.data.rrule,
        until: parsed.data.until === undefined ? undefined : parsed.data.until ? new Date(parsed.data.until) : null,
        timezone: parsed.data.timezone,
        checklist: parsed.data.checklist,
        adaptations: parsed.data.adaptations
      }
    });

    return Response.json({
      scope: parsed.data.scope ?? "series",
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
    });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}

