import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import { getResidentAttendanceSummary } from "@/lib/attendance-tracker/service";

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
    return Response.json(summary);
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}

