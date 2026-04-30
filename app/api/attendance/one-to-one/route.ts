import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import { getAttendanceQuickTakeCacheTag, logOneToOneVisit } from "@/lib/attendance-tracker/service";

const logOneToOneSchema = z.object({
  residentId: z.string().trim().min(1),
  dateKey: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(240).optional().nullable(),
  activityProvided: z.string().trim().max(120).optional().nullable(),
  completed: z.boolean().optional().nullable(),
  incompleteStatus: z.enum(["Declined", "Unavailable"]).optional().nullable(),
  shortNote: z.string().trim().max(800).optional().nullable()
});

export async function POST(request: Request) {
  try {
    const context = await requireAttendanceTrackerApiContext({ writable: true });
    const body = await request.json().catch(() => null);
    const parsed = logOneToOneSchema.safeParse(body);

    if (!parsed.success) {
      throw new AttendanceTrackerApiError("Invalid 1:1 visit payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const result = await logOneToOneVisit({
      facilityId: context.facilityId,
      residentId: parsed.data.residentId,
      timeZone: context.timeZone,
      dateKey: parsed.data.dateKey,
      time: parsed.data.time,
      durationMinutes: parsed.data.durationMinutes,
      activityProvided: parsed.data.activityProvided,
      completed: parsed.data.completed,
      incompleteStatus: parsed.data.incompleteStatus,
      shortNote: parsed.data.shortNote
    });

    revalidatePath("/app/attendance");
    revalidatePath("/app/attendance/sessions");
    revalidatePath("/app/attendance/residents");
    revalidatePath("/app/attendance/reports");
    revalidatePath("/app/calendar");
    revalidateTag(getAttendanceQuickTakeCacheTag(context.facilityId));
    revalidateTag(getAttendanceQuickTakeCacheTag(context.facilityId, result.dateKey));

    return Response.json({
      ok: true,
      result
    });
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}
