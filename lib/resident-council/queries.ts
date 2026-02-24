import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getResidentCouncilCacheTag,
  parseDueDate,
  parseMeetingSheetNotes,
  residentCouncilCategoryOptions,
  withoutDueDateLine
} from "@/lib/resident-council/service";
import type { ResidentCouncilActionItemDTO, ResidentCouncilSection, ResidentCouncilTopicCategory } from "@/lib/resident-council/types";
import { compareResidentsByRoom } from "@/lib/resident-status";
import {
  addZonedDays,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedMonth,
  startOfZonedMonthShift,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";

const DEPARTMENT_SECTIONS = [
  { key: "activities", label: "Activities" },
  { key: "nursing", label: "Nursing" },
  { key: "therapy", label: "Therapy" },
  { key: "dietary", label: "Dietary" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "laundry", label: "Laundry" },
  { key: "maintenance", label: "Maintenance" },
  { key: "socialServices", label: "Social Services" },
  { key: "administration", label: "Administration" },
  { key: "other", label: "Other" }
] as const;

export type ResidentCouncilDashboardSection = "overview" | "meetings" | "actions" | "analytics" | "settings";
export type ResidentCouncilMeetingSort = "newest" | "oldest" | "most_action_items" | "most_departments";
export type ResidentCouncilActionSort = "newest" | "oldest" | "due_soon";

export type ResidentCouncilMeetingRow = {
  id: string;
  heldAt: string;
  title: string;
  snippet: string;
  departments: string[];
  attendanceCount: number;
  unresolvedCount: number;
  actionItemsCount: number;
  status: "DRAFT" | "FINAL";
};

export type ResidentCouncilActionItemRow = {
  id: string;
  meetingId: string;
  meetingHeldAt: string;
  section: ResidentCouncilSection;
  category: string;
  concern: string;
  followUp: string | null;
  owner: string | null;
  dueDate: string | null;
  status: "OPEN" | "DONE";
  updatedAt: string;
};

export type ResidentCouncilMeetingListResult = {
  rows: ResidentCouncilMeetingRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ResidentCouncilActionListResult = {
  rows: ResidentCouncilActionItemRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ResidentCouncilOverviewData = {
  month: string;
  totalMeetings: number;
  totalResolvedActionItems: number;
  nextMeeting: ResidentCouncilMeetingRow | null;
  meetingsThisMonth: number;
  openActionItems: number;
  topDepartments: Array<{ department: string; count: number }>;
  recentMeetings: ResidentCouncilMeetingRow[];
  openItemsPreview: ResidentCouncilActionItemRow[];
  trends: Array<{
    month: string;
    meetings: number;
    avgAttendance: number;
    openItems: number;
    resolvedItems: number;
  }>;
};

export type ResidentCouncilMeetingDetailData = {
  id: string;
  heldAt: string;
  attendanceCount: number;
  notes: string | null;
  legacyMinutesText: string | null;
  summary: string;
  oldBusiness: string;
  newBusiness: string;
  additionalNotes: string;
  residentsInAttendance: string[];
  status: "DRAFT" | "FINAL";
  unresolvedCount: number;
  actionItems: ResidentCouncilActionItemDTO[];
  departments: string[];
  updatedAt: string;
  minuteSections: Array<{
    key: string;
    label: string;
    oldBusiness: string;
    newBusiness: string;
    notes: string;
  }>;
};

type DateRange = {
  timeZone: string;
  monthKey: string;
  start: Date;
  end: Date;
};

function getMonthRange(month?: string, timeZone?: string): DateRange {
  const zone = resolveTimeZone(timeZone);
  const fallbackMonth = zonedDateKey(new Date(), zone).slice(0, 7);
  const monthKey = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : fallbackMonth;
  const start =
    zonedDateStringToUtcStart(`${monthKey}-01`, zone) ?? startOfZonedMonth(new Date(), zone);
  const end = startOfZonedMonthShift(start, zone, 1);
  return { start, end, monthKey, timeZone: zone };
}

function clampPage(raw: number | undefined) {
  if (!raw || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(raw));
}

function clampPageSize(raw: number | undefined) {
  if (!raw || !Number.isFinite(raw)) return 20;
  return Math.min(40, Math.max(10, Math.floor(raw)));
}

function normalizeSection(value?: string | null): ResidentCouncilSection {
  if (!value) return "NEW";
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (!line.toLowerCase().startsWith("section:")) continue;
    const section = line.slice("section:".length).trim().toUpperCase();
    if (section === "OLD" || section === "NEW") return section;
  }
  return "NEW";
}

function normalizeDepartmentLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Other";
  if (normalized.includes("admin")) return "Administration";
  if (normalized.includes("social")) return "Social Services";
  if (normalized.includes("therap")) return "Therapy";
  if (normalized.includes("diet")) return "Dietary";
  if (normalized.includes("house")) return "Housekeeping";
  if (normalized.includes("laundr")) return "Laundry";
  if (normalized.includes("maint")) return "Maintenance";
  if (normalized.includes("nurs")) return "Nursing";
  if (normalized.includes("activit")) return "Activities";
  const exact = residentCouncilCategoryOptions.find(
    (option) => option.toLowerCase() === normalized
  );
  return exact ?? "Other";
}

function parseDepartmentBusiness(text: string | null | undefined) {
  const byDepartment = new Map<string, string[]>();
  for (const section of DEPARTMENT_SECTIONS) {
    byDepartment.set(section.label, []);
  }
  if (!text) return byDepartment;

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cleaned = line.replace(/^[\-\u2022]\s*/, "");
    const match = cleaned.match(/^([^:]{2,40}):\s*(.+)$/);
    if (!match) {
      byDepartment.get("Other")?.push(cleaned);
      continue;
    }
    const label = normalizeDepartmentLabel(match[1]);
    byDepartment.get(label)?.push(match[2].trim());
  }

  return byDepartment;
}

