import { AttendanceStatus, type MoodAffect, type ParticipationLevel, type ProgressNoteType, type ResidentStatus, type ResponseType } from "@prisma/client";

import {
  inferDocumentationDueDate,
  inferDocumentationKind,
  inferDocumentationStatus,
  parseDocumentationMeta
} from "@/lib/documentation/meta";
import { prisma } from "@/lib/prisma";
import {
  addZonedDays,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedMonth,
  startOfZonedMonthShift,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";

const SUPPORTIVE_STATUSES = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.ACTIVE,
  AttendanceStatus.LEADING
]);

const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = [
  "DISCHARGED",
  "TRANSFERRED",
  "DECEASED"
];

const PARTICIPATION_LEVEL_OPTIONS: ParticipationLevel[] = ["MINIMAL", "MODERATE", "HIGH"];
const RESPONSE_TYPE_OPTIONS: ResponseType[] = ["POSITIVE", "NEUTRAL", "RESISTANT"];
const MOOD_OPTIONS: MoodAffect[] = ["BRIGHT", "CALM", "FLAT", "ANXIOUS", "AGITATED"];

export type AnalyticsDashboardPreset = "this-month" | "last-month" | "quarter" | "custom";

export type AnalyticsDashboardResidentStatusFilter =
  | "all-active"
  | "active"
  | "bed-bound"
  | "hospitalized"
  | "on-leave"
  | "inactive"
  | "all";

export type AnalyticsDashboardParticipationScope = "all" | "group" | "one-to-one";

export type AnalyticsDashboardDocTypeFilter =
  | "all"
  | "progress"
  | "one-to-one"
  | "uda"
  | "mds"
  | "care-plan";

export type AnalyticsDashboardFilters = {
  preset: AnalyticsDashboardPreset;
  selectedMonth: string;
  customFrom: string | null;
  customTo: string | null;
  compare: boolean;
  unitId: string | null;
  activityCategory: string | null;
  participationScope: AnalyticsDashboardParticipationScope;
  residentStatus: AnalyticsDashboardResidentStatusFilter;
  participationLevel: ParticipationLevel | null;
  responseType: ResponseType | null;
  mood: MoodAffect | null;
  staffId: string | null;
  docType: AnalyticsDashboardDocTypeFilter;
};

export type AnalyticsDashboardRange = {
  preset: AnalyticsDashboardPreset;
  selectedMonth: string;
  start: Date;
  endExclusive: Date;
  label: string;
  monthScoped: boolean;
  timeZone: string;
};

type ResidentCore = {
  id: string;
  name: string;
  room: string;
  unitName: string;
  status: ResidentStatus;
  admissionDate: Date | null;
  createdAt: Date;
  followUpFlag: boolean;
};

type AttendanceCore = {
  residentId: string;
  status: AttendanceStatus;
  occurredAt: Date;
  title: string;
  category: string;
  location: string;
};

type NoteCore = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  unitName: string;
  noteType: ProgressNoteType;
  createdAt: Date;
  participationLevel: ParticipationLevel;
  response: ResponseType;
  mood: MoodAffect;
  followUp: string | null;
  narrative: string;
  createdByUserId: string;
  createdByName: string;
};

type NoteMetaCore = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  unitName: string;
  kind: "PROGRESS" | "ONE_TO_ONE" | "UDA" | "MDS";
  status: "DRAFT" | "IN_PROGRESS" | "READY_REVIEW" | "COMPLETED";
  dueDateIso: string | null;
  assignedStaff: string | null;
  followUp: string | null;
  createdAt: Date;
  createdByName: string;
};

type CarePlanReviewCore = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  reviewDate: Date;
  createdByUserId: string;
};

type CarePlanCore = {
  id: string;
  residentId: string;
  residentName: string;
  room: string;
  nextReviewDate: Date;
  status: "ACTIVE" | "ARCHIVED";
};

type RangeDataset = {
  attendanceRows: AttendanceCore[];
  noteRows: NoteMetaCore[];
  carePlanReviews: CarePlanReviewCore[];
};

type ComputedAggregate = {
  eligibleResidents: ResidentCore[];
  monthParticipationRate: number;
  totalGroupAttendance: number;
  oneToOneCompleted: number;
  residentsEngaged: number;
  documentationCompletionRate: number;
  residentsNoParticipation: number;
  topActivityCategory: string;
  followUpNeededCount: number;
  dailyTrend: Array<{ label: string; value: number }>;
  groupVsOneToOne: Array<{ label: string; value: number }>;
  categoryPerformance: Array<{ label: string; value: number }>;
  unitEngagement: Array<{ label: string; value: number }>;
  residentRows: Array<{
    residentId: string;
    residentName: string;
    room: string;
    unitName: string;
    lastParticipatedDate: string | null;
    participationCount: number;
    preferredCategory: string;
    trend: "up" | "down" | "flat";
    followUpFlag: boolean;
  }>;
  buckets: {
    highlyEngaged: number;
    moderatelyEngaged: number;
    lowEngagement: number;
    noParticipation: number;
  };
  docs: {
    progressCompleted: number;
    oneToOneCompleted: number;
    udaCompleted: number;
    mdsCompleted: number;
    carePlanUpdatesCompleted: number;
    overdueCount: number;
    overdueRows: Array<{
      id: string;
      residentName: string;
      room: string;
      docType: string;
      dueDateIso: string;
      status: string;
      assignedTo: string;
    }>;
  };
  insights: {
    mostAttendedCategory: string;
    residentsNeedingOutreach: number;
    bestAttendanceDay: string;
    lowestEngagementUnit: string;
    documentationCompletionRate: number;
    oneToOneCompletionLag: number;
  };
};

