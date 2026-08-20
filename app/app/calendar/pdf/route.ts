import { auth } from "@clerk/nextjs/server";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

import { asAppAccessErrorResponse, requireAppAccessForUser } from "@/lib/access-control";
import { getHolidaysForYear } from "@/lib/calendar/holidays";
import { asModuleFlags } from "@/lib/module-flags";
import { prisma } from "@/lib/prisma";
import { getRequestTimeZone } from "@/lib/request-timezone";
import {
  generateCalendarPdf,
  type CalendarPdfAudience,
  type CalendarPdfOrientation,
  type CalendarPdfPaperSize,
  type CalendarPdfView
} from "@/lib/calendar-pdf/calendar-export";
import { getEffectiveReportSettings } from "@/lib/settings/service";
import { resolveReportTheme } from "@/lib/report-pdf/ReportTheme";
import {
  endOfZonedDay,
  endOfZonedWeek,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift,
  startOfZonedWeek,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";

export const runtime = "nodejs";

function parseDateParam(raw: string | null, timeZone: string) {
  if (!raw) return undefined;
  const normalized = raw.trim();
  if (!normalized) return undefined;
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return zonedDateStringToUtcStart(`${normalized}-01`, timeZone) ?? undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return zonedDateStringToUtcStart(normalized, timeZone) ?? undefined;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function parseView(raw: string | null): CalendarPdfView {
  if (raw === "weekly" || raw === "monthly") return raw;
  return "daily";
}

function parseAudience(raw: string | null): CalendarPdfAudience {
  if (raw === "resident") return "resident";
  return "internal";
}

function parsePaperSize(raw: string | null): CalendarPdfPaperSize | undefined {
  if (raw === "LETTER" || raw === "A4" || raw === "LEGAL" || raw === "TABLOID") return raw;
  return undefined;
}

function parseOrientation(raw: string | null): CalendarPdfOrientation | undefined {
  if (raw === "portrait" || raw === "landscape") return raw;
  return undefined;
}

function publicResidentName(resident: { firstName: string; lastName: string; preferredName?: string | null }) {
  const first = (resident.preferredName || resident.firstName || "Resident").trim();
  const lastInitial = resident.lastName?.trim().charAt(0);
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { facility: { select: { name: true, moduleFlags: true, timezone: true } } }
  });
  if (!user) return new Response("User not found", { status: 404 });

  const accessResponse = await requireAppAccessForUser({
    id: user.id,
    clerkUserId: userId,
    email: user.email,
    facilityId: user.facilityId,
    role: user.role
  }).catch((error) => asAppAccessErrorResponse(error));
  if (accessResponse instanceof Response) {
    return accessResponse;
  }

  const moduleFlags = asModuleFlags(user.facility?.moduleFlags);
  if (!moduleFlags.modules.calendar) {
    return new Response("Calendar module is disabled for this facility.", { status: 403 });
  }

  const url = new URL(req.url);
  const isPreview = url.searchParams.get("preview") === "1";
  const audience = parseAudience(url.searchParams.get("audience"));
  const requestedView = parseView(url.searchParams.get("view"));
  const view: CalendarPdfView = audience === "resident" ? "monthly" : requestedView;
  const requestedPaperSize = parsePaperSize(url.searchParams.get("paperSize"));
  const requestedOrientation = parseOrientation(url.searchParams.get("orientation"));
  const timeZone = resolveTimeZone(getRequestTimeZone(user.facility?.timezone));
  const now = new Date();

  const anchorDate =
    view === "daily"
      ? parseDateParam(url.searchParams.get("date"), timeZone) ?? now
      : view === "weekly"
        ? parseDateParam(url.searchParams.get("weekStart"), timeZone) ?? now
        : parseDateParam(url.searchParams.get("month"), timeZone) ?? now;

  const rangeStart =
    view === "daily"
      ? startOfZonedDay(anchorDate, timeZone)
      : view === "weekly"
        ? startOfZonedWeek(anchorDate, timeZone, 1)
        : startOfZonedMonth(anchorDate, timeZone);

  const rangeEnd =
    view === "daily"
      ? endOfZonedDay(anchorDate, timeZone)
      : view === "weekly"
        ? endOfZonedWeek(anchorDate, timeZone, 1)
        : new Date(startOfZonedMonthShift(rangeStart, timeZone, 1).getTime() - 1);

  const shouldBuildResidentMonthData = audience === "resident" && view === "monthly";

  const residentMonthWindow = shouldBuildResidentMonthData
    ? (() => {
        const monthStart = startOfMonth(anchorDate);
        const monthEnd = endOfMonth(anchorDate);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return {
          gridStartDateKey: format(gridStart, "yyyy-MM-dd"),
          gridEndDateKey: format(gridEnd, "yyyy-MM-dd"),
          years: Array.from(new Set([gridStart.getFullYear(), gridEnd.getFullYear()]))
        };
      })()
    : null;

  const [activities, effectiveSettings, residentMonthData] = await Promise.all([
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
    getEffectiveReportSettings(user.facilityId),
    shouldBuildResidentMonthData
      ? prisma.resident.findMany({
          where: {
            facilityId: user.facilityId,
            birthDate: { not: null },
            isActive: true,
            status: { notIn: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            preferredName: true
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
        })
      : Promise.resolve([])
  ]);

  const theme = resolveReportTheme({
    theme: effectiveSettings.reportSettings.theme,
    accent: effectiveSettings.reportSettings.accent
  });

  const generatedAt = formatInTimeZone(new Date(), timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  const pdfBytes = await generateCalendarPdf(
    {
      view,
      audience,
      anchorDate,
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        startAt: activity.startAt,
        endAt: activity.endAt,
        location: activity.location,
        attendanceCount: activity._count.attendance,
        dateKey: zonedDateKey(activity.startAt, timeZone),
        startTimeLabel: formatInTimeZone(activity.startAt, timeZone, { hour: "numeric", minute: "2-digit" }),
        endTimeLabel: formatInTimeZone(activity.endAt, timeZone, { hour: "numeric", minute: "2-digit" })
      })),
      facilityName: user.facility?.name ?? "My Facility",
      generatedAt,
      residentMonthData: residentMonthWindow
        ? {
            holidays: residentMonthWindow.years
              .flatMap((year) => getHolidaysForYear(year))
              .filter(
                (holiday) =>
                  holiday.displayBadge &&
                  holiday.date >= residentMonthWindow.gridStartDateKey &&
                  holiday.date <= residentMonthWindow.gridEndDateKey
              )
              .map((holiday) => ({
                date: holiday.date,
                name: holiday.name,
                displayBadge: holiday.displayBadge
              })),
            birthdays: residentMonthData.map((resident) => ({
              residentId: resident.id,
              residentName: publicResidentName(resident),
              birthDate: resident.birthDate?.toISOString() ?? ""
            }))
          }
        : undefined
    },
    theme,
    {
      paperSize: requestedPaperSize ?? effectiveSettings.printDefaults.paperSize,
      orientation: requestedOrientation,
      margins: effectiveSettings.printDefaults.margins,
      includeFooterMeta: effectiveSettings.printDefaults.includeFooterMeta
    }
  );

  const dateToken = zonedDateKey(rangeStart, timeZone);
  const filename = audience === "resident"
    ? `actify-resident-calendar-${dateToken}.pdf`
    : `actify-calendar-${view}-${dateToken}.pdf`;

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