function getSnippet(value: string | null | undefined, fallback = "No summary provided yet.") {
  const source = (value ?? "").replace(/\s+/g, " ").trim();
  if (!source) return fallback;
  if (source.length <= 120) return source;
  return `${source.slice(0, 117)}...`;
}

function toMeetingRow(input: {
  id: string;
  heldAt: Date;
  attendanceCount: number;
  notes: string | null;
  items: Array<{ id: string; category: string; concern: string; status: "RESOLVED" | "UNRESOLVED" }>;
}, timeZone?: string): ResidentCouncilMeetingRow {
  const zone = resolveTimeZone(timeZone);
  const parsed = parseMeetingSheetNotes(input.notes);
  const unresolvedCount = input.items.filter((item) => item.status === "UNRESOLVED").length;
  const status = unresolvedCount > 0 ? "DRAFT" : "FINAL";

  const departments = new Set<string>();
  for (const update of parsed?.departmentUpdates ?? []) {
    departments.add(normalizeDepartmentLabel(update.label));
  }
  for (const item of input.items) {
    departments.add(normalizeDepartmentLabel(item.category));
  }

  const summaryLine = parsed?.summary?.split("\n")[0]?.trim();
  const title = summaryLine && summaryLine.length > 0
    ? summaryLine
    : `Resident Council • ${formatInTimeZone(input.heldAt, zone, { month: "short", day: "numeric", year: "numeric" })}`;

  const snippet = getSnippet(parsed?.summary ?? parsed?.newBusiness ?? input.notes);

  return {
    id: input.id,
    heldAt: input.heldAt.toISOString(),
    title,
    snippet,
    departments: Array.from(departments).slice(0, 5),
    attendanceCount: input.attendanceCount,
    unresolvedCount,
    actionItemsCount: input.items.length,
    status
  };
}

function toActionItemRow(input: {
  id: string;
  meetingId: string;
  meetingHeldAt: Date;
  category: string;
  concern: string;
  followUp: string | null;
  owner: string | null;
  status: "RESOLVED" | "UNRESOLVED";
  updatedAt: Date;
}): ResidentCouncilActionItemRow {
  return {
    id: input.id,
    meetingId: input.meetingId,
    meetingHeldAt: input.meetingHeldAt.toISOString(),
    section: normalizeSection(input.followUp),
    category: input.category,
    concern: input.concern,
    followUp: withoutDueDateLine(input.followUp),
    owner: input.owner,
    dueDate: parseDueDate(input.followUp),
    status: input.status === "RESOLVED" ? "DONE" : "OPEN",
    updatedAt: input.updatedAt.toISOString()
  };
}