export type AnalyticsDashboardSnapshot = {
  filters: AnalyticsDashboardFilters;
  range: AnalyticsDashboardRange;
  compareRange: AnalyticsDashboardRange | null;
  options: {
    units: Array<{ id: string; label: string }>;
    categories: Array<{ key: string; label: string }>;
    staff: Array<{ id: string; label: string }>;
    participationLevels: ParticipationLevel[];
    responseTypes: ResponseType[];
    moods: MoodAffect[];
  };
  kpis: Array<{
    key: string;
    label: string;
    value: string;
    helper: string;
    delta: string | null;
    deltaTone: "up" | "down" | "flat";
  }>;
  charts: {
    dailyTrend: Array<{ label: string; value: number }>;
    groupVsOneToOne: Array<{ label: string; value: number }>;
    categoryPerformance: Array<{ label: string; value: number }>;
    unitEngagement: Array<{ label: string; value: number }>;
  };
  residents: {
    rows: ComputedAggregate["residentRows"];
    buckets: ComputedAggregate["buckets"];
  };
  documentation: ComputedAggregate["docs"];
  insights: ComputedAggregate["insights"];
  comparison: {
    enabled: boolean;
    previous: {
      monthParticipationRate: number;
      totalGroupAttendance: number;
      oneToOneCompleted: number;
      residentsEngaged: number;
      documentationCompletionRate: number;
      residentsNoParticipation: number;
      followUpNeededCount: number;
    } | null;
  };
};

