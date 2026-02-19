import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { asModuleFlags } from "@/lib/module-flags";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export class TemplatesApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "TemplatesApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asTemplatesApiErrorResponse(error: unknown) {
  if (error instanceof TemplatesApiError) {
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

  return Response.json({ error: "Unexpected templates API error." }, { status: 500 });
}

export async function requireTemplatesApiContext(options: { writable?: boolean } = {}) {
  const { userId } = await auth();
  if (!userId) {
    throw new TemplatesApiError("Unauthorized", 401);
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
    throw new TemplatesApiError("User not found", 404);
  }

  const modules = asModuleFlags(user.facility.moduleFlags);
  if (!modules.modules.templates) {
    throw new TemplatesApiError("Templates module is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new TemplatesApiError("Read-only role cannot modify templates.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    timezone: user.facility.timezone
  };
}