export async function listResidentCouncilMeetings(params: {
  facilityId: string;
  timeZone?: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "ALL" | "DRAFT" | "FINAL";
  hasOpenActionItems?: boolean;
  department?: string;
  from?: string;
  to?: string;
  sort?: ResidentCouncilMeetingSort;
}): Promise<ResidentCouncilMeetingListResult> {
  const timeZone = resolveTimeZone(params.timeZone);
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const search = params.search?.trim();

  const where: Prisma.ResidentCouncilMeetingWhereInput = {
    facilityId: params.facilityId
  };

  if (params.from || params.to) {
    where.heldAt = {};
    if (params.from) {
      const parsedFrom = zonedDateStringToUtcStart(params.from, timeZone);
      if (parsedFrom) {
        where.heldAt.gte = parsedFrom;
      }
    }
    if (params.to) {
      const parsedTo = zonedDateStringToUtcStart(params.to, timeZone);
      if (parsedTo) {
        where.heldAt.lt = addZonedDays(parsedTo, timeZone, 1);
      }
    }
  }

  if (params.status === "DRAFT") {
    where.items = { some: { status: "UNRESOLVED" } };
  }
  if (params.status === "FINAL") {
    where.items = { none: { status: "UNRESOLVED" } };
  }
  if (params.hasOpenActionItems) {
    where.items = { some: { status: "UNRESOLVED" } };
  }
  if (params.department && params.department !== "ALL") {
    where.OR = [
      { notes: { contains: params.department, mode: "insensitive" } },
      { items: { some: { category: { contains: params.department, mode: "insensitive" } } } }
    ];
  }
  if (search) {
    const existingAnd = where.AND;
    const andClauses = Array.isArray(existingAnd)
      ? existingAnd
      : existingAnd
        ? [existingAnd]
        : [];
    where.AND = [
      ...andClauses,
      {
        OR: [
          { notes: { contains: search, mode: "insensitive" } },
          { items: { some: { concern: { contains: search, mode: "insensitive" } } } },
          { items: { some: { category: { contains: search, mode: "insensitive" } } } }
        ]
      }
    ];
  }

  const orderBy: Prisma.ResidentCouncilMeetingOrderByWithRelationInput[] =
    params.sort === "oldest"
      ? [{ heldAt: "asc" }]
      : params.sort === "most_action_items" || params.sort === "most_departments"
        ? [{ items: { _count: "desc" } }, { heldAt: "desc" }]
        : [{ heldAt: "desc" }];

  const [total, rows] = await Promise.all([
    prisma.residentCouncilMeeting.count({ where }),
    prisma.residentCouncilMeeting.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        heldAt: true,
        attendanceCount: true,
        notes: true,
        items: {
          select: {
            id: true,
            category: true,
            concern: true,
            status: true
          }
        }
      }
    })
  ]);

  const mapped = rows.map((row) => toMeetingRow(row, timeZone));
  if (params.sort === "most_departments") {
    mapped.sort((a, b) => b.departments.length - a.departments.length || +new Date(b.heldAt) - +new Date(a.heldAt));
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { rows: mapped, total, page, pageSize, pageCount };
}

