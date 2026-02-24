import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";

export class ResidentsApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "ResidentsApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asResidentsApiErrorResponse(error: unknown) {
  if (error instanceof ResidentsApiError) {
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

  return Response.json({ error: "Unexpected residents API error." }, { status: 500 });
}

export async function requireResidentsApiContext(options: { writable?: boolean } = {}) {
  const { userId } = await auth();
  if (!userId) {
    throw new ResidentsApiError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      facility: {
        select: {
          id: true,
          timezone: true
        }
      }
    }
  });

  if (!user) {
    throw new ResidentsApiError("User not found", 404);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new ResidentsApiError("Read-only role cannot modify residents.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    timezone: getRequestTimeZone(user.facility.timezone)
  };
}
