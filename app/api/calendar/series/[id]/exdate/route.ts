import { z } from "zod";

import { asCalendarApiErrorResponse, CalendarApiError, requireCalendarApiContext } from "@/lib/calendar/api-context";
import { addSeriesExdate } from "@/lib/calendar/service";

const exdatePayloadSchema = z.object({
  occurrenceStartAt: z.string().datetime()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = await requireCalendarApiContext({ writable: true });
    const raw = await request.json();
    const parsed = exdatePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CalendarApiError("Invalid exdate payload.", 400, { details: parsed.error.flatten() });
    }

    const result = await addSeriesExdate({
      seriesId: params.id,
      facilityId: context.facilityId,
      occurrenceStartAt: new Date(parsed.data.occurrenceStartAt)
    });

    return Response.json({
      skipped: true,
      occurrenceKey: result.occurrenceKey,
      seriesId: result.series.id,
      exdatesCount: Array.isArray(result.series.exdates) ? result.series.exdates.length : 0
    });
  } catch (error) {
    return asCalendarApiErrorResponse(error);
  }
}