export async function listResidentCouncilActionItems(params: {
  facilityId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "ALL" | "OPEN" | "DONE";
  department?: string;
  owner?: string;
  meetingId?: string;
  sort?: ResidentCouncilActionSort;
}): Promise<ResidentCouncilActionListResult> {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const search = params.search?.trim();

  const where: Prisma.ResidentCouncilItemWhereInput = {
    meeting: {
      facilityId: params.facilityId
    }
  };
  if (params.meetingId) where.meetingId = params.meetingId;

  if (params.status === "OPEN") where.status = "UNRESOLVED";
  if (params.status === "DONE") where.status = "RESOLVED";
  if (params.department && params.department !== "ALL") {
    where.category = { contains: params.department, mode: "insensitive" };
  }
  if (params.owner && params.owner !== "ALL") {
    where.owner = { equals: params.owner, mode: "insensitive" };
  }
  if (search) {
    where.OR = [
      { concern: { contains: search, mode: "insensitive" } },
      { followUp: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { owner: { contains: search, mode: "insensitive" } }
    ];
  }

  const orderBy: Prisma.ResidentCouncilItemOrderByWithRelationInput[] =
    params.sort === "oldest"
      ? [{ meeting: { heldAt: "asc" } }, { updatedAt: "asc" }]
      : params.sort === "due_soon"
        ? [{ updatedAt: "desc" }]
        : [{ updatedAt: "desc" }];

  const [total, rows] = await Promise.all([
    prisma.residentCouncilItem.count({ where }),
    prisma.residentCouncilItem.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        category: true,
        concern: true,
        followUp: true,
        owner: true,
        status: true,
        updatedAt: true,
        meetingId: true,
        meeting: {
          select: {
            heldAt: true
          }
        }
      }
    })
  ]);

  const mapped = rows.map((row) =>
    toActionItemRow({
      id: row.id,
      category: row.category,
      concern: row.concern,
      followUp: row.followUp,
      owner: row.owner,
      status: row.status,
      updatedAt: row.updatedAt,
      meetingId: row.meetingId,
      meetingHeldAt: row.meeting.heldAt
    })
  );

  if (params.sort === "due_soon") {
    mapped.sort((a, b) => {
      const aDue = a.dueDate ? +new Date(`${a.dueDate}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? +new Date(`${b.dueDate}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { rows: mapped, total, page, pageSize, pageCount };
}

function getOverviewDataCached(facilityId: string, monthKey: string, timeZone: string) {
  return unstable_cache(
    async (): Promise<ResidentCouncilOverviewData> => {
      const monthRange = getMonthRange(monthKey, timeZone);
      const sixMonthsAgo = startOfZonedMonthShift(monthRange.start, monthRange.timeZone, -5);

      const [nextMeetingRow, totalMeetings, totalResolvedActionItems, meetingsThisMonth, openItemsRows, recentMeetings, openItemsPreview, trendRows] = await Promise.all([
        prisma.residentCouncilMeeting.findFirst({
          where: {
            facilityId,
            heldAt: { gte: new Date() }
          },
          orderBy: { heldAt: "asc" },
          select: {
            id: true,
            heldAt: true,
            attendanceCount: true,
            notes: true,
            items: {
              select: {
                id: true,
                category: true,
                concern: true,
                status: true
              }
            }
          }
        }),
        prisma.residentCouncilMeeting.count({
          where: { facilityId }
        }),
        prisma.residentCouncilItem.count({
          where: {
            status: "RESOLVED",
            meeting: { facilityId }
          }
        }),
        prisma.residentCouncilMeeting.count({
          where: {
            facilityId,
            heldAt: { gte: monthRange.start, lt: monthRange.end }
          }
        }),
        prisma.residentCouncilItem.findMany({
          where: {
            status: "UNRESOLVED",
            meeting: {
              facilityId
            }
          },
          select: { category: true }
        }),
        listResidentCouncilMeetings({
          facilityId,
          timeZone: monthRange.timeZone,
          page: 1,
          pageSize: 8,
          sort: "newest"
        }),
        listResidentCouncilActionItems({
          facilityId,
          page: 1,
          pageSize: 8,
          status: "OPEN"
        }),
        prisma.residentCouncilMeeting.findMany({
          where: {
            facilityId,
            heldAt: { gte: sixMonthsAgo }
          },
          orderBy: { heldAt: "asc" },
          select: {
            heldAt: true,
            attendanceCount: true,
            items: {
              select: {
                status: true
              }
            }
          }
        })
      ]);

      const topDeptMap = new Map<string, number>();
      for (const row of openItemsRows) {
        const key = normalizeDepartmentLabel(row.category);
        topDeptMap.set(key, (topDeptMap.get(key) ?? 0) + 1);
      }
      const topDepartments = Array.from(topDeptMap.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 2);

      const trendMap = new Map<string, { meetings: number; attendanceTotal: number; openItems: number; resolvedItems: number }>();
      for (const row of trendRows) {
        const key = zonedDateKey(row.heldAt, monthRange.timeZone).slice(0, 7);
        const current = trendMap.get(key) ?? { meetings: 0, attendanceTotal: 0, openItems: 0, resolvedItems: 0 };
        current.meetings += 1;
        current.attendanceTotal += row.attendanceCount;
        current.openItems += row.items.filter((item) => item.status === "UNRESOLVED").length;
        current.resolvedItems += row.items.filter((item) => item.status === "RESOLVED").length;
        trendMap.set(key, current);
      }

      const trends = Array.from(trendMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, stats]) => ({
          month,
          meetings: stats.meetings,
          avgAttendance: stats.meetings ? Number((stats.attendanceTotal / stats.meetings).toFixed(1)) : 0,
          openItems: stats.openItems,
          resolvedItems: stats.resolvedItems
        }));

      return {
        month: monthRange.monthKey,
        totalMeetings,
        totalResolvedActionItems,
        nextMeeting: nextMeetingRow ? toMeetingRow(nextMeetingRow) : null,
        meetingsThisMonth,
        openActionItems: openItemsRows.length,
        topDepartments,
        recentMeetings: recentMeetings.rows,
        openItemsPreview: openItemsPreview.rows,
        trends
      };
    },
    ["resident-council-overview-v2", facilityId, monthKey, timeZone],
    {
      revalidate: 45,
      tags: [getResidentCouncilCacheTag(facilityId)]
    }
  );
}

export async function getResidentCouncilOverviewData(params: {
  facilityId: string;
  month?: string;
  timeZone?: string | null;
}) {
  const timeZone = resolveTimeZone(params.timeZone);
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month)
    ? params.month
    : zonedDateKey(new Date(), timeZone).slice(0, 7);
  return getOverviewDataCached(params.facilityId, month, timeZone)();
}

