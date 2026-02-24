import { auth } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

import { asModuleFlags } from "@/lib/module-flags";
import { canWrite } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";

export class BudgetStockApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "BudgetStockApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function asBudgetStockApiErrorResponse(error: unknown) {
  if (error instanceof BudgetStockApiError) {
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

  return Response.json({ error: "Unexpected budget/stock API error." }, { status: 500 });
}

export async function requireBudgetStockApiContext(options: { writable?: boolean } = {}) {
  const { userId } = await auth();
  if (!userId) {
    throw new BudgetStockApiError("Unauthorized", 401);
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
    throw new BudgetStockApiError("User not found", 404);
  }

  const modules = asModuleFlags(user.facility.moduleFlags);
  if (!modules.modules.inventory) {
    throw new BudgetStockApiError("Budget + Stock module is disabled.", 403);
  }

  if (options.writable && !canWrite(user.role as Role)) {
    throw new BudgetStockApiError("Read-only role cannot modify budget/stock data.", 403);
  }

  return {
    user,
    facilityId: user.facilityId,
    role: user.role,
    timezone: getRequestTimeZone(user.facility.timezone)
  };
}
