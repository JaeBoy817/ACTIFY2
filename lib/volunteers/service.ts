import { addDays, endOfMonth, startOfMonth } from "date-fns";

import { prisma } from "@/lib/prisma";
import type {
  VolunteerComplianceItem,
  VolunteerDetailPayload,
  VolunteerDirectoryStatus,
  VolunteerHourApproval,
  VolunteerHourEntry,
  VolunteerHubPayload,
  VolunteerKpis,
  VolunteerShift,
  VolunteerShiftStatus,
  VolunteerSummary
} from "@/lib/volunteers/types";

const HOURS_PAGE_DEFAULT = 30;
const REQUIREMENT_EXPIRY_REGEX = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function parseRequirementDate(value: string): Date | null {
  const match = value.match(REQUIREMENT_EXPIRY_REGEX);
  if (!match) return null;

  const token = match[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    const parsed = new Date(`${token}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parts = token.split("/");
  if (parts.length !== 3) return null;
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  let year = Number(parts[2]);
  if (year < 100) {
    year += 2000;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(fromDate: Date, toDate: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function extractTags(requirements: string[]) {
  const tags = new Set<string>();
  for (const line of requirements) {
    const normalized = normalizeText(line);
    if (normalized.startsWith("tag:")) {
      const values = line
        .slice(line.indexOf(":") + 1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      for (const value of values) tags.add(value);
      continue;
    }

    const hashMatches = line.match(/#([a-z0-9-_]+)/gi);
    if (hashMatches) {
      for (const match of hashMatches) {
        tags.add(match.replace("#", ""));
      }
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

function extractAvailability(requirements: string[]) {
  const line = requirements.find((item) => normalizeText(item).startsWith("availability:"));
  if (!line) return null;
  const [, raw = ""] = line.split(":");
  const value = raw.trim();
  return value || null;
}

function extractCapabilityList(requirements: string[]) {
  const capabilities: string[] = [];
  for (const line of requirements) {
    if (!normalizeText(line).startsWith("permission:")) continue;
    const [, raw = ""] = line.split(":");
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => capabilities.push(item));
  }
  return capabilities;
}

function extractOnboardingChecklist(requirements: string[]) {
  const checklist: Array<{ label: string; done: boolean }> = [];
  for (const line of requirements) {
    const normalized = normalizeText(line);
    if (!normalized.startsWith("onboarding:") && !normalized.startsWith("check:")) continue;
    const [, raw = ""] = line.split(":");
    const label = raw.trim();
    if (!label) continue;
    const done = /\b(done|complete|completed)\b/i.test(label);
    checklist.push({ label, done });
  }
  return checklist;
}

function extractComplianceItems(requirements: string[], now: Date): VolunteerComplianceItem[] {
  const items: VolunteerComplianceItem[] = [];

  for (const line of requirements) {
    const normalized = normalizeText(line);
    if (!normalized.includes("background") && !normalized.includes("training") && !normalized.includes("check")) {
      continue;
    }

    const expiresAt = parseRequirementDate(line);
    if (!expiresAt) {
      items.push({
        label: line,
        expiresAt: null,
        daysUntilExpiry: null,
        status: "OK"
      });
      continue;
    }

    const delta = daysUntil(now, expiresAt);
    const status =
      delta < 0 ? "EXPIRED" : delta <= 30 ? "EXPIRING_30" : delta <= 60 ? "EXPIRING_60" : "OK";

    items.push({
      label: line,
      expiresAt: expiresAt.toISOString(),
      daysUntilExpiry: delta,
      status
    });
  }

  return items;
}

function countPendingOnboarding(requirements: string[]) {
  return requirements.filter((line) => /\b(pending|todo|missing|incomplete)\b/i.test(line)).length;
}

function getVisitStatus(visit: { startAt: Date; endAt: Date | null }, now: Date): VolunteerShiftStatus {
  if (visit.endAt && visit.endAt.getTime() <= now.getTime()) return "COMPLETE";
  if (visit.startAt.getTime() <= now.getTime() && (!visit.endAt || visit.endAt.getTime() > now.getTime())) {
    return "IN_PROGRESS";
  }
  return "SCHEDULED";
}

function getHourApproval(notes: string | null, endAt: Date | null): VolunteerHourApproval {
  const normalized = normalizeText(notes ?? "");
  if (normalized.startsWith("[denied]")) return "DENIED";
  if (normalized.startsWith("[approved]")) return "APPROVED";
  if (endAt) return "APPROVED";
  return "PENDING";
}

function toDurationHours(startAt: Date, endAt: Date | null) {
  if (!endAt) return 0;
  const durationMs = endAt.getTime() - startAt.getTime();
  if (durationMs <= 0) return 0;
  return Number((durationMs / (1000 * 60 * 60)).toFixed(2));
}

function buildVolunteerSummary(params: {
  volunteer: { id: string; name: string; phone: string | null; requirements: unknown };
  monthlyHours: number;
  nextShiftAt: string | null;
  lastVisitAt: string | null;
  hasActiveShift: boolean;
  now: Date;
}): VolunteerSummary {
  const requirements = jsonStringArray(params.volunteer.requirements);
  const tags = extractTags(requirements);
  const availability = extractAvailability(requirements);
  const compliance = extractComplianceItems(requirements, params.now);
  const pendingOnboardingCount = countPendingOnboarding(requirements);
  const statusFromRequirement = requirements.find((line) => normalizeText(line).startsWith("status:"));
  const explicitStatus = statusFromRequirement
    ? normalizeText(statusFromRequirement.split(":").slice(1).join(":"))
    : null;

  let status: VolunteerDirectoryStatus = "ACTIVE";
  if (params.hasActiveShift) {
    status = "ON_SHIFT";
  } else if (explicitStatus && (explicitStatus.includes("inactive") || explicitStatus.includes("paused"))) {
    status = "INACTIVE";
  }

  return {
    id: params.volunteer.id,
    name: params.volunteer.name,
    phone: params.volunteer.phone,
    status,
    tags,
    availability,
    requirements,
    lastVisitAt: params.lastVisitAt,
    nextShiftAt: params.nextShiftAt,
    monthlyHours: params.monthlyHours,
    pendingOnboardingCount,
    expiringChecksCount: compliance.filter((item) => item.status === "EXPIRING_30" || item.status === "EXPIRING_60").length
  };
}

function toShift(visit: {
  id: string;
  volunteerId: string;
  startAt: Date;
  endAt: Date | null;
  assignedLocation: string;
  notes: string | null;
  volunteer: { name: string; phone: string | null };
}, now: Date): VolunteerShift {
  return {
    id: visit.id,
    volunteerId: visit.volunteerId,
    volunteerName: visit.volunteer.name,
    volunteerPhone: visit.volunteer.phone,
    startAt: visit.startAt.toISOString(),
    endAt: visit.endAt ? visit.endAt.toISOString() : null,
    assignedLocation: visit.assignedLocation,
    notes: visit.notes,
    status: getVisitStatus(visit, now)
  };
}

function toHourEntry(visit: {
  id: string;
  volunteerId: string;
  startAt: Date;
  endAt: Date | null;
  assignedLocation: string;
  notes: string | null;
  volunteer: { name: string };
}): VolunteerHourEntry {
  return {
    id: visit.id,
    volunteerId: visit.volunteerId,
    volunteerName: visit.volunteer.name,
    startAt: visit.startAt.toISOString(),
    endAt: visit.endAt ? visit.endAt.toISOString() : null,
    assignedLocation: visit.assignedLocation,
    notes: visit.notes,
    durationHours: toDurationHours(visit.startAt, visit.endAt),
    approval: getHourApproval(visit.notes, visit.endAt)
  };
}

export async function getVolunteerHubPayload(params: {
  facilityId: string;
  hoursOffset?: number;
  hoursLimit?: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const hoursOffset = Math.max(0, params.hoursOffset ?? 0);
  const hoursLimit = Math.min(100, Math.max(10, params.hoursLimit ?? HOURS_PAGE_DEFAULT));

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const next7Days = addDays(now, 7);
  const next14Days = addDays(now, 14);

  const [volunteers, upcomingVisits, monthVisits, latestHours, allHoursCount, activeVisits, lastVisits] =
    await Promise.all([
      prisma.volunteer.findMany({
        where: { facilityId: params.facilityId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
          requirements: true
        }
      }),
      prisma.volunteerVisit.findMany({
        where: {
          volunteer: { facilityId: params.facilityId },
          startAt: { gte: now, lte: next14Days }
        },
        orderBy: { startAt: "asc" },
        include: {
          volunteer: {
            select: { name: true, phone: true }
          }
        }
      }),
      prisma.volunteerVisit.findMany({
        where: {
          volunteer: { facilityId: params.facilityId },
          startAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: {
          volunteerId: true,
          startAt: true,
          endAt: true
        }
      }),
      prisma.volunteerVisit.findMany({
        where: {
          volunteer: { facilityId: params.facilityId }
        },
        orderBy: { startAt: "desc" },
        skip: hoursOffset,
        take: hoursLimit,
        include: {
          volunteer: {
            select: { name: true }
          }
        }
      }),
      prisma.volunteerVisit.count({
        where: {
          volunteer: { facilityId: params.facilityId }
        }
      }),
      prisma.volunteerVisit.findMany({
        where: {
          volunteer: { facilityId: params.facilityId },
          startAt: { lte: now },
          OR: [{ endAt: null }, { endAt: { gt: now } }]
        },
        select: {
          volunteerId: true
        }
      }),
      prisma.volunteerVisit.findMany({
        where: {
          volunteer: { facilityId: params.facilityId },
          startAt: { lte: now }
        },
        orderBy: { startAt: "desc" },
        select: {
          volunteerId: true,
          startAt: true
        },
        take: 1500
      })
    ]);

  const monthlyHoursByVolunteer = new Map<string, number>();
  let totalHoursThisMonth = 0;
  for (const visit of monthVisits) {
    const duration = toDurationHours(visit.startAt, visit.endAt);
    totalHoursThisMonth += duration;
    monthlyHoursByVolunteer.set(visit.volunteerId, Number(((monthlyHoursByVolunteer.get(visit.volunteerId) ?? 0) + duration).toFixed(2)));
  }
  totalHoursThisMonth = Number(totalHoursThisMonth.toFixed(2));

  const nextShiftByVolunteer = new Map<string, string>();
  for (const visit of upcomingVisits) {
    if (!nextShiftByVolunteer.has(visit.volunteerId)) {
      nextShiftByVolunteer.set(visit.volunteerId, visit.startAt.toISOString());
    }
  }

  const lastVisitByVolunteer = new Map<string, string>();
  for (const row of lastVisits) {
    if (!lastVisitByVolunteer.has(row.volunteerId)) {
      lastVisitByVolunteer.set(row.volunteerId, row.startAt.toISOString());
    }
  }

  const activeVolunteerIds = new Set(activeVisits.map((visit) => visit.volunteerId));

  const volunteerSummaries = volunteers.map((volunteer) =>
    buildVolunteerSummary({
      volunteer,
      monthlyHours: monthlyHoursByVolunteer.get(volunteer.id) ?? 0,
      nextShiftAt: nextShiftByVolunteer.get(volunteer.id) ?? null,
      lastVisitAt: lastVisitByVolunteer.get(volunteer.id) ?? null,
      hasActiveShift: activeVolunteerIds.has(volunteer.id),
      now
    })
  );

  const shifts = upcomingVisits.map((visit) => toShift(visit, now));
  const hours = latestHours.map((visit) => toHourEntry(visit));

  let pendingOnboarding = 0;
  let expiring30 = 0;
  let expiring60 = 0;

  for (const volunteer of volunteerSummaries) {
    pendingOnboarding += volunteer.pendingOnboardingCount > 0 ? 1 : 0;
    const complianceItems = extractComplianceItems(volunteer.requirements, now);
    if (complianceItems.some((item) => item.status === "EXPIRING_30")) {
      expiring30 += 1;
    } else if (complianceItems.some((item) => item.status === "EXPIRING_60")) {
      expiring60 += 1;
    }
  }

  const kpis: VolunteerKpis = {
    activeVolunteers: volunteerSummaries.filter((volunteer) => volunteer.status !== "INACTIVE").length,
    scheduledNext7Days: shifts.filter((shift) => new Date(shift.startAt).getTime() <= next7Days.getTime()).length,
    hoursThisMonth: totalHoursThisMonth,
    pendingOnboarding,
    expiringChecks30Days: expiring30,
    expiringChecks60Days: expiring60
  };

  const payload: VolunteerHubPayload = {
    kpis,
    volunteers: volunteerSummaries,
    shifts,
    hours,
    hoursPagination: {
      offset: hoursOffset + latestHours.length,
      limit: hoursLimit,
      hasMore: hoursOffset + latestHours.length < allHoursCount
    }
  };

  return payload;
}

export async function getVolunteerDetailPayload(params: {
  facilityId: string;
  volunteerId: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const past30 = addDays(now, -30);

  const volunteer = await prisma.volunteer.findFirst({
    where: {
      id: params.volunteerId,
      facilityId: params.facilityId
    },
    select: {
      id: true,
      name: true,
      phone: true,
      requirements: true
    }
  });

  if (!volunteer) {
    return null;
  }

  const [visits, monthVisits, lastVisit, nextVisit, activeVisit] = await Promise.all([
    prisma.volunteerVisit.findMany({
      where: { volunteerId: volunteer.id },
      orderBy: { startAt: "desc" },
      take: 80,
      include: {
        volunteer: {
          select: { name: true }
        }
      }
    }),
    prisma.volunteerVisit.findMany({
      where: {
        volunteerId: volunteer.id,
        startAt: { gte: monthStart, lte: monthEnd }
      },
      select: {
        startAt: true,
        endAt: true
      }
    }),
    prisma.volunteerVisit.findFirst({
      where: {
        volunteerId: volunteer.id,
        startAt: { lte: now }
      },
      orderBy: { startAt: "desc" },
      select: { startAt: true }
    }),
    prisma.volunteerVisit.findFirst({
      where: {
        volunteerId: volunteer.id,
        startAt: { gte: now }
      },
      orderBy: { startAt: "asc" },
      select: { startAt: true }
    }),
    prisma.volunteerVisit.findFirst({
      where: {
        volunteerId: volunteer.id,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }]
      },
      select: { id: true }
    })
  ]);

  const requirements = jsonStringArray(volunteer.requirements);
  const complianceItems = extractComplianceItems(requirements, now);
  const onboardingChecklist = extractOnboardingChecklist(requirements);
  const permissionCapabilities = extractCapabilityList(requirements);

  const volunteerSummary = buildVolunteerSummary({
    volunteer,
    monthlyHours: Number(
      monthVisits
        .reduce((sum, visit) => sum + toDurationHours(visit.startAt, visit.endAt), 0)
        .toFixed(2)
    ),
    nextShiftAt: nextVisit?.startAt.toISOString() ?? null,
    lastVisitAt: lastVisit?.startAt.toISOString() ?? null,
    hasActiveShift: Boolean(activeVisit),
    now
  });

  const hourEntries = visits.map((visit) => toHourEntry(visit));
  const totalHours30Days = Number(
    visits
      .filter((visit) => visit.startAt >= past30)
      .reduce((sum, visit) => sum + toDurationHours(visit.startAt, visit.endAt), 0)
      .toFixed(2)
  );
  const totalHoursMonth = volunteerSummary.monthlyHours;

  const payload: VolunteerDetailPayload = {
    volunteer: volunteerSummary,
    profile: {
      notes: requirements.filter((item) => !/^((tag|availability|permission|onboarding|check|status)\s*:)/i.test(item)),
      onboardingChecklist
    },
    compliance: {
      items: complianceItems
    },
    hours: {
      entries: hourEntries,
      totalHours30Days,
      totalHoursMonth
    },
    permissions: {
      capabilities: permissionCapabilities
    }
  };

  return payload;
}

export function serializeVolunteerRequirements(input: string[] | string) {
  if (Array.isArray(input)) {
    return input
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function markVisitApprovedNotes(notes: string | null) {
  const base = (notes ?? "").replace(/^\[(approved|denied)\]\s*/i, "").trim();
  return base ? `[APPROVED] ${base}` : "[APPROVED]";
}

export function markVisitDeniedNotes(notes: string | null, reason?: string | null) {
  const base = (notes ?? "").replace(/^\[(approved|denied)\]\s*/i, "").trim();
  const reasonText = reason?.trim();
  if (reasonText && base) return `[DENIED] ${reasonText} — ${base}`;
  if (reasonText) return `[DENIED] ${reasonText}`;
  if (base) return `[DENIED] ${base}`;
  return "[DENIED]";
}