export async function getResidentCouncilMeetingDetail(params: {
  facilityId: string;
  meetingId: string;
}): Promise<ResidentCouncilMeetingDetailData | null> {
  const row = await prisma.residentCouncilMeeting.findFirst({
    where: {
      facilityId: params.facilityId,
      id: params.meetingId
    },
    select: {
      id: true,
      heldAt: true,
      attendanceCount: true,
      notes: true,
      items: {
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          category: true,
          concern: true,
          followUp: true,
          owner: true,
          status: true,
          updatedAt: true
        }
      }
    }
  });

  if (!row) return null;
  const parsed = parseMeetingSheetNotes(row.notes);
  const unresolvedCount = row.items.filter((item) => item.status === "UNRESOLVED").length;

  const actionItems: ResidentCouncilActionItemDTO[] = row.items.map((item) => ({
    id: item.id,
    meetingId: row.id,
    meetingHeldAt: row.heldAt.toISOString(),
    section: normalizeSection(item.followUp),
    category: item.category,
    concern: item.concern,
    followUp: withoutDueDateLine(item.followUp),
    owner: item.owner,
    dueDate: parseDueDate(item.followUp),
    status: item.status,
    updatedAt: item.updatedAt.toISOString()
  }));

  const departments = new Set<string>();
  for (const update of parsed?.departmentUpdates ?? []) {
    departments.add(normalizeDepartmentLabel(update.label));
  }
  for (const item of actionItems) {
    departments.add(normalizeDepartmentLabel(item.category));
  }

  const oldByDepartment = parseDepartmentBusiness(parsed?.oldBusiness);
  const newByDepartment = parseDepartmentBusiness(parsed?.newBusiness);
  const notesByDepartment = new Map<string, string>();
  for (const update of parsed?.departmentUpdates ?? []) {
    notesByDepartment.set(normalizeDepartmentLabel(update.label), update.notes);
  }

  const minuteSections = DEPARTMENT_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    oldBusiness: (oldByDepartment.get(section.label) ?? []).join("\n"),
    newBusiness: (newByDepartment.get(section.label) ?? []).join("\n"),
    notes: notesByDepartment.get(section.label) ?? ""
  }));

  const latestActionUpdate = row.items.reduce((latest, item) => {
    const current = item.updatedAt.getTime();
    return current > latest ? current : latest;
  }, row.heldAt.getTime());

  return {
    id: row.id,
    heldAt: row.heldAt.toISOString(),
    attendanceCount: row.attendanceCount,
    notes: row.notes,
    legacyMinutesText: parsed ? null : row.notes,
    summary: parsed?.summary ?? "",
    oldBusiness: parsed?.oldBusiness ?? "",
    newBusiness: parsed?.newBusiness ?? "",
    additionalNotes: parsed?.additionalNotes ?? "",
    residentsInAttendance: parsed?.residentsInAttendance ?? [],
    status: unresolvedCount > 0 ? "DRAFT" : "FINAL",
    unresolvedCount,
    actionItems,
    departments: Array.from(departments),
    updatedAt: new Date(latestActionUpdate).toISOString(),
    minuteSections
  };
}

export async function getResidentCouncilOwners(facilityId: string) {
  const owners = await prisma.residentCouncilItem.findMany({
    where: {
      meeting: { facilityId },
      owner: { not: null }
    },
    select: {
      owner: true
    },
    distinct: ["owner"]
  });
  return owners
    .map((row) => row.owner)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function getResidentCouncilDepartments(): ResidentCouncilTopicCategory[] {
  return [...residentCouncilCategoryOptions];
}

export async function getResidentCouncilActiveResidents(facilityId: string) {
  const residents = await prisma.resident.findMany({
    where: {
      facilityId,
      isActive: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true
    }
  });

  residents.sort(compareResidentsByRoom);
  return residents;
}
