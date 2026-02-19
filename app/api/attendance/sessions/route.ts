import { z } from "zod";

import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import { getAttendanceSessionsHistory } from "@/lib/attendance-tracker/service";

const querySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  activity: z.string().trim().optional(),
  location: z.string().trim().optional(),
  hasNotes: z.enum(["all", "yes", "no"]).optional()
});

export async function GET(request: Request) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      activity: url.searchParams.get("activity") ?? undefined,
      location: url.searchParams.get("location") ?? undefined,
      hasNotes: url.searchParams.get("hasNotes") ?? undefined
    });
    if (!parsed.success) {
      throw new AttendanceTrackerApiError("Invalid sessions filter payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const hasNotesFilter = parsed.data.hasNotes === "yes" ? true : parsed.data.hasNotes === "no" ? false : undefined;

    const data = await getAttendanceSessionsHistory({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      from: parsed.data.from,
      to: parsed.data.to,
      activityQuery: parsed.data.activity,
      location: parsed.data.location,
      hasNotes: hasNotesFilter
    });

    return Response.json(data);
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}

