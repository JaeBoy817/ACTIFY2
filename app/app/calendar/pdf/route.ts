import { auth } from "@clerk/nextjs/server";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";

import { asModuleFlags } from "@/lib/module-flags";
import { prisma } from "@/lib/prisma";
import { generateCalendarPdf, type CalendarPdfView } from "@/lib/calendar-pdf/calendar-export";
import { getEffectiveReportSettings } from "@/lib/settings/service";
import { resolveReportTheme } from "@/lib/report-pdf/ReportTheme";

export const runtime = "nodejs";

function parseDateParam(raw: string | null) {
  if (!raw) return undefined;
  const normalized = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : undefined;
}

function parseView(raw: string | null): CalendarPdfView {
  if (raw === "weekly" || raw === "monthly") return raw;
  return "daily";
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { facility: { select: { name: true, moduleFlags: true } } }
  });
  if (!user) return new Response("User not found", { status: 404 });

  const moduleFlags = asModuleFlags(user.facility?.moduleFlags);
  if (!moduleFlags.modules.calendar) {
    return new Response("Calendar module is disabled for this facility.", { status: 403 });
  }

  const url = new URL(req.url);
  const isPreview = url.searchParams.get("preview") === "1";
  const view = parseView(url.searchParams.get("view"));
  const now = new Date();

  const anchorDate =
    view === "daily"
      ? parseDateParam(url.searchParams.get("date")) ?? now
      : view === "weekly"
        ? parseDateParam(url.searchParams.get("weekStart")) ?? now
        : parseDateParam(url.searchParams.get("month")) ?? now;

  const rangeStart =
    view === "daily"
      ? startOfDay(anchorDate)
      : view === "weekly"
        ? startOfWeek(anchorDate, { weekStartsOn: 1 })
        : startOfMonth(anchorDate);

  const rangeEnd =
    view === "daily"
      ? endOfDay(anchorDate)
      : view === "weekly"
        ? endOfWeek(anchorDate, { weekStartsOn: 1 })
        : endOfMonth(anchorDate);

  const [activities, effectiveSettings] = await Promise.all([
    prisma.activityInstance.findMany({
      where: {
        facilityId: user.facilityId,
        startAt: {
          gte: rangeStart,
          lte: rangeEnd
        }
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        _count: {
          select: {
            attendance: true
          }
        }
      }
    }),
    getEffectiveReportSettings(user.facilityId)
  ]);

  const theme = resolveReportTheme({
    theme: effectiveSettings.reportSettings.theme,
    accent: effectiveSettings.reportSettings.accent
  });

  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const pdfBytes = await generateCalendarPdf(
    {
      view,
      anchorDate,
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        startAt: activity.startAt,
        endAt: activity.endAt,
        location: activity.location,
        attendanceCount: activity._count.attendance
      })),
      facilityName: user.facility?.name ?? "My Facility",
      generatedAt
    },
    theme,
    {
      paperSize: effectiveSettings.printDefaults.paperSize,
      margins: effectiveSettings.printDefaults.margins,
      includeFooterMeta: effectiveSettings.printDefaults.includeFooterMeta
    }
  );

  const dateToken = rangeStart.toISOString().slice(0, 10);
  const filename = `actify-calendar-${view}-${dateToken}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename=\"${filename}\"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0"
    }
  });
}
