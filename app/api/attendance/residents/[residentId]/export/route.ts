import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import { getResidentAttendanceSummary } from "@/lib/attendance-tracker/service";

function toCsv(summary: NonNullable<Awaited<ReturnType<typeof getResidentAttendanceSummary>>>) {
  const lines = [
    ["Resident", summary.resident.name].join(","),
    ["Room", summary.resident.room].join(","),
    ["Status", summary.resident.status].join(","),
    "",
    "Metric,Last 7 Days,Last 30 Days",
    ["Present", summary.summary7.present, summary.summary30.present].join(","),
    ["Refused", summary.summary7.refused, summary.summary30.refused].join(","),
    ["Asleep", summary.summary7.asleep, summary.summary30.asleep].join(","),
    ["Out of Room", summary.summary7.outOfRoom, summary.summary30.outOfRoom].join(","),
    ["1:1 Completed", summary.summary7.oneToOne, summary.summary30.oneToOne].join(","),
    ["Not Applicable", summary.summary7.notApplicable, summary.summary30.notApplicable].join(","),
    "",
    "Recent Sessions",
    "Date,Activity,Location,Status,Notes"
  ];

  for (const row of summary.sessions) {
    lines.push(
      [
        `"${row.dateLabel.replaceAll('"', '""')}"`,
        `"${row.title.replaceAll('"', '""')}"`,
        `"${(row.location ?? "").replaceAll('"', '""')}"`,
        `"${row.status}"`,
        `"${(row.notes ?? "").replaceAll('"', '""')}"`
      ].join(",")
    );
  }

  return lines.join("\n");
}

export async function GET(
  _request: Request,
  { params }: { params: { residentId: string } }
) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const summary = await getResidentAttendanceSummary({
      facilityId: context.facilityId,
      residentId: params.residentId,
      timeZone: context.timeZone
    });
    if (!summary) {
      throw new AttendanceTrackerApiError("Resident not found.", 404);
    }

    const csv = toCsv(summary);
    const filename = `attendance-resident-${summary.resident.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}

