import { AlertTriangle } from "lucide-react";

import { AttendanceTrackerPageShell } from "@/components/attendance/AttendanceTrackerPageShell";
import { getAttendanceQuickTakePayload, getAttendanceTrackerSummary } from "@/lib/attendance-tracker/service";
import type {
  AttendanceQuickTakePayload,
  AttendanceTrackerReportSummary,
  AttendanceTrackerSummary
} from "@/lib/attendance-tracker/types";
import { isNextControlFlowError } from "@/lib/next-control-flow";
import { requireModulePage } from "@/lib/page-guards";
import { canWrite } from "@/lib/permissions";
import {
  endOfZonedWeek,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedMonth,
  startOfZonedMonthShift,
  startOfZonedWeek,
  zonedDateKey
} from "@/lib/timezone";

function emptyQuickTakePayload(dateKey: string): AttendanceQuickTakePayload {
  return {
    dateKey,
    sessions: [],
    selectedSessionId: null,
    residents: [],
    entriesByResidentId: {}
  };
}

function emptyReportSummary(params: {
  title: string;
  dateRangeLabel: string;
  generatedLabel: string;
  summaryText: string;
}): AttendanceTrackerReportSummary {
  return {
    title: params.title,
    dateRangeLabel: params.dateRangeLabel,
    generatedLabel: params.generatedLabel,
    summaryText: params.summaryText,
    totalActiveResidents: 0,
    participatedResidentCount: 0,
    notSeenResidentCount: 0,
    participationPercent: 0,
    groupCheckIns: 0,
    oneToOneVisits: 0,
    declined: 0,
    unavailable: 0,
    groupSessionCount: 0
  };
}

function emptyAttendanceSummary(timeZoneInput?: string | null): AttendanceTrackerSummary {
  const timeZone = resolveTimeZone(timeZoneInput);
  const now = new Date();
  const dateKey = zonedDateKey(now, timeZone);
  const weekStart = startOfZonedWeek(now, timeZone, 0);
  const weekEnd = endOfZonedWeek(now, timeZone, 0);
  const monthStart = startOfZonedMonth(now, timeZone);
  const nextMonthStart = startOfZonedMonthShift(now, timeZone, 1);
  const monthEnd = new Date(nextMonthStart.getTime() - 1);
  const dayLabel = formatInTimeZone(now, timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const weekLabel = `${formatInTimeZone(weekStart, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })} - ${formatInTimeZone(weekEnd, timeZone, { month: "short", day: "numeric", year: "numeric" })}`;
  const monthLabel = formatInTimeZone(now, timeZone, { month: "long", year: "numeric" });
  const generatedAt = formatInTimeZone(now, timeZone, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const unavailableSummary =
    "Attendance data is temporarily unavailable because Actify could not reach the attendance database.";
  const emptyRange = {
    participationPercent: 0,
    participatedResidentCount: 0,
    activeResidentCount: 0,
    groupAttendanceCount: 0,
    oneToOneVisitCount: 0,
    totalParticipationMarks: 0
  };

  return {
    dateKey,
    dayLabel,
    weekLabel,
    monthLabel,
    generatedAt,
    activeResidentCount: 0,
    daily: {
      ...emptyRange,
      startDateKey: dateKey,
      endDateKey: dateKey
    },
    weekly: {
      ...emptyRange,
      startDateKey: zonedDateKey(weekStart, timeZone),
      endDateKey: zonedDateKey(weekEnd, timeZone)
    },
    monthly: {
      ...emptyRange,
      startDateKey: zonedDateKey(monthStart, timeZone),
      endDateKey: zonedDateKey(monthEnd, timeZone)
    },
    residentsNotSeenThisWeek: [],
    residentsNotSeenThisMonth: [],
    stateReadySummary: `As of ${dayLabel}, attendance statistics are temporarily unavailable because Actify could not reach the attendance database.`,
    recentOneToOneVisits: [],
    reports: {
      daily: {
        summary: emptyReportSummary({
          title: "Daily Attendance Report",
          dateRangeLabel: dayLabel,
          generatedLabel: generatedAt,
          summaryText: unavailableSummary
        }),
        rows: [],
        activityBreakdowns: [],
        residentsNotSeen: []
      },
      weekly: {
        summary: emptyReportSummary({
          title: "Weekly Participation Report",
          dateRangeLabel: weekLabel,
          generatedLabel: generatedAt,
          summaryText: unavailableSummary
        }),
        residentsNotSeen: [],
        daySnapshots: [],
        topActivities: []
      },
      monthly: {
        summary: emptyReportSummary({
          title: "Monthly Participation Report",
          dateRangeLabel: monthLabel,
          generatedLabel: generatedAt,
          summaryText: unavailableSummary
        }),
        residentsNotSeen: [],
        residentParticipation: [],
        mostAttendedActivities: [],
        weekBreakdowns: []
      },
      oneToOneMonthly: {
        summary: {
          title: "Monthly 1:1 Report List",
          dateRangeLabel: monthLabel,
          generatedLabel: generatedAt,
          summaryText: "1:1 report data is temporarily unavailable because Actify could not reach the attendance database.",
          monthLabel,
          totalCompletedVisits: 0,
          residentsServedCount: 0,
          residentsWithoutOneToOneCount: 0,
          averageVisitsPerWeek: 0,
          mostRecentVisitDate: null
        },
        entries: [],
        missingDateOrTimeEntries: []
      }
    }
  };
}

function AttendanceDataUnavailableNotice() {
  return (
    <section className="mb-4 rounded-[2rem] border border-amber-200 bg-amber-50/90 p-5 text-amber-950 shadow-sm">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <h1 className="text-lg font-black">Attendance data is temporarily unavailable.</h1>
          <p className="mt-1 text-sm leading-6">
            Actify loaded the Attendance page, but the attendance database did not respond. You can still use the AI
            Assistant, Calendar, and Settings while the database connection is checked.
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function AttendanceTrackerPage({
  searchParams
}: {
  searchParams?: {
    date?: string;
    sessionId?: string;
  };
}) {
  try {
    const context = await requireModulePage("attendanceTracking");

    const [quickTake, summary] = await Promise.all([
      getAttendanceQuickTakePayload({
        facilityId: context.facilityId,
        timeZone: context.timeZone,
        dateKey: searchParams?.date,
        sessionId: searchParams?.sessionId
      }),
      getAttendanceTrackerSummary({
        facilityId: context.facilityId,
        timeZone: context.timeZone,
        dateKey: searchParams?.date
      })
    ]);

    return (
      <AttendanceTrackerPageShell
        initialData={quickTake}
        summary={summary}
        facilityName={context.facility.name}
        canEdit={canWrite(context.role)}
        timeZone={context.timeZone}
      />
    );
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("[attendance] page fallback rendered", error);
    const timeZone = "America/Chicago";
    const summary = emptyAttendanceSummary(timeZone);
    return (
      <>
        <AttendanceDataUnavailableNotice />
        <AttendanceTrackerPageShell
          initialData={emptyQuickTakePayload(summary.dateKey)}
          summary={summary}
          facilityName="Actify"
          canEdit={false}
          timeZone={timeZone}
        />
      </>
    );
  }
}
