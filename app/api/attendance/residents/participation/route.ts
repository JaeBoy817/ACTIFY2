import {
  asAttendanceTrackerApiErrorResponse,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import {
  getWorkflowWindow,
  inferParticipationTrend,
  parseWorkflowTimeframe,
  summarizeAttendance
} from "@/lib/attendance-tracker/resident-workflow.server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const url = new URL(request.url);
    const timeframe = parseWorkflowTimeframe(url.searchParams.get("timeframe"));
    const window = getWorkflowWindow(context.timeZone, timeframe);

    const [residentRows, currentRows, previousRows] = await Promise.all([
      prisma.resident.findMany({
        where: {
          facilityId: context.facilityId
        },
        select: {
          id: true
        }
      }),
      prisma.attendance.findMany({
        where: {
          resident: {
            facilityId: context.facilityId
          },
          activityInstance: {
            startAt: {
              gte: window.startAt,
              lte: window.endAt
            }
          }
        },
        select: {
          residentId: true,
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
      prisma.attendance.findMany({
        where: {
          resident: {
            facilityId: context.facilityId
          },
          activityInstance: {
            startAt: {
              gte: window.previousStartAt,
              lte: window.previousEndAt
            }
          }
        },
        select: {
          residentId: true,
          status: true,
          barrierReason: true,
          notes: true,
          activityInstance: {
            select: {
              startAt: true
            }
          }
        }
      })
    ]);

    const currentByResident = new Map<string, typeof currentRows>();
    for (const row of currentRows) {
      const list = currentByResident.get(row.residentId) ?? [];
      list.push(row);
      currentByResident.set(row.residentId, list);
    }

    const previousByResident = new Map<string, typeof previousRows>();
    for (const row of previousRows) {
      const list = previousByResident.get(row.residentId) ?? [];
      list.push(row);
      previousByResident.set(row.residentId, list);
    }

    const summaries = residentRows.map((resident) => {
      const currentSummary = summarizeAttendance(
        (currentByResident.get(resident.id) ?? []).map((row) => ({
          status: row.status,
          barrierReason: row.barrierReason,
          notes: row.notes,
          activityStartAt: row.activityInstance.startAt
        }))
      );
      const previousSummary = summarizeAttendance(
        (previousByResident.get(resident.id) ?? []).map((row) => ({
          status: row.status,
          barrierReason: row.barrierReason,
          notes: row.notes,
          activityStartAt: row.activityInstance.startAt
        }))
      );

      return {
        residentId: resident.id,
        ...currentSummary,
        previousParticipationPercentage: previousSummary.participationPercentage,
        trend: inferParticipationTrend(
          currentSummary.participationPercentage,
          previousSummary.participationPercentage
        )
      };
    });

    return Response.json({
      ok: true,
      timeframe,
      rangeStart: window.startAt.toISOString(),
      rangeEnd: window.endAt.toISOString(),
      summaries
    });
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}