function readSearchValue(source: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = source?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clampMonthKey(value: string | null, fallback: string) {
  if (!value) return fallback;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return fallback;
  const month = Number(match[2]);
  if (!Number.isFinite(month) || month < 1 || month > 12) return fallback;
  return `${match[1]}-${match[2]}`;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function getMonthLabel(monthStart: Date, timeZone: string) {
  return formatInTimeZone(monthStart, timeZone, {
    month: "long",
    year: "numeric"
  });
}

function getQuarterLabel(monthStart: Date, timeZone: string) {
  const monthNumber = Number(formatInTimeZone(monthStart, timeZone, { month: "numeric" }));
  const year = Number(formatInTimeZone(monthStart, timeZone, { year: "numeric" }));
  const quarter = Math.floor((monthNumber - 1) / 3) + 1;
  return `Q${quarter} ${year}`;
}

function isRangeCustomValid(from: string | null, to: string | null) {
  if (!from || !to) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to);
}

function monthKeyToStart(monthKey: string, timeZone: string) {
  return zonedDateStringToUtcStart(`${monthKey}-01`, timeZone);
}

function normalizeResidentStatusFilter(value: string | null): AnalyticsDashboardResidentStatusFilter {
  if (
    value === "all-active" ||
    value === "active" ||
    value === "bed-bound" ||
    value === "hospitalized" ||
    value === "on-leave" ||
    value === "inactive" ||
    value === "all"
  ) {
    return value;
  }
  return "all-active";
}

function normalizeParticipationScope(value: string | null): AnalyticsDashboardParticipationScope {
  if (value === "group" || value === "one-to-one" || value === "all") return value;
  return "all";
}

function normalizeDocType(value: string | null): AnalyticsDashboardDocTypeFilter {
  if (
    value === "all" ||
    value === "progress" ||
    value === "one-to-one" ||
    value === "uda" ||
    value === "mds" ||
    value === "care-plan"
  ) {
    return value;
  }
  return "all";
}

export function parseAnalyticsDashboardFilters(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  timeZoneRaw: string | null | undefined,
  now = new Date()
): AnalyticsDashboardFilters {
  const timeZone = resolveTimeZone(timeZoneRaw);
  const currentMonthKey = zonedDateKey(startOfZonedMonth(now, timeZone), timeZone).slice(0, 7);

  const presetRaw = readSearchValue(searchParams, "preset");
  const preset: AnalyticsDashboardPreset =
    presetRaw === "this-month" || presetRaw === "last-month" || presetRaw === "quarter" || presetRaw === "custom"
      ? presetRaw
      : "this-month";

  const selectedMonth = clampMonthKey(readSearchValue(searchParams, "month"), currentMonthKey);

  const participationLevelRaw = readSearchValue(searchParams, "participationLevel");
  const responseTypeRaw = readSearchValue(searchParams, "responseType");
  const moodRaw = readSearchValue(searchParams, "mood");

  return {
    preset,
    selectedMonth,
    customFrom: readSearchValue(searchParams, "from"),
    customTo: readSearchValue(searchParams, "to"),
    compare: readSearchValue(searchParams, "compare") === "1",
    unitId: readSearchValue(searchParams, "unitId"),
    activityCategory: readSearchValue(searchParams, "category"),
    participationScope: normalizeParticipationScope(readSearchValue(searchParams, "participationScope")),
    residentStatus: normalizeResidentStatusFilter(readSearchValue(searchParams, "residentStatus")),
    participationLevel:
      participationLevelRaw && PARTICIPATION_LEVEL_OPTIONS.includes(participationLevelRaw as ParticipationLevel)
        ? (participationLevelRaw as ParticipationLevel)
        : null,
    responseType:
      responseTypeRaw && RESPONSE_TYPE_OPTIONS.includes(responseTypeRaw as ResponseType)
        ? (responseTypeRaw as ResponseType)
        : null,
    mood: moodRaw && MOOD_OPTIONS.includes(moodRaw as MoodAffect) ? (moodRaw as MoodAffect) : null,
    staffId: readSearchValue(searchParams, "staffId"),
    docType: normalizeDocType(readSearchValue(searchParams, "docType"))
  };
}

/**
 * Month-scoping rule:
 * - All month presets resolve [start, endExclusive) using calendar month boundaries in facility timezone.
 * - This prevents carry-over and guarantees each month is a fresh bucket.
 */
export function resolveAnalyticsDashboardRange(
  filters: AnalyticsDashboardFilters,
  timeZoneRaw: string | null | undefined,
  now = new Date()
): AnalyticsDashboardRange {
  const timeZone = resolveTimeZone(timeZoneRaw);
  const fallbackMonthStart = startOfZonedMonth(now, timeZone);
  const selectedStart = monthKeyToStart(filters.selectedMonth, timeZone) ?? fallbackMonthStart;

  if (filters.preset === "this-month") {
    return {
      preset: filters.preset,
      selectedMonth: filters.selectedMonth,
      start: selectedStart,
      endExclusive: startOfZonedMonthShift(selectedStart, timeZone, 1),
      label: getMonthLabel(selectedStart, timeZone),
      monthScoped: true,
      timeZone
    };
  }

  if (filters.preset === "last-month") {
    const start = startOfZonedMonthShift(selectedStart, timeZone, -1);
    return {
      preset: filters.preset,
      selectedMonth: zonedDateKey(start, timeZone).slice(0, 7),
      start,
      endExclusive: startOfZonedMonthShift(start, timeZone, 1),
      label: getMonthLabel(start, timeZone),
      monthScoped: true,
      timeZone
    };
  }

  if (filters.preset === "quarter") {
    const monthNumber = Number(formatInTimeZone(selectedStart, timeZone, { month: "numeric" }));
    const quarterIndex = Math.floor((monthNumber - 1) / 3);
    const quarterStartMonth = quarterIndex * 3 + 1;
    const quarterStartKey = `${formatInTimeZone(selectedStart, timeZone, { year: "numeric" })}-${String(quarterStartMonth).padStart(2, "0")}`;
    const quarterStart = monthKeyToStart(quarterStartKey, timeZone) ?? selectedStart;

    return {
      preset: filters.preset,
      selectedMonth: filters.selectedMonth,
      start: quarterStart,
      endExclusive: startOfZonedMonthShift(quarterStart, timeZone, 3),
      label: getQuarterLabel(quarterStart, timeZone),
      monthScoped: false,
      timeZone
    };
  }

  if (isRangeCustomValid(filters.customFrom, filters.customTo)) {
    const fromStart = zonedDateStringToUtcStart(filters.customFrom as string, timeZone);
    const toStart = zonedDateStringToUtcStart(filters.customTo as string, timeZone);

    if (fromStart && toStart) {
      const start = fromStart <= toStart ? fromStart : toStart;
      const endStart = fromStart <= toStart ? toStart : fromStart;
      const endExclusive = addZonedDays(endStart, timeZone, 1);
      return {
        preset: filters.preset,
        selectedMonth: filters.selectedMonth,
        start,
        endExclusive,
        label: `${formatInTimeZone(start, timeZone, { month: "short", day: "numeric", year: "numeric" })} - ${formatInTimeZone(
          new Date(endExclusive.getTime() - 1),
          timeZone,
          { month: "short", day: "numeric", year: "numeric" }
        )}`,
        monthScoped: false,
        timeZone
      };
    }
  }

  return {
    preset: "this-month",
    selectedMonth: zonedDateKey(fallbackMonthStart, timeZone).slice(0, 7),
    start: fallbackMonthStart,
    endExclusive: startOfZonedMonthShift(fallbackMonthStart, timeZone, 1),
    label: getMonthLabel(fallbackMonthStart, timeZone),
    monthScoped: true,
    timeZone
  };
}

export function resolveComparisonRange(current: AnalyticsDashboardRange): AnalyticsDashboardRange {
  if (current.preset === "this-month" || current.preset === "last-month") {
    const start = startOfZonedMonthShift(current.start, current.timeZone, -1);
    return {
      ...current,
      start,
      endExclusive: current.start,
      label: getMonthLabel(start, current.timeZone),
      selectedMonth: zonedDateKey(start, current.timeZone).slice(0, 7),
      monthScoped: true
    };
  }

  if (current.preset === "quarter") {
    const start = startOfZonedMonthShift(current.start, current.timeZone, -3);
    return {
      ...current,
      start,
      endExclusive: current.start,
      label: getQuarterLabel(start, current.timeZone),
      selectedMonth: zonedDateKey(start, current.timeZone).slice(0, 7),
      monthScoped: false
    };
  }

  const duration = current.endExclusive.getTime() - current.start.getTime();
  const start = new Date(current.start.getTime() - duration);
  const endExclusive = current.start;

  return {
    ...current,
    start,
    endExclusive,
    label: `${formatInTimeZone(start, current.timeZone, {
      month: "short",
      day: "numeric",
      year: "numeric"
    })} - ${formatInTimeZone(new Date(endExclusive.getTime() - 1), current.timeZone, {
      month: "short",
      day: "numeric",
      year: "numeric"
    })}`,
    monthScoped: false
  };
}

export function analyticsDashboardFiltersToQueryString(filters: AnalyticsDashboardFilters) {
  const params = new URLSearchParams();
  params.set("preset", filters.preset);
  params.set("month", filters.selectedMonth);
  if (filters.customFrom) params.set("from", filters.customFrom);
  if (filters.customTo) params.set("to", filters.customTo);
  if (filters.compare) params.set("compare", "1");
  if (filters.unitId) params.set("unitId", filters.unitId);
  if (filters.activityCategory) params.set("category", filters.activityCategory);
  if (filters.participationScope !== "all") params.set("participationScope", filters.participationScope);
  if (filters.residentStatus !== "all-active") params.set("residentStatus", filters.residentStatus);
  if (filters.participationLevel) params.set("participationLevel", filters.participationLevel);
  if (filters.responseType) params.set("responseType", filters.responseType);
  if (filters.mood) params.set("mood", filters.mood);
  if (filters.staffId) params.set("staffId", filters.staffId);
  if (filters.docType !== "all") params.set("docType", filters.docType);
  return params.toString();
}

function buildResidentWhere(filters: AnalyticsDashboardFilters) {
  const statusFilter: Record<AnalyticsDashboardResidentStatusFilter, { in?: ResidentStatus[]; equals?: ResidentStatus; notIn?: ResidentStatus[] }> = {
    "all-active": { notIn: INACTIVE_RESIDENT_STATUSES },
    active: { equals: "ACTIVE" },
    "bed-bound": { equals: "BED_BOUND" },
    hospitalized: { equals: "HOSPITALIZED" },
    "on-leave": { equals: "ON_LEAVE" },
    inactive: { in: INACTIVE_RESIDENT_STATUSES },
    all: {}
  };

  const rule = statusFilter[filters.residentStatus];

  return {
    ...(filters.unitId ? { unitId: filters.unitId } : {}),
    ...(rule.equals ? { status: rule.equals } : {}),
    ...(rule.in ? { status: { in: rule.in } } : {}),
    ...(rule.notIn ? { status: { notIn: rule.notIn } } : {})
  };
}

function classifyNote(note: NoteCore): NoteMetaCore {
  const kind = inferDocumentationKind({ noteType: note.noteType, narrative: note.narrative });
  const status = inferDocumentationStatus(note.narrative);
  const dueDateIso = inferDocumentationDueDate(note.narrative);
  const meta = parseDocumentationMeta(note.narrative);

  return {
    id: note.id,
    residentId: note.residentId,
    residentName: note.residentName,
    room: note.room,
    unitName: note.unitName,
    kind,
    status,
    dueDateIso,
    assignedStaff: meta?.assignedStaff ?? null,
    followUp: note.followUp,
    createdAt: note.createdAt,
    createdByName: note.createdByName
  };
}

function filterNoteByDocType(note: NoteMetaCore, docType: AnalyticsDashboardDocTypeFilter) {
  if (docType === "all") return true;
  if (docType === "progress") return note.kind === "PROGRESS";
  if (docType === "one-to-one") return note.kind === "ONE_TO_ONE";
  if (docType === "uda") return note.kind === "UDA";
  if (docType === "mds") return note.kind === "MDS";
  return false;
}

function residentEligibleForRange(resident: ResidentCore, range: AnalyticsDashboardRange) {
  const anchor = resident.admissionDate ?? resident.createdAt;
  return anchor.getTime() < range.endExclusive.getTime();
}

function dayKeyLabel(date: Date, range: AnalyticsDashboardRange) {
  if (range.monthScoped) {
    return formatInTimeZone(date, range.timeZone, { day: "numeric" });
  }
  return formatInTimeZone(date, range.timeZone, { month: "short", day: "numeric" });
}

function buildDailyAxis(range: AnalyticsDashboardRange) {
  const maxDays = 124;
  const rows: Array<{ dayKey: string; label: string; value: number }> = [];
  let cursor = new Date(range.start.getTime());
  let guard = 0;
  while (cursor < range.endExclusive && guard < maxDays) {
    const dayKey = zonedDateKey(cursor, range.timeZone);
    rows.push({
      dayKey,
      label: dayKeyLabel(cursor, range),
      value: 0
    });
    cursor = addZonedDays(cursor, range.timeZone, 1);
    guard += 1;
  }
  return rows;
}

function computeAggregate(params: {
  range: AnalyticsDashboardRange;
  filters: AnalyticsDashboardFilters;
  residents: ResidentCore[];
  dataset: RangeDataset;
  previousParticipationMap?: Map<string, number>;
  activeCarePlans: CarePlanCore[];
}): ComputedAggregate {
  const { range, filters, residents, dataset, previousParticipationMap, activeCarePlans } = params;

  const eligibleResidents = residents.filter((resident) => residentEligibleForRange(resident, range));
  const eligibleResidentMap = new Map(eligibleResidents.map((resident) => [resident.id, resident]));

  const relevantAttendance =
    filters.participationScope === "one-to-one"
      ? []
      : dataset.attendanceRows.filter((row) => eligibleResidentMap.has(row.residentId));

  const supportiveAttendance = relevantAttendance.filter((row) => SUPPORTIVE_STATUSES.has(row.status));

  const relevantNotes = dataset.noteRows.filter((row) => {
    if (!eligibleResidentMap.has(row.residentId)) return false;
    if (!filterNoteByDocType(row, filters.docType)) return false;
    if (filters.participationScope === "group" && row.kind === "ONE_TO_ONE") return false;
    if (filters.participationScope === "one-to-one" && row.kind !== "ONE_TO_ONE") return false;
    if (filters.docType === "care-plan") return false;
    return true;
  });

  const oneToOneNotes = relevantNotes.filter((row) => row.kind === "ONE_TO_ONE");
  const oneToOneCompleted = oneToOneNotes.filter((row) => row.status === "COMPLETED").length;

  const participatingResidents = new Set<string>();
  for (const row of supportiveAttendance) participatingResidents.add(row.residentId);
  for (const row of oneToOneNotes) participatingResidents.add(row.residentId);

  const participationCountByResident = new Map<string, number>();
  const lastParticipationByResident = new Map<string, Date>();
  const categoryByResident = new Map<string, Map<string, number>>();

  for (const row of supportiveAttendance) {
    participationCountByResident.set(row.residentId, (participationCountByResident.get(row.residentId) ?? 0) + 1);
    const currentDate = lastParticipationByResident.get(row.residentId);
    if (!currentDate || row.occurredAt > currentDate) {
      lastParticipationByResident.set(row.residentId, row.occurredAt);
    }

    const categoryMap = categoryByResident.get(row.residentId) ?? new Map<string, number>();
    categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + 1);
    categoryByResident.set(row.residentId, categoryMap);
  }

  for (const row of oneToOneNotes) {
    participationCountByResident.set(row.residentId, (participationCountByResident.get(row.residentId) ?? 0) + 1);
    const currentDate = lastParticipationByResident.get(row.residentId);
    if (!currentDate || row.createdAt > currentDate) {
      lastParticipationByResident.set(row.residentId, row.createdAt);
    }
  }

  const categoryCounts = new Map<string, number>();
  for (const row of supportiveAttendance) {
    categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
  }

  const unitCounts = new Map<string, number>();
  for (const row of supportiveAttendance) {
    const resident = eligibleResidentMap.get(row.residentId);
    const unitName = resident?.unitName || "Unassigned";
    unitCounts.set(unitName, (unitCounts.get(unitName) ?? 0) + 1);
  }
  if (filters.participationScope === "one-to-one") {
    for (const row of oneToOneNotes) {
      const unitName = row.unitName || "Unassigned";
      unitCounts.set(unitName, (unitCounts.get(unitName) ?? 0) + 1);
    }
  }

  const dayRows = buildDailyAxis(range);
  const dayIndex = new Map(dayRows.map((item, index) => [item.dayKey, index]));

  for (const row of supportiveAttendance) {
    const dayKey = zonedDateKey(row.occurredAt, range.timeZone);
    const idx = dayIndex.get(dayKey);
    if (idx != null) dayRows[idx].value += 1;
  }

  if (filters.participationScope !== "group") {
    for (const row of oneToOneNotes) {
      const dayKey = zonedDateKey(row.createdAt, range.timeZone);
      const idx = dayIndex.get(dayKey);
      if (idx != null) dayRows[idx].value += 1;
    }
  }

  const progressCompleted = relevantNotes.filter((row) => row.kind === "PROGRESS" && row.status === "COMPLETED").length;
  const udaCompleted = relevantNotes.filter((row) => row.kind === "UDA" && row.status === "COMPLETED").length;
  const mdsCompleted = relevantNotes.filter((row) => row.kind === "MDS" && row.status === "COMPLETED").length;

  const relevantCarePlanReviews = dataset.carePlanReviews.filter((row) => eligibleResidentMap.has(row.residentId));
  const carePlanUpdatesCompleted = relevantCarePlanReviews.length;

  const expectedDocumentation = Math.max(eligibleResidents.length * 2, 0);
  const completedDocumentation =
    progressCompleted + oneToOneCompleted + udaCompleted + mdsCompleted + carePlanUpdatesCompleted;
  const documentationCompletionRate = expectedDocumentation > 0 ? Math.min(100, percent(completedDocumentation, expectedDocumentation)) : 0;

  const overdueRows: ComputedAggregate["docs"]["overdueRows"] = [];
  const now = new Date();

  for (const row of relevantNotes) {
    if (!row.dueDateIso) continue;
    if (row.status === "COMPLETED") continue;
    const dueAt = new Date(row.dueDateIso);
    if (Number.isNaN(dueAt.getTime())) continue;
    if (dueAt.getTime() >= now.getTime()) continue;

    overdueRows.push({
      id: row.id,
      residentName: row.residentName,
      room: row.room,
      docType: row.kind === "ONE_TO_ONE" ? "1:1 Note" : row.kind,
      dueDateIso: dueAt.toISOString(),
      status: row.status.replaceAll("_", " "),
      assignedTo: row.assignedStaff || row.createdByName
    });
  }

  for (const plan of activeCarePlans) {
    if (!eligibleResidentMap.has(plan.residentId)) continue;
    if (plan.status !== "ACTIVE") continue;
    if (plan.nextReviewDate.getTime() >= now.getTime()) continue;

    overdueRows.push({
      id: `cp-${plan.id}`,
      residentName: plan.residentName,
      room: plan.room,
      docType: "Care Plan Review",
      dueDateIso: plan.nextReviewDate.toISOString(),
      status: "OVERDUE",
      assignedTo: "Activities"
    });
  }

  overdueRows.sort((a, b) => new Date(a.dueDateIso).getTime() - new Date(b.dueDateIso).getTime());

  const residentRows = eligibleResidents
    .map((resident) => {
      const count = participationCountByResident.get(resident.id) ?? 0;
      const previousCount = previousParticipationMap?.get(resident.id) ?? 0;
      const trend: "up" | "down" | "flat" =
        count > previousCount ? "up" : count < previousCount ? "down" : "flat";

      const categories = categoryByResident.get(resident.id) ?? new Map<string, number>();
      const preferredCategory =
        [...categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No group data";

      const followUpFromNotes = relevantNotes.some(
        (note) => note.residentId === resident.id && Boolean(note.followUp && note.followUp.trim())
      );

      return {
        residentId: resident.id,
        residentName: resident.name,
        room: resident.room,
        unitName: resident.unitName,
        lastParticipatedDate: lastParticipationByResident.get(resident.id)?.toISOString() ?? null,
        participationCount: count,
        preferredCategory,
        trend,
        followUpFlag: resident.followUpFlag || followUpFromNotes
      };
    })
    .sort((a, b) => {
      if (a.participationCount === b.participationCount) {
        return a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
      }
      return a.participationCount - b.participationCount;
    });

  const buckets = {
    highlyEngaged: residentRows.filter((row) => row.participationCount >= 8).length,
    moderatelyEngaged: residentRows.filter((row) => row.participationCount >= 3 && row.participationCount < 8).length,
    lowEngagement: residentRows.filter((row) => row.participationCount >= 1 && row.participationCount < 3).length,
    noParticipation: residentRows.filter((row) => row.participationCount === 0).length
  };

  const followUpNeededResidents = new Set<string>();
  for (const row of residentRows) {
    if (row.followUpFlag) followUpNeededResidents.add(row.residentId);
  }

  const topActivityCategory =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No activity records yet";

  const bestAttendanceDay =
    [...dayRows].sort((a, b) => b.value - a.value)[0]?.label ?? "No participation yet";

  const lowestEngagementUnit =
    [...unitCounts.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? "No unit activity yet";

  const residentsNeedingOutreach = buckets.lowEngagement + buckets.noParticipation;
  const oneToOneCompletionLag = Math.max(eligibleResidents.length - new Set(oneToOneNotes.map((row) => row.residentId)).size, 0);

  return {
    eligibleResidents,
    monthParticipationRate: percent(participatingResidents.size, eligibleResidents.length),
    totalGroupAttendance: supportiveAttendance.length,
    oneToOneCompleted,
    residentsEngaged: participatingResidents.size,
    documentationCompletionRate,
    residentsNoParticipation: buckets.noParticipation,
    topActivityCategory,
    followUpNeededCount: followUpNeededResidents.size,
    dailyTrend: dayRows.map((item) => ({ label: item.label, value: item.value })),
    groupVsOneToOne: [
      { label: "Group", value: supportiveAttendance.length },
      { label: "1:1", value: oneToOneCompleted }
    ],
    categoryPerformance: [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
    unitEngagement: [...unitCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
    residentRows,
    buckets,
    docs: {
      progressCompleted,
      oneToOneCompleted,
      udaCompleted,
      mdsCompleted,
      carePlanUpdatesCompleted,
      overdueCount: overdueRows.length,
      overdueRows: overdueRows.slice(0, 40)
    },
    insights: {
      mostAttendedCategory: topActivityCategory,
      residentsNeedingOutreach,
      bestAttendanceDay,
      lowestEngagementUnit,
      documentationCompletionRate,
      oneToOneCompletionLag
    }
  };
}

async function fetchRangeDataset(params: {
  facilityId: string;
  range: AnalyticsDashboardRange;
  residentIds: string[];
  filters: AnalyticsDashboardFilters;
}): Promise<RangeDataset> {
  const { facilityId, range, residentIds, filters } = params;
  if (residentIds.length === 0) {
    return {
      attendanceRows: [],
      noteRows: [],
      carePlanReviews: []
    };
  }

  const residentIdFilter = { in: residentIds };

  const shouldFetchAttendance = filters.participationScope !== "one-to-one";

  const attendancePromise = shouldFetchAttendance
    ? prisma.attendance.findMany({
        where: {
          residentId: residentIdFilter,
          activityInstance: {
            facilityId,
            startAt: {
              gte: range.start,
              lt: range.endExclusive
            },
            ...(filters.activityCategory
              ? {
                  template: {
                    category: filters.activityCategory
                  }
                }
              : {})
          }
        },
        select: {
          residentId: true,
          status: true,
          activityInstance: {
            select: {
              startAt: true,
              title: true,
              location: true,
              template: {
                select: {
                  category: true
                }
              }
            }
          }
        }
      })
    : Promise.resolve([] as Array<{
        residentId: string;
        status: AttendanceStatus;
        activityInstance: {
          startAt: Date;
          title: string;
          location: string;
          template: { category: string } | null;
        };
      }>);

  const notePromise = prisma.progressNote.findMany({
    where: {
      residentId: residentIdFilter,
      createdAt: {
        gte: range.start,
        lt: range.endExclusive
      },
      ...(filters.staffId ? { createdByUserId: filters.staffId } : {}),
      ...(filters.participationScope === "group"
        ? { type: "GROUP" }
        : filters.participationScope === "one-to-one"
          ? { type: "ONE_TO_ONE" }
          : {}),
      ...(filters.participationLevel ? { participationLevel: filters.participationLevel } : {}),
      ...(filters.responseType ? { response: filters.responseType } : {}),
      ...(filters.mood ? { moodAffect: filters.mood } : {})
    },
    select: {
      id: true,
      residentId: true,
      type: true,
      createdAt: true,
      participationLevel: true,
      response: true,
      moodAffect: true,
      followUp: true,
      narrative: true,
      createdByUserId: true,
      resident: {
        select: {
          firstName: true,
          lastName: true,
          room: true,
          unit: {
            select: {
              name: true
            }
          }
        }
      },
      createdByUser: {
        select: {
          name: true
        }
      }
    }
  });

  const reviewPromise = prisma.carePlanReview.findMany({
    where: {
      reviewDate: {
        gte: range.start,
        lt: range.endExclusive
      },
      carePlan: {
        residentId: residentIdFilter
      },
      ...(filters.staffId ? { createdByUserId: filters.staffId } : {})
    },
    select: {
      id: true,
      reviewDate: true,
      createdByUserId: true,
      carePlan: {
        select: {
          residentId: true,
          resident: {
            select: {
              firstName: true,
              lastName: true,
              room: true
            }
          }
        }
      }
    }
  });

  const [attendanceRowsRaw, noteRowsRaw, reviewRowsRaw] = await Promise.all([
    attendancePromise,
    notePromise,
    reviewPromise
  ]);

  const attendanceRows: AttendanceCore[] = attendanceRowsRaw.map((row) => ({
    residentId: row.residentId,
    status: row.status,
    occurredAt: row.activityInstance.startAt,
    title: row.activityInstance.title,
    category: row.activityInstance.template?.category ?? "Uncategorized",
    location: row.activityInstance.location || "Unassigned"
  }));

  const noteRows = noteRowsRaw.map<NoteCore>((row) => ({
    id: row.id,
    residentId: row.residentId,
    residentName: `${row.resident.firstName} ${row.resident.lastName}`,
    room: row.resident.room,
    unitName: row.resident.unit?.name ?? "Unassigned",
    noteType: row.type,
    createdAt: row.createdAt,
    participationLevel: row.participationLevel,
    response: row.response,
    mood: row.moodAffect,
    followUp: row.followUp,
    narrative: row.narrative,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByUser.name || "Unknown"
  }));

  const classifiedNotes = noteRows
    .map((row) => classifyNote(row))
    .filter((row) => filterNoteByDocType(row, filters.docType));

  const carePlanReviews: CarePlanReviewCore[] = reviewRowsRaw.map((row) => ({
    id: row.id,
    residentId: row.carePlan.residentId,
    residentName: `${row.carePlan.resident.firstName} ${row.carePlan.resident.lastName}`,
    room: row.carePlan.resident.room,
    reviewDate: row.reviewDate,
    createdByUserId: row.createdByUserId
  }));

  return {
    attendanceRows,
    noteRows: classifiedNotes,
    carePlanReviews
  };
}

function buildComparisonDelta(current: number, previous: number, suffix = "") {
  const delta = Number((current - previous).toFixed(1));
  const tone: "up" | "down" | "flat" = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const sign = delta > 0 ? "+" : "";
  const rounded = Number.isInteger(delta) ? delta.toFixed(0) : delta.toFixed(1);
  return {
    label: `${sign}${rounded}${suffix}`,
    tone
  };
}

export async function getAnalyticsDashboardSnapshot(params: {
  facilityId: string;
  timeZone: string;
  filters: AnalyticsDashboardFilters;
}): Promise<AnalyticsDashboardSnapshot> {
  const { facilityId, timeZone, filters } = params;
  const range = resolveAnalyticsDashboardRange(filters, timeZone);
  const compareRange = resolveComparisonRange(range);

  const [units, categories, staff, residentsRaw] = await Promise.all([
    prisma.unit.findMany({
      where: { facilityId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.activityTemplate.findMany({
      where: { facilityId },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" }
    }),
    prisma.user.findMany({
      where: { facilityId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.resident.findMany({
      where: {
        facilityId,
        ...buildResidentWhere(filters)
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        admissionDate: true,
        createdAt: true,
        followUpFlag: true,
        unit: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }]
    })
  ]);

  const residents: ResidentCore[] = residentsRaw.map((resident) => ({
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`,
    room: resident.room,
    unitName: resident.unit?.name ?? "Unassigned",
    status: resident.status,
    admissionDate: resident.admissionDate,
    createdAt: resident.createdAt,
    followUpFlag: resident.followUpFlag
  }));

  const residentIds = residents.map((resident) => resident.id);

  const [activeCarePlansRaw, currentDataset, previousDataset] = await Promise.all([
    prisma.carePlan.findMany({
      where: {
        residentId: {
          in: residentIds.length > 0 ? residentIds : ["__none__"]
        }
      },
      select: {
        id: true,
        residentId: true,
        nextReviewDate: true,
        status: true,
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    fetchRangeDataset({ facilityId, range, residentIds, filters }),
    fetchRangeDataset({ facilityId, range: compareRange, residentIds, filters })
  ]);

  const activeCarePlans: CarePlanCore[] = activeCarePlansRaw.map((plan) => ({
    id: plan.id,
    residentId: plan.residentId,
    residentName: `${plan.resident.firstName} ${plan.resident.lastName}`,
    room: plan.resident.room,
    nextReviewDate: plan.nextReviewDate,
    status: plan.status
  }));

  const previousAggregateForTrend = computeAggregate({
    range: compareRange,
    filters,
    residents,
    dataset: previousDataset,
    activeCarePlans
  });

  const previousParticipationMap = new Map(
    previousAggregateForTrend.residentRows.map((row) => [row.residentId, row.participationCount])
  );

  const currentAggregate = computeAggregate({
    range,
    filters,
    residents,
    dataset: currentDataset,
    previousParticipationMap,
    activeCarePlans
  });

  const previousAggregate = previousAggregateForTrend;

  const comparisonEnabled = filters.compare;

  const comparison = comparisonEnabled
    ? {
        monthParticipationRate: previousAggregate.monthParticipationRate,
        totalGroupAttendance: previousAggregate.totalGroupAttendance,
        oneToOneCompleted: previousAggregate.oneToOneCompleted,
        residentsEngaged: previousAggregate.residentsEngaged,
        documentationCompletionRate: previousAggregate.documentationCompletionRate,
        residentsNoParticipation: previousAggregate.residentsNoParticipation,
        followUpNeededCount: previousAggregate.followUpNeededCount
      }
    : null;

  const kpiRows: AnalyticsDashboardSnapshot["kpis"] = [
    {
      key: "participation-rate",
      label: range.monthScoped ? "Monthly Participation Rate" : "Participation Rate",
      value: `${currentAggregate.monthParticipationRate.toFixed(1)}%`,
      helper: `${currentAggregate.residentsEngaged} of ${currentAggregate.eligibleResidents.length} eligible residents engaged`,
      delta: comparison
        ? buildComparisonDelta(currentAggregate.monthParticipationRate, comparison.monthParticipationRate, " pts").label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.monthParticipationRate, comparison.monthParticipationRate, " pts").tone
        : "flat"
    },
    {
      key: "group-attendance",
      label: range.monthScoped ? "Total Group Attendance This Month" : "Total Group Attendance",
      value: String(currentAggregate.totalGroupAttendance),
      helper:
        currentAggregate.totalGroupAttendance === 0
          ? "No group attendance records in this period"
          : "Supportive attendance entries in selected range",
      delta: comparison
        ? buildComparisonDelta(currentAggregate.totalGroupAttendance, comparison.totalGroupAttendance).label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.totalGroupAttendance, comparison.totalGroupAttendance).tone
        : "flat"
    },
    {
      key: "one-to-one",
      label: range.monthScoped ? "1:1 Visits Completed This Month" : "1:1 Visits Completed",
      value: String(currentAggregate.oneToOneCompleted),
      helper:
        currentAggregate.oneToOneCompleted === 0
          ? "No completed 1:1 notes in this period"
          : "Completed 1:1 documentation entries",
      delta: comparison
        ? buildComparisonDelta(currentAggregate.oneToOneCompleted, comparison.oneToOneCompleted).label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.oneToOneCompleted, comparison.oneToOneCompleted).tone
        : "flat"
    },
    {
      key: "residents-engaged",
      label: range.monthScoped ? "Residents Engaged This Month" : "Residents Engaged",
      value: String(currentAggregate.residentsEngaged),
      helper:
        currentAggregate.residentsEngaged === 0
          ? "No resident participation records yet"
          : "Unique residents with qualifying engagement",
      delta: comparison
        ? buildComparisonDelta(currentAggregate.residentsEngaged, comparison.residentsEngaged).label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.residentsEngaged, comparison.residentsEngaged).tone
        : "flat"
    },
    {
      key: "doc-completion",
      label: range.monthScoped ? "Documentation Completion Rate This Month" : "Documentation Completion Rate",
      value: `${currentAggregate.documentationCompletionRate.toFixed(1)}%`,
      helper:
        currentAggregate.documentationCompletionRate === 0
          ? "No completed documentation records yet"
          : "Completed documentation vs expected monthly baseline",
      delta: comparison
        ? buildComparisonDelta(currentAggregate.documentationCompletionRate, comparison.documentationCompletionRate, " pts").label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.documentationCompletionRate, comparison.documentationCompletionRate, " pts").tone
        : "flat"
    },
    {
      key: "no-participation",
      label: range.monthScoped ? "Residents With No Participation This Month" : "Residents With No Participation",
      value: String(currentAggregate.residentsNoParticipation),
      helper:
        currentAggregate.residentsNoParticipation === 0
          ? "All eligible residents have participation"
          : "Residents with zero participation in selected period",
      delta: comparison
        ? buildComparisonDelta(currentAggregate.residentsNoParticipation, comparison.residentsNoParticipation).label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.residentsNoParticipation, comparison.residentsNoParticipation).tone
        : "flat"
    },
    {
      key: "top-category",
      label: range.monthScoped ? "Top Activity Category This Month" : "Top Activity Category",
      value: currentAggregate.topActivityCategory,
      helper: "Most attended category based on supportive attendance",
      delta: null,
      deltaTone: "flat"
    },
    {
      key: "follow-up",
      label: range.monthScoped ? "Follow-Up Needed Count" : "Follow-Up Needed",
      value: String(currentAggregate.followUpNeededCount),
      helper: "Residents flagged by follow-up notes or profile flags",
      delta: comparison
        ? buildComparisonDelta(currentAggregate.followUpNeededCount, comparison.followUpNeededCount).label
        : null,
      deltaTone: comparison
        ? buildComparisonDelta(currentAggregate.followUpNeededCount, comparison.followUpNeededCount).tone
        : "flat"
    }
  ];

  return {
    filters,
    range,
    compareRange: comparisonEnabled ? compareRange : null,
    options: {
      units: units.map((unit) => ({ id: unit.id, label: unit.name })),
      categories: categories.map((category) => ({ key: category.category, label: category.category })),
      staff: staff.map((entry) => ({ id: entry.id, label: entry.name })),
      participationLevels: PARTICIPATION_LEVEL_OPTIONS,
      responseTypes: RESPONSE_TYPE_OPTIONS,
      moods: MOOD_OPTIONS
    },
    kpis: kpiRows,
    charts: {
      dailyTrend: currentAggregate.dailyTrend,
      groupVsOneToOne: currentAggregate.groupVsOneToOne,
      categoryPerformance: currentAggregate.categoryPerformance,
      unitEngagement: currentAggregate.unitEngagement
    },
    residents: {
      rows: currentAggregate.residentRows,
      buckets: currentAggregate.buckets
    },
    documentation: currentAggregate.docs,
    insights: currentAggregate.insights,
    comparison: {
      enabled: comparisonEnabled,
      previous: comparison
    }
  };
}
