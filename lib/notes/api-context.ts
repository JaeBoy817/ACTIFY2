import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { asModuleFlags } from "@/lib/module-flags";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export class NotesApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "NotesApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asNotesApiErrorResponse(error: unknown) {
  if (error instanceof NotesApiError) {
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

  return Response.json({ error: "Unexpected notes API error." }, { status: 500 });
}

export async function requireNotesApiContext(options: { writable?: boolean } = {}) {
  const { userId } = await auth();
  if (!userId) {
    throw new NotesApiError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      facility: {
        select: {
          moduleFlags: true
        }
      }
    }
  });

  if (!user) {
    throw new NotesApiError("User not found.", 404);
  }

  const modules = asModuleFlags(user.facility.moduleFlags).modules;
  if (!modules.notes) {
    throw new NotesApiError("Notes module is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new NotesApiError("Read-only role cannot modify notes.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role
  };
}
