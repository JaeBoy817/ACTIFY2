import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import {
  formatActivityTimeLabel,
  fromAttendanceRow,
  getWorkflowWindow,
  inferActivityCategory,
  inferParticipationTrend,
  parseDateKeyForWorkflow,
  parseWorkflowTimeframe,
  summarizeAttendance,
  toAttendanceRow,
  WORKFLOW_ATTENDANCE_STATUS_VALUES
} from "@/lib/attendance-tracker/resident-workflow.server";
import { getAttendanceQuickTakeCacheTag } from "@/lib/attendance-tracker/service";
import { prisma } from "@/lib/prisma";
import { endOfZonedDay, formatInTimeZone, zonedDateKey } from "@/lib/timezone";

const saveSchema = z.object({
  date: z.string().trim().optional(),
  entries: z
    .array(
      z.object({
        activityId: z.string().trim().optional().nullable(),
        activityTitle: z.string().trim().max(160).optional().nullable(),
        time: z.string().trim().max(32).optional().nullable(),
        location: z.string().trim().max(160).optional().nullable(),
        category: z.string().trim().max(80).optional().nullable(),
        status: z.enum(WORKFLOW_ATTENDANCE_STATUS_VALUES),
        note: z.string().trim().max(600).optional().nullable(),
        source: z.enum(["calendar", "manual", "residents-tab", "imported"]).optional().nullable()
      })
    )
    .min(1)
});

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

async function requireResident(facilityId: string, residentId: string) {
  const resident = await prisma.resident.findFirst({
    where: {
      id: residentId,
      facilityId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      status: true
    }
  });

  if (!resident) {
    throw new AttendanceTrackerApiError("Resident not found.", 404);
  }

  return resident;
}

async function buildWorkflowPayload(params: {
  facilityId: string;
  residentId: string;
  timeZone: string;
  timeframe: ReturnType<typeof parseWorkflowTimeframe>;
  selectedDate: string | null | undefined;
}) {
  const resident = await requireResident(params.facilityId, params.residentId);
  const window = getWorkflowWindow(params.timeZone, params.timeframe);
  const selectedDayStart = parseDateKeyForWorkflow(params.selectedDate, params.timeZone);
  const selectedDayEnd = endOfZonedDay(selectedDayStart, params.timeZone);
  const selectedDateKey = zonedDateKey(selectedDayStart, params.timeZone);

  const [currentRows, previousRows, dayActivities] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        residentId: resident.id,
        activityInstance: {
          facilityId: params.facilityId,
          startAt: {
            gte: window.startAt,
            lte: window.endAt
          }
        }
      },
      orderBy: {
        activityInstance: {
          startAt: "desc"
        }
      },
      select: {
        id: true,
        status: true,
        barrierReason: true,
        notes: true,
        activityInstance: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            location: true
          }
        }
      }
    }),
    prisma.attendance.findMany({
      where: {
        residentId: resident.id,
        activityInstance: {
          facilityId: params.facilityId,
          startAt: {
            gte: window.previousStartAt,
            lte: window.previousEndAt
          }
        }
      },
      select: {
        status: true,
        barrierReason: true,
        notes: true,
        activityInstance: {
          select: {
            startAt: true
          }
        }
      }
    }),
    prisma.activityInstance.findMany({
      where: {
        facilityId: params.facilityId,
        startAt: {
          gte: selectedDayStart,
          lte: selectedDayEnd
        }
      },
      orderBy: {
        startAt: "asc"
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        attendance: {
          where: {
            residentId: resident.id
          },
          select: {
            status: true,
            barrierReason: true,
            notes: true
          },
          take: 1
        }
      }
    })
  ]);

  const currentSummary = summarizeAttendance(
    currentRows.map((row) => ({
      status: row.status,
      barrierReason: row.barrierReason,
      notes: row.notes,
      activityStartAt: row.activityInstance.startAt
    }))
  );
  const previousSummary = summarizeAttendance(
    previousRows.map((row) => ({
      status: row.status,
      barrierReason: row.barrierReason,
      notes: row.notes,
      activityStartAt: row.activityInstance.startAt
    }))
  );

  const records = currentRows.map((row) => {
    const mapped = fromAttendanceRow({
      status: row.status,
      barrierReason: row.barrierReason,
      notes: row.notes
    });

    return {
      id: row.id,
      activityId: row.activityInstance.id,
      activityTitle: row.activityInstance.title,
      date: zonedDateKey(row.activityInstance.startAt, params.timeZone),
      timeLabel: formatActivityTimeLabel(row.activityInstance.startAt, row.activityInstance.endAt, params.timeZone),
      location: row.activityInstance.location || null,
      category: inferActivityCategory(row.activityInstance.title),
      status: mapped.status,
      note: mapped.note,
      countsTowardParticipation: mapped.countsTowardParticipation
    };
  });

  const dayActivityRows = dayActivities.map((activity) => {
    const entry = activity.attendance[0];
    const mapped = entry
      ? fromAttendanceRow({
          status: entry.status,
          barrierReason: entry.barrierReason,
          notes: entry.notes
        })
      : null;

    return {
      activityId: activity.id,
      activityTitle: activity.title,
      startAt: activity.startAt.toISOString(),
      endAt: activity.endAt.toISOString(),
      timeLabel: formatActivityTimeLabel(activity.startAt, activity.endAt, params.timeZone),
      location: activity.location || null,
      category: inferActivityCategory(activity.title),
      status: mapped?.status ?? null,
      note: mapped?.note ?? null
    };
  });

  return {
    ok: true as const,
    resident: {
      id: resident.id,
      fullName: `${resident.firstName} ${resident.lastName}`.trim(),
      room: resident.room,
      status: resident.status
    },
    timeframe: params.timeframe,
    selectedDate: selectedDateKey,
    summary: {
      timeframe: params.timeframe,
      rangeStart: window.startAt.toISOString(),
      rangeEnd: window.endAt.toISOString(),
      ...currentSummary,
      previousParticipationPercentage: previousSummary.participationPercentage,
      trend: inferParticipationTrend(
        currentSummary.participationPercentage,
        previousSummary.participationPercentage
      )
    },
    records,
    dayActivities: dayActivityRows
  };
}

