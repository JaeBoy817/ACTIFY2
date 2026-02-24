import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { asModuleFlags } from "@/lib/module-flags";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";

export class AttendanceTrackerApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "AttendanceTrackerApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asAttendanceTrackerApiErrorResponse(error: unknown) {
  if (error instanceof AttendanceTrackerApiError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ error: "Unexpected attendance API error." }, { status: 500 });
}

export async function requireAttendanceTrackerApiContext(options: { writable?: boolean } = {}) {
  const authState = await auth();
  let userId = authState.userId;

  // Fallback: in rare proxy/cookie edge cases, resolve the user from Clerk directly.
  if (!userId) {
    const fallbackUser = await currentUser().catch(() => null);
    userId = fallbackUser?.id ?? null;
  }

  if (!userId) {
    throw new AttendanceTrackerApiError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      facility: {
        select: {
          timezone: true,
          moduleFlags: true
        }
      }
    }
  });
  if (!user) {
    throw new AttendanceTrackerApiError("User not found", 404);
  }

  const flags = asModuleFlags(user.facility.moduleFlags);
  if (!flags.modules.calendar || !flags.modules.attendanceTracking) {
    throw new AttendanceTrackerApiError("Attendance tracker is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new AttendanceTrackerApiError("Read-only role cannot modify attendance.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    timeZone: getRequestTimeZone(user.facility.timezone)
  };
}
