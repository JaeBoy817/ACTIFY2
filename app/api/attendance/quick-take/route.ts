import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import {
  getAttendanceQuickTakeCacheTag,
  getAttendanceQuickTakePayloadCached,
  saveAttendanceBatch,
  saveSimpleGroupAttendance
} from "@/lib/attendance-tracker/service";
import { QUICK_ATTENDANCE_CYCLE, type QuickAttendanceStatus } from "@/lib/attendance-tracker/status";

const saveSchema = z.object({
  sessionId: z.string().trim().min(1).optional().nullable(),
  activityName: z.string().trim().min(1).optional(),
  dateKey: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  activityType: z.enum(["Group", "1:1"]).optional().default("Group"),
  location: z.string().trim().max(120).optional().nullable(),
  entries: z.array(
    z.object({
      residentId: z.string().trim().min(1),
      status: z.enum(QUICK_ATTENDANCE_CYCLE),
      notes: z.string().trim().max(800).optional().nullable()
    })
  )
});

export async function GET(request: Request) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const sessionId = url.searchParams.get("sessionId");

    const payload = await getAttendanceQuickTakePayloadCached({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      dateKey: date,
      sessionId
    });

    return Response.json(payload);
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAttendanceTrackerApiContext({ writable: true });
    const body = await request.json().catch(() => null);
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      throw new AttendanceTrackerApiError("Invalid attendance payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const entries = parsed.data.entries as Array<{
      residentId: string;
      status: QuickAttendanceStatus;
      notes?: string | null;
    }>;

    if (!parsed.data.activityName && !parsed.data.sessionId) {
      throw new AttendanceTrackerApiError("Please enter an activity name.", 400);
    }

    const result = parsed.data.activityName
      ? await saveSimpleGroupAttendance({
          facilityId: context.facilityId,
          actorUserId: context.user.id,
          timeZone: context.timeZone,
          sessionId: parsed.data.sessionId,
          activityName: parsed.data.activityName,
          dateKey: parsed.data.dateKey ?? new Date().toISOString().slice(0, 10),
          time: parsed.data.time,
          activityType: parsed.data.activityType,
          location: parsed.data.location,
          entries
        })
      : await saveAttendanceBatch({
          facilityId: context.facilityId,
          sessionId: parsed.data.sessionId as string,
          actorUserId: context.user.id,
          entries
        });

    revalidatePath("/app/attendance");
    revalidatePath("/app/attendance/sessions");
    revalidatePath("/app/attendance/residents");
    revalidatePath("/app/calendar");
    revalidateTag(getAttendanceQuickTakeCacheTag(context.facilityId));

    return Response.json({
      ok: true,
      result
    });
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}
