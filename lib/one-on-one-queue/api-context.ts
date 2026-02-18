import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { asModuleFlags } from "@/lib/module-flags";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export class OneOnOneQueueApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "OneOnOneQueueApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asOneOnOneQueueApiErrorResponse(error: unknown) {
  if (error instanceof OneOnOneQueueApiError) {
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

  return Response.json({ error: "Unexpected 1:1 queue API error." }, { status: 500 });
}

export async function requireOneOnOneQueueApiContext(options: { writable?: boolean } = {}) {
  const { userId } = await auth();
  if (!userId) {
    throw new OneOnOneQueueApiError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      facility: {
        select: {
          id: true,
          moduleFlags: true
        }
      }
    }
  });

  if (!user) {
    throw new OneOnOneQueueApiError("User not found", 404);
  }

  const modules = asModuleFlags(user.facility.moduleFlags);
  if (!modules.modules.notes) {
    throw new OneOnOneQueueApiError("Notes module is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new OneOnOneQueueApiError("Read-only role cannot modify 1:1 queue data.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role
  };
}
