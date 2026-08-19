import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { AppAccessError, requireAppAccessForUser } from "@/lib/access-control";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { asModuleFlags } from "@/lib/module-flags";
import { isNextControlFlowError } from "@/lib/next-control-flow";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/permissions";
import { getRequestTimeZone } from "@/lib/request-timezone";

export class CalendarApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "CalendarApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asCalendarApiErrorResponse(error: unknown) {
  if (isNextControlFlowError(error)) throw error;

  if (error instanceof CalendarApiError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.status }
    );
  }

  if (isDatabaseConnectionError(error)) {
    console.error("[calendar] database unavailable", error);
    return Response.json(
      {
        error: "Calendar data is temporarily unavailable because Actify could not reach the database."
      },
      { status: 503 }
    );
  }

  if (error instanceof Error) {
    console.error("[calendar] unexpected API error", error);
    return Response.json({ error: "Unexpected calendar API error." }, { status: 500 });
  }

  return Response.json({ error: "Unexpected calendar API error." }, { status: 500 });
}

export async function requireCalendarApiContext(options: { writable?: boolean } = {}) {
  const { userId } = await auth();
  if (!userId) {
    throw new CalendarApiError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      facility: {
        select: {
          id: true,
          timezone: true,
          moduleFlags: true
        }
      }
    }
  });

  if (!user) {
    throw new CalendarApiError("User not found", 404);
  }

  try {
    await requireAppAccessForUser(user);
  } catch (error) {
    if (error instanceof AppAccessError) {
      throw new CalendarApiError(error.message, error.status, {
        code: error.code
      });
    }
    throw error;
  }

  const modules = asModuleFlags(user.facility.moduleFlags);
  if (!modules.modules.calendar) {
    throw new CalendarApiError("Calendar module is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new CalendarApiError("Read-only role cannot modify calendar data.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    timezone: getRequestTimeZone(user.facility.timezone)
  };
}
