import { z } from "zod";

import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import { getMonthlyAttendanceReport } from "@/lib/attendance-tracker/service";
import { endOfZonedDay, startOfZonedMonth, zonedDateStringToUtcStart } from "@/lib/timezone";

const querySchema = z.object({
  month: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
  format: z.enum(["json", "csv"]).optional()
});

function toMonthStart(month: string, timeZone: string) {
  const dateStart = zonedDateStringToUtcStart(`${month}-01`, timeZone);
  if (!dateStart) return startOfZonedMonth(new Date(), timeZone);
  return dateStart;
}

function toCsv(data: {
  monthKey: string;
  totals: Record<string, number>;
  totalEntries: number;
  daily: Array<{ dateKey: string; total: number }>;
  sessions: Array<{ title: string; dateKey: string; present: number; refused: number; noShowLike: number; oneToOne: number }>;
}) {
  const lines = [
    `Month,${data.monthKey}`,
    `Total Entries,${data.totalEntries}`,
    `Present,${data.totals.present}`,
    `Refused,${data.totals.refused}`,
    `Asleep,${data.totals.asleep}`,
    `Out of Room,${data.totals.outOfRoom}`,
    `1:1 Completed,${data.totals.oneToOne}`,
    `Not Applicable,${data.totals.notApplicable}`,
    "",
    "Daily Totals",
    "Date,Total",
    ...data.daily.map((row) => `${row.dateKey},${row.total}`),
    "",
    "Session Breakdown",
    "Date,Title,Present,Refused,No Show-like,1:1 Completed",
    ...data.sessions.map((row) =>
      [
        row.dateKey,
        `"${row.title.replaceAll('"', '""')}"`,
        row.present,
        row.refused,
        row.noShowLike,
        row.oneToOne
      ].join(",")
    )
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      month: url.searchParams.get("month") ?? undefined,
      format: url.searchParams.get("format") ?? undefined
    });
    if (!parsed.success) {
      throw new AttendanceTrackerApiError("Invalid report query.", 400, {
        details: parsed.error.flatten()
      });
    }

    const monthStart = parsed.data.month ? toMonthStart(parsed.data.month, context.timeZone) : startOfZonedMonth(new Date(), context.timeZone);
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const monthEnd = endOfZonedDay(new Date(nextMonth.getTime() - 1), context.timeZone);
    const data = await getMonthlyAttendanceReport({
      facilityId: context.facilityId,
      timeZone: context.timeZone,
      monthStart,
      monthEnd
    });

    if (parsed.data.format === "csv") {
      return new Response(toCsv(data), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendance-summary-${data.monthKey}.csv"`
        }
      });
    }

    return Response.json(data);
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}
