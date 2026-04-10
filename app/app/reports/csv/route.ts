import { auth } from "@clerk/nextjs/server";

import { asAppAccessErrorResponse, requireAppAccessForUser } from "@/lib/access-control";
import { canExportMonthlyReport } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getMonthlyReportData, parseMonthParam, toCsv } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      clerkUserId: true,
      email: true,
      facilityId: true,
      role: true
    }
  });
  if (!user) return new Response("User not found", { status: 404 });

  const accessResponse = await requireAppAccessForUser(user).catch((error) => asAppAccessErrorResponse(error));
  if (accessResponse instanceof Response) {
    return accessResponse;
  }

  if (!canExportMonthlyReport(user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? undefined;

  const report = await getMonthlyReportData(user.facilityId, parseMonthParam(month));
  const csv = toCsv(report);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="actify-report-${month ?? "monthly"}.csv"`
    }
  });
}
