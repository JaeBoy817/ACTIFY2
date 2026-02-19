import {
  asAttendanceTrackerApiErrorResponse,
  AttendanceTrackerApiError,
  requireAttendanceTrackerApiContext
} from "@/lib/attendance-tracker/api-context";
import { getAttendanceSessionDetail } from "@/lib/attendance-tracker/service";

export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const context = await requireAttendanceTrackerApiContext();
    const detail = await getAttendanceSessionDetail({
      facilityId: context.facilityId,
      sessionId: params.sessionId,
      timeZone: context.timeZone
    });
    if (!detail) {
      throw new AttendanceTrackerApiError("Attendance session not found.", 404);
    }
    return Response.json(detail);
  } catch (error) {
    return asAttendanceTrackerApiErrorResponse(error);
  }
}