export async function GET(request: Request, { params }: { params: { residentId: string } }) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const url = new URL(request.url);
    const timeframe = parseWorkflowTimeframe(url.searchParams.get("timeframe"));
    const selectedDate = url.searchParams.get("date");

    const payload = await buildWorkflowPayload({
      facilityId: context.facilityId,
      residentId: params.residentId,
      timeZone: context.timeZone,
      timeframe,
      selectedDate
    });

    return Response.json(payload);
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: { residentId: string } }) {
  try {
    const context = await requireAttendanceTrackerApiContext({ writable: true });
    const resident = await requireResident(context.facilityId, params.residentId);
    const payload = await request.json().catch(() => null);
    const parsed = saveSchema.safeParse(payload);
    if (!parsed.success) {
      throw new AttendanceTrackerApiError("Invalid attendance payload.", 400, {
        details: parsed.error.flatten()
      });
    }

    const timeframe = parseWorkflowTimeframe(new URL(request.url).searchParams.get("timeframe"));
    const selectedDayStart = parseDateKeyForWorkflow(parsed.data.date ?? null, context.timeZone);

    const providedActivityIds = Array.from(
      new Set(parsed.data.entries.map((entry) => entry.activityId).filter((entry): entry is string => Boolean(entry)))
    );

    const activityMap = new Map<string, { id: string }>();
    if (providedActivityIds.length > 0) {
      const activities = await prisma.activityInstance.findMany({
        where: {
          id: {
            in: providedActivityIds
          },
          facilityId: context.facilityId
        },
        select: {
          id: true
        }
      });
      for (const activity of activities) {
        activityMap.set(activity.id, activity);
      }

      const missingIds = providedActivityIds.filter((id) => !activityMap.has(id));
      if (missingIds.length > 0) {
        throw new AttendanceTrackerApiError("One or more activity entries are no longer available.", 400, {
          details: { missingIds }
        });
      }
    }

    const writes = parsed.data.entries.map(async (entry) => {
      let activityInstanceId = entry.activityId || null;

      if (!activityInstanceId) {
        const defaultMinutes = entry.status === "one_to_one_completed" ? 11 * 60 + 30 : 14 * 60;
        const parsedMinutes = parseTimeToMinutes(entry.time ?? null);
        const minutes = parsedMinutes ?? defaultMinutes;
        const startAt = new Date(selectedDayStart.getTime() + minutes * 60 * 1000);
        const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);

        const createdActivity = await prisma.activityInstance.create({
          data: {
            facilityId: context.facilityId,
            title:
              entry.activityTitle?.trim() ||
              (entry.status === "one_to_one_completed" ? "1:1 Room Visit" : "Manual Attendance Entry"),
            startAt,
            endAt,
            location: entry.location?.trim() || (entry.status === "one_to_one_completed" ? "Resident Room" : "Activity Room"),
            adaptationsEnabled: {},
            checklist: {},
            isOverride: true
          },
          select: {
            id: true
          }
        });

        activityInstanceId = createdActivity.id;
      }

      const mapped = toAttendanceRow(entry.status, entry.note ?? null);
      await prisma.attendance.upsert({
        where: {
          activityInstanceId_residentId: {
            activityInstanceId,
            residentId: resident.id
          }
        },
        update: {
          status: mapped.status,
          barrierReason: mapped.barrierReason,
          notes: mapped.notes
        },
        create: {
          activityInstanceId,
          residentId: resident.id,
          status: mapped.status,
          barrierReason: mapped.barrierReason,
          notes: mapped.notes
        }
      });
    });

    await Promise.all(writes);

    revalidatePath("/residents");
    revalidatePath("/app/residents");
    revalidatePath("/app/attendance");
    revalidatePath("/app/attendance/sessions");
    revalidateTag(getAttendanceQuickTakeCacheTag(context.facilityId));

    const refreshed = await buildWorkflowPayload({
      facilityId: context.facilityId,
      residentId: resident.id,
      timeZone: context.timeZone,
      timeframe,
      selectedDate: parsed.data.date ?? zonedDateKey(selectedDayStart, context.timeZone)
    });

    return Response.json({
      ...refreshed,
      savedCount: parsed.data.entries.length,
      savedAt: formatInTimeZone(new Date(), context.timeZone, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    });
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}
