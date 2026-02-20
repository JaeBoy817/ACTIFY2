import { auth, currentUser } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { asModuleFlags } from "@/lib/module-flags";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolveTimeZone } from "@/lib/timezone";

export class VolunteersApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "VolunteersApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asVolunteersApiErrorResponse(error: unknown) {
  if (error instanceof VolunteersApiError) {
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

  return Response.json({ error: "Unexpected volunteers API error." }, { status: 500 });
}

export async function requireVolunteersApiContext(options: { writable?: boolean } = {}) {
  const authState = await auth();
  let clerkUserId = authState.userId;

  if (!clerkUserId) {
    const fallback = await currentUser().catch(() => null);
    clerkUserId = fallback?.id ?? null;
  }

  if (!clerkUserId) {
    throw new VolunteersApiError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
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
    throw new VolunteersApiError("User not found", 404);
  }

  const flags = asModuleFlags(user.facility.moduleFlags);
  if (!flags.modules.volunteers) {
    throw new VolunteersApiError("Volunteers module is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new VolunteersApiError("Read-only role cannot modify volunteers.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    timeZone: resolveTimeZone(user.facility.timezone)
  };
}
