import { auth } from "@clerk/nextjs/server";

import { canExportMonthlyReport } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";
import { resolveReportTheme } from "@/lib/report-pdf/ReportTheme";
import { generateReportPdf } from "@/lib/report-pdf/monthly-report";
import { toReportPdfData } from "@/lib/report-pdf/transform";
import { getMonthlyReportData, parseMonthParam } from "@/lib/reports";
import { getEffectiveReportSettings } from "@/lib/settings/service";
import { formatInTimeZone } from "@/lib/timezone";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { facility: { select: { name: true, timezone: true } } }
  });
  if (!user) return new Response("User not found", { status: 404 });

  if (!canExportMonthlyReport(user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? undefined;
  const isPreview = url.searchParams.get("preview") === "1";
  const parsedMonth = parseMonthParam(month);
  const reportData = toReportPdfData(await getMonthlyReportData(user.facilityId, parsedMonth));
  const effectiveSettings = await getEffectiveReportSettings(user.facilityId);
  const theme = resolveReportTheme({
    theme: effectiveSettings.reportSettings.theme,
    accent: effectiveSettings.reportSettings.accent
  });

  const timeZone = getRequestTimeZone(user.facility?.timezone);
  const generatedAt = formatInTimeZone(new Date(), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const pdfBytes = await generateReportPdf(reportData, theme, {
    facilityName: user.facility?.name ?? "My Facility",
    generatedAt,
    engagementWeights: effectiveSettings.attendanceRules.engagementWeights,
    includeSections: effectiveSettings.reportSettings.includeSections,
    paperSize: effectiveSettings.printDefaults.paperSize,
    margins: effectiveSettings.printDefaults.margins,
    includeFooterMeta: effectiveSettings.printDefaults.includeFooterMeta
  });

  const filename = `actify-report-${month ?? "monthly"}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0"
    }
  });
}
