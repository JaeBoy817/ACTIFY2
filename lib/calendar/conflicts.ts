import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { asAttendanceRules, asBusinessHours } from "@/lib/settings/defaults";
import { formatInTimeZone } from "@/lib/timezone";

const WEEKDAY_TOKEN_TO_INDEX: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
};

export type CalendarConflict = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  location: string;
};

export type SchedulingWarningPolicy = {
  warnTherapyOverlap: boolean;
  warnOutsideBusinessHours: boolean;
  businessHours: {
    start: string;
    end: string;
    days: number[];
  };
  timezone: string;
};

export function hasTimeOverlap(candidateStart: Date, candidateEnd: Date, existingStart: Date, existingEnd: Date) {
  return candidateStart < existingEnd && candidateEnd > existingStart;
}

function parseMinutesFromHhMm(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

function getLocalWeekdayIndex(date: Date, timeZone: string) {
  const token = formatInTimeZone(date, timeZone, { weekday: "short" }).slice(0, 3).toUpperCase();
  return WEEKDAY_TOKEN_TO_INDEX[token] ?? 0;
}

function getLocalMinutes(date: Date, timeZone: string) {
  const formatted = formatInTimeZone(date, timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  return parseMinutesFromHhMm(formatted);
}

export function isOutsideBusinessHours(params: {
  startAt: Date;
  endAt: Date;
  timeZone: string;
  businessHours: {
    start: string;
    end: string;
    days: number[];
  };
}) {
  const { startAt, endAt, timeZone, businessHours } = params;

  const allowedStart = parseMinutesFromHhMm(businessHours.start);
  const allowedEnd = parseMinutesFromHhMm(businessHours.end);
  const localStartMinutes = getLocalMinutes(startAt, timeZone);
  const localEndMinutes = getLocalMinutes(endAt, timeZone);
  const localStartDay = getLocalWeekdayIndex(startAt, timeZone);
  const localEndDay = getLocalWeekdayIndex(endAt, timeZone);

  if (allowedStart === null || allowedEnd === null || localStartMinutes === null || localEndMinutes === null) {
    return false;
  }

  if (!businessHours.days.includes(localStartDay) || !businessHours.days.includes(localEndDay)) {
    return true;
  }

  if (localStartDay !== localEndDay) {
    return true;
  }

  return localStartMinutes < allowedStart || localEndMinutes > allowedEnd;
}

export async function getSchedulingWarningPolicy(facilityId: string): Promise<SchedulingWarningPolicy> {
  const settings = await prisma.facilitySettings.findUnique({
    where: { facilityId },
    select: {
      attendanceRulesJson: true,
      businessHoursJson: true,
      timezone: true
    }
  });

  return {
    warnTherapyOverlap: asAttendanceRules(settings?.attendanceRulesJson).warnTherapyOverlap,
    warnOutsideBusinessHours: asAttendanceRules(settings?.attendanceRulesJson).warnOutsideBusinessHours,
    businessHours: asBusinessHours(settings?.businessHoursJson),
    timezone: settings?.timezone || "America/Chicago"
  };
}

export async function findConflicts(params: {
  facilityId: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  excludeActivityId?: string;
  locationScoped?: boolean;
}) {
  const where: Prisma.ActivityInstanceWhereInput = {
    facilityId: params.facilityId,
    startAt: { lt: params.endAt },
    endAt: { gt: params.startAt },
    ...(params.excludeActivityId ? { id: { not: params.excludeActivityId } } : {}),
    ...(params.locationScoped && params.location ? { location: params.location } : {})
  };

  return prisma.activityInstance.findMany({
    where,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      location: true
    },
    orderBy: { startAt: "asc" }
  });
}

