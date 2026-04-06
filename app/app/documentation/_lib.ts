import {
  inferDocumentationAssignedStaff,
  inferDocumentationAssessmentType,
  inferDocumentationDueDate,
  inferDocumentationKind,
  inferDocumentationNoMajorChange,
  inferDocumentationPriority,
  inferDocumentationReviewDate,
  inferDocumentationSectionProgress,
  inferDocumentationSectionStates,
  inferDocumentationStatus,
  parseDocumentationMeta,
  stripDocumentationMeta
} from "@/lib/documentation/meta";
import { getDocumentationOverview } from "@/lib/documentation/service";
import type {
  DocumentationComplianceStatus,
  DocumentationAssessmentType,
  DocumentationKind,
  DocumentationListRow,
  DocumentationPriority,
  DocumentationSectionChangeState,
  DocumentationStatus
} from "@/lib/documentation/types";
import {
  normalizeDateOnlyInput,
  parseDateOnlyInputToUtcStart,
  toDateInputValueInTimeZone,
  toDateTimeLocalInputValueInTimeZone
} from "@/lib/datetime";
import { requireModulePage } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { buildResidentCompletionsMap, getResidentAssessmentSchedule } from "@/lib/residents/assessment-due";
import { addZonedDays, startOfZonedMonth, startOfZonedMonthShift } from "@/lib/timezone";

export type DocumentationResidentOption = {
  id: string;
  name: string;
  room: string;
  unit: string | null;
  age: number | null;
  admissionDateIso: string | null;
  status: string | null;
};

export type DocumentationEditorData = {
  id?: string;
  residentId: string;
  title: string;
  narrative: string;
  followUp: string;
  status: DocumentationStatus;
  priority: DocumentationPriority;
  dueDate: string;
  occurredAt: string;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  cuesRequired: "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
};

function toAge(birthDate: Date | null | undefined) {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

type DocumentationResidentSyncRow = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  birthDate: Date | null;
  status: string;
  admissionDate: Date | null;
  mdsManualDueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  unit: { name: string } | null;
};

type DocumentationNoteSyncRow = {
  id: string;
  residentId: string;
  type: "GROUP" | "ONE_TO_ONE";
  narrative: string;
  followUp: string | null;
  createdAt: Date;
  createdByUser: { name: string };
  resident: {
    firstName: string;
    lastName: string;
    room: string;
    birthDate: Date | null;
    unit: { name: string } | null;
  };
};

type DocumentationSyncContext = {
  residents: DocumentationResidentSyncRow[];
  notes: DocumentationNoteSyncRow[];
  monthStart: Date;
  monthEnd: Date;
  monthDueDateIso: string;
};

const INACTIVE_RESIDENT_STATUSES = new Set(["DISCHARGED", "TRANSFERRED", "DECEASED"]);

function isResidentEligibleForDocumentation(status: string | null | undefined) {
  if (!status) return true;
  return !INACTIVE_RESIDENT_STATUSES.has(status);
}

function mapComplianceToWorkflowStatus(status: DocumentationComplianceStatus): DocumentationStatus {
  if (status === "CURRENT" || status === "COMPLETED") return "COMPLETED";
  if (status === "FOLLOW_UP_NEEDED" || status === "DUE_SOON" || status === "DUE_THIS_MONTH") return "IN_PROGRESS";
  if (status === "OVERDUE" || status === "MISSING") return "READY_REVIEW";
  return "DRAFT";
}

function mapDueLevelToComplianceStatus(params: {
  level: string;
  dueDateIso: string | null;
  monthStart: Date;
  monthEnd: Date;
  hasCompletedEntry: boolean;
}): DocumentationComplianceStatus {
  if (params.hasCompletedEntry && params.level === "ON_TRACK") {
    return "CURRENT";
  }
  if (params.level === "OVERDUE") return "OVERDUE";
  if (
    params.level === "DUE_TODAY" ||
    params.level === "DUE_SOON_7" ||
    params.level === "DUE_SOON_14" ||
    params.level === "DUE_SOON_30"
  ) {
    if (params.dueDateIso) {
      const due = new Date(params.dueDateIso);
      if (!Number.isNaN(due.getTime()) && due >= params.monthStart && due < params.monthEnd) {
        return "DUE_THIS_MONTH";
      }
    }
    return "DUE_SOON";
  }
  if (params.level === "ON_TRACK") {
    return params.hasCompletedEntry ? "COMPLETED" : "CURRENT";
  }
  return "MISSING";
}

function daysFromNow(targetIso: string | null) {
  if (!targetIso) {
    return {
      daysUntilDue: null as number | null,
      daysOverdue: null as number | null
    };
  }

  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) {
    return {
      daysUntilDue: null as number | null,
      daysOverdue: null as number | null
    };
  }

  const now = new Date();
  const oneDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.ceil((target.getTime() - now.getTime()) / oneDay);
  if (daysUntilDue >= 0) {
    return {
      daysUntilDue,
      daysOverdue: null as number | null
    };
  }

  return {
    daysUntilDue,
    daysOverdue: Math.abs(daysUntilDue)
  };
}

function noteSummary(narrative: string, max = 180) {
  const raw = stripDocumentationMeta(narrative);
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 3)}...`;
}

async function getDocumentationSyncContext(facilityId: string, timeZone?: string | null): Promise<DocumentationSyncContext> {
  const now = new Date();
  const monthStart = startOfZonedMonth(now, timeZone);
  const monthEnd = startOfZonedMonthShift(now, timeZone, 1);
  const monthDueDateIso = toDateInputValueInTimeZone(addZonedDays(monthEnd, timeZone, -1), timeZone);

  const [residents, notes] = await Promise.all([
    prisma.resident.findMany({
      where: {
        facilityId
      },
      orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        birthDate: true,
        status: true,
        admissionDate: true,
        mdsManualDueDate: true,
        createdAt: true,
        updatedAt: true,
        unit: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 3500,
      include: {
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true,
            birthDate: true,
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
    })
  ]);

  return {
    residents: residents as DocumentationResidentSyncRow[],
    notes: notes.map((note) => ({
      ...note,
      type: note.type as "GROUP" | "ONE_TO_ONE"
    })) as DocumentationNoteSyncRow[],
    monthStart,
    monthEnd,
    monthDueDateIso
  };
}

function buildOneToOneCoverageRows(params: {
  context: DocumentationSyncContext;
  residentFilterId?: string;
}) {
  const rows: DocumentationListRow[] = [];
  const notesByResident = new Map<string, DocumentationNoteSyncRow[]>();

  for (const note of params.context.notes) {
    const kind = inferDocumentationKind({
      noteType: note.type,
      narrative: note.narrative
    });
    if (kind !== "ONE_TO_ONE") continue;
    const list = notesByResident.get(note.residentId) ?? [];
    list.push(note);
    notesByResident.set(note.residentId, list);
  }

  for (const resident of params.context.residents) {
    if (!isResidentEligibleForDocumentation(resident.status)) continue;
    if (params.residentFilterId && resident.id !== params.residentFilterId) continue;

    const residentNotes = notesByResident.get(resident.id) ?? [];
    const latestNote = residentNotes[0] ?? null;
    const monthlyNotes = residentNotes.filter((note) => note.createdAt >= params.context.monthStart && note.createdAt < params.context.monthEnd);
    const monthlyCompleted = monthlyNotes.filter((note) => inferDocumentationStatus(note.narrative) === "COMPLETED");
    const monthlyInFlight = monthlyNotes.filter((note) => inferDocumentationStatus(note.narrative) !== "COMPLETED");

    let complianceStatus: DocumentationComplianceStatus = "MISSING";
    if (monthlyCompleted.length > 0) {
      complianceStatus = "CURRENT";
    } else if (monthlyInFlight.length > 0) {
      complianceStatus = "FOLLOW_UP_NEEDED";
    }

    const latestCompleted = residentNotes.find((note) => inferDocumentationStatus(note.narrative) === "COMPLETED") ?? null;
    const dueStats = daysFromNow(params.context.monthDueDateIso);
    const label =
      complianceStatus === "CURRENT"
        ? `${monthlyCompleted.length} 1:1 note${monthlyCompleted.length === 1 ? "" : "s"} completed this month.`
        : complianceStatus === "FOLLOW_UP_NEEDED"
          ? `Draft/in-progress 1:1 note exists this month. Finalize follow-up documentation.`
          : "No completed 1:1 note logged this month.";

    const latestIso = latestNote?.createdAt.toISOString() ?? resident.updatedAt.toISOString();

    rows.push({
      id: latestNote?.id ?? `due-1to1-${resident.id}`,
      kind: "ONE_TO_ONE",
      status: mapComplianceToWorkflowStatus(complianceStatus),
      priority: complianceStatus === "MISSING" ? "HIGH" : complianceStatus === "FOLLOW_UP_NEEDED" ? "MEDIUM" : "LOW",
      title: "1:1 Monthly Coverage",
      summary: label,
      residentId: resident.id,
      residentName: `${resident.firstName} ${resident.lastName}`,
      residentRoom: resident.room,
      residentUnit: resident.unit?.name ?? null,
      residentBirthDateIso: resident.birthDate ? resident.birthDate.toISOString() : null,
      createdAtIso: latestIso,
      authorName: latestNote?.createdByUser?.name ?? "Documentation Queue",
      dueDateIso: params.context.monthDueDateIso,
      reviewDateIso: null,
      assessmentType: null,
      assignedStaff: latestNote ? inferDocumentationAssignedStaff(latestNote.narrative) : null,
      sectionProgress: latestNote ? inferDocumentationSectionProgress(latestNote.narrative) : null,
      noMajorChange: latestNote ? inferDocumentationNoMajorChange(latestNote.narrative) : null,
      hasFollowUp: Boolean(latestNote?.followUp && latestNote.followUp.trim().length > 0),
      complianceStatus,
      daysUntilDue: dueStats.daysUntilDue,
      daysOverdue: dueStats.daysOverdue,
      lastCompletedAtIso: latestCompleted?.createdAt.toISOString() ?? null,
      openHref: latestNote
        ? `/app/documentation/one-to-one/${encodeURIComponent(latestNote.id)}`
        : `/app/documentation/one-to-one/new?residentId=${encodeURIComponent(resident.id)}`,
      actionHref: `/app/documentation/one-to-one/new?residentId=${encodeURIComponent(resident.id)}`,
      actionLabel: complianceStatus === "CURRENT" ? "Add 1:1 Note" : "Add 1:1 Note",
      source: "DUE_TRACKER"
    });
  }

  return rows.sort((a, b) => {
    const aWeight = a.complianceStatus === "MISSING" ? 0 : a.complianceStatus === "FOLLOW_UP_NEEDED" ? 1 : 2;
    const bWeight = b.complianceStatus === "MISSING" ? 0 : b.complianceStatus === "FOLLOW_UP_NEEDED" ? 1 : 2;
    if (aWeight !== bWeight) return aWeight - bWeight;
    return a.residentRoom.localeCompare(b.residentRoom);
  });
}

function buildProgressRowsFromContext(params: {
  context: DocumentationSyncContext;
  kind?: DocumentationKind;
  residentFilterId?: string;
}) {
  return params.context.notes
    .filter((note) => {
      if (params.residentFilterId && note.residentId !== params.residentFilterId) return false;
      if (note.createdAt < params.context.monthStart || note.createdAt >= params.context.monthEnd) return false;
      const kind = inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      });
      if (params.kind && kind !== params.kind) return false;
      return kind === "PROGRESS" || kind === "ONE_TO_ONE" || kind === "UDA" || kind === "MDS";
    })
    .map((note) => {
      const kind = inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      });
      const dueDateIso = inferDocumentationDueDate(note.narrative);
      const summary = noteSummary(note.narrative, 160);

      return {
        id: note.id,
        kind,
        status: inferDocumentationStatus(note.narrative),
        priority: inferDocumentationPriority(note.narrative),
        title:
          note.followUp?.trim() ||
          (kind === "ONE_TO_ONE"
            ? "1:1 Documentation Entry"
            : kind === "PROGRESS"
              ? "Progress Documentation Entry"
              : kind === "UDA"
                ? "UDA Documentation Entry"
                : "MDS Documentation Entry"),
        summary,
        residentId: note.residentId,
        residentName: `${note.resident.firstName} ${note.resident.lastName}`,
        residentRoom: note.resident.room,
        residentUnit: note.resident.unit?.name ?? null,
        residentBirthDateIso: note.resident.birthDate ? note.resident.birthDate.toISOString() : null,
        createdAtIso: note.createdAt.toISOString(),
        authorName: note.createdByUser.name,
        dueDateIso,
        reviewDateIso: inferDocumentationReviewDate(note.narrative),
        assessmentType: inferDocumentationAssessmentType(note.narrative),
        assignedStaff: inferDocumentationAssignedStaff(note.narrative),
        sectionProgress: inferDocumentationSectionProgress(note.narrative),
        noMajorChange: inferDocumentationNoMajorChange(note.narrative),
        hasFollowUp: Boolean(note.followUp && note.followUp.trim().length > 0),
        complianceStatus: inferDocumentationStatus(note.narrative) === "COMPLETED" ? "COMPLETED" : null,
        openHref:
          kind === "PROGRESS"
            ? `/app/documentation/progress-notes/${encodeURIComponent(note.id)}`
            : kind === "ONE_TO_ONE"
              ? `/app/documentation/one-to-one/${encodeURIComponent(note.id)}`
              : kind === "UDA"
                ? `/app/documentation/uda/${encodeURIComponent(note.id)}`
                : `/app/documentation/mds/${encodeURIComponent(note.id)}`,
        source: "ENTRY"
      } satisfies DocumentationListRow;
    });
}

function complianceWeight(status: DocumentationComplianceStatus | null | undefined) {
  if (status === "OVERDUE" || status === "MISSING") return 0;
  if (status === "DUE_THIS_MONTH" || status === "DUE_SOON" || status === "FOLLOW_UP_NEEDED") return 1;
  if (status === "CURRENT" || status === "COMPLETED") return 2;
  return 3;
}

function isDueSoonCompliance(status: DocumentationComplianceStatus | null | undefined) {
  return status === "DUE_SOON" || status === "DUE_THIS_MONTH" || status === "FOLLOW_UP_NEEDED";
}

function isActionableComplianceStatus(status: DocumentationComplianceStatus | null | undefined) {
  return (
    status === "OVERDUE" ||
    status === "MISSING" ||
    status === "DUE_SOON" ||
    status === "DUE_THIS_MONTH" ||
    status === "FOLLOW_UP_NEEDED"
  );
}

function toDocumentationRowFromClinicalQueue(row: ClinicalAssessmentQueueRow): DocumentationListRow {
  const openHref = row.entryId
    ? `/app/documentation/${row.kind === "UDA" ? "uda" : "mds"}/${encodeURIComponent(row.entryId)}`
    : `${row.kind === "UDA" ? "/app/documentation/uda/new" : "/app/documentation/mds/new"}?residentId=${encodeURIComponent(row.residentId)}${row.kind === "UDA" ? `&assessmentType=${encodeURIComponent(row.assessmentType)}` : ""}`;

  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    priority: row.priority,
    title: row.title,
    summary: row.summary,
    residentId: row.residentId,
    residentName: row.residentName,
    residentRoom: row.residentRoom,
    residentUnit: row.residentUnit,
    residentBirthDateIso: null,
    createdAtIso: row.createdAtIso,
    authorName: row.authorName,
    dueDateIso: row.dueDateIso,
    reviewDateIso: row.reviewDateIso,
    assessmentType: row.assessmentType,
    assignedStaff: row.assignedStaff,
    sectionProgress: row.sectionProgress,
    noMajorChange: row.noMajorChange,
    hasFollowUp: false,
    complianceStatus: row.complianceStatus,
    lastCompletedAtIso: row.lastCompletedDateIso,
    openHref,
    actionHref: `${row.kind === "UDA" ? "/app/documentation/uda/new" : "/app/documentation/mds/new"}?residentId=${encodeURIComponent(row.residentId)}${row.kind === "UDA" ? `&assessmentType=${encodeURIComponent(row.assessmentType)}` : ""}`,
    actionLabel:
      row.entryId
        ? "Open"
        : row.kind === "UDA"
          ? row.assessmentType === "ADMISSION"
            ? "Start Admission UDA"
            : row.assessmentType === "QUARTERLY"
              ? "Start Quarterly UDA"
              : "Start Annual UDA"
          : "Start MDS",
    source: "DUE_TRACKER"
  };
}

export async function getDocumentationBaseContext() {
  const context = await requireModulePage("notes");

  const residents = await prisma.resident.findMany({
    where: {
      facilityId: context.facilityId,
      NOT: {
        status: { in: ["DISCHARGED", "TRANSFERRED", "DECEASED"] }
      }
    },
    orderBy: [{ room: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      room: true,
      birthDate: true,
      admissionDate: true,
      status: true,
      unit: {
        select: {
          name: true
        }
      }
    }
  });

  const residentOptions: DocumentationResidentOption[] = residents.map((resident) => ({
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`,
    room: resident.room,
    unit: resident.unit?.name ?? null,
    age: toAge(resident.birthDate),
    admissionDateIso: resident.admissionDate ? resident.admissionDate.toISOString() : null,
    status: resident.status ?? null
  }));

  return {
    context,
    residents: residentOptions
  };
}

export async function getDocumentationOverviewData(facilityId: string, timeZone?: string | null) {
  const context = await getDocumentationSyncContext(facilityId, timeZone);
  const progressRows = buildProgressRowsFromContext({
    context,
    kind: "PROGRESS"
  });
  const oneToOneCoverageRows = buildOneToOneCoverageRows({ context });
  const udaQueue = buildClinicalAssessmentQueueRows({
    context,
    kind: "UDA",
    timeZone
  });
  const mdsQueue = buildClinicalAssessmentQueueRows({
    context,
    kind: "MDS",
    timeZone
  });

  const clinicalRows: DocumentationListRow[] = [...udaQueue, ...mdsQueue].map(toDocumentationRowFromClinicalQueue);

  const rows = [...progressRows, ...oneToOneCoverageRows, ...clinicalRows];

  const overview = getDocumentationOverview(rows);
  const byKind = overview.byKind;

  const oneToOneMonthEntries = context.notes.filter((note) => {
    if (note.createdAt < context.monthStart || note.createdAt >= context.monthEnd) return false;
    return (
      inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      }) === "ONE_TO_ONE"
    );
  });

  const udaMonthEntries = context.notes.filter((note) => {
    if (note.createdAt < context.monthStart || note.createdAt >= context.monthEnd) return false;
    return (
      inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      }) === "UDA"
    );
  });

  const mdsMonthEntries = context.notes.filter((note) => {
    if (note.createdAt < context.monthStart || note.createdAt >= context.monthEnd) return false;
    return (
      inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      }) === "MDS"
    );
  });

  byKind.set("PROGRESS", {
    totalThisMonth: progressRows.length,
    draftCount: progressRows.filter((row) => row.status !== "COMPLETED").length,
    completedCount: progressRows.filter((row) => row.status === "COMPLETED").length,
    dueSoonCount: progressRows.filter((row) => isDueSoonCompliance(row.complianceStatus)).length
  });

  byKind.set("ONE_TO_ONE", {
    totalThisMonth: oneToOneMonthEntries.length,
    draftCount: oneToOneCoverageRows.filter((row) => row.complianceStatus === "MISSING" || row.complianceStatus === "FOLLOW_UP_NEEDED").length,
    completedCount: oneToOneCoverageRows.filter((row) => row.complianceStatus === "CURRENT" || row.complianceStatus === "COMPLETED").length,
    dueSoonCount: oneToOneCoverageRows.filter((row) => row.complianceStatus === "MISSING" || row.complianceStatus === "FOLLOW_UP_NEEDED").length
  });

  byKind.set("UDA", {
    totalThisMonth: udaMonthEntries.length,
    draftCount: udaQueue.filter((row) => row.status !== "COMPLETED").length,
    completedCount: udaQueue.filter((row) => row.complianceStatus === "CURRENT" || row.complianceStatus === "COMPLETED").length,
    dueSoonCount: udaQueue.filter((row) => isActionableComplianceStatus(row.complianceStatus)).length
  });

  byKind.set("MDS", {
    totalThisMonth: mdsMonthEntries.length,
    draftCount: mdsQueue.filter((row) => row.status !== "COMPLETED").length,
    completedCount: mdsQueue.filter((row) => row.complianceStatus === "CURRENT" || row.complianceStatus === "COMPLETED").length,
    dueSoonCount: mdsQueue.filter((row) => isActionableComplianceStatus(row.complianceStatus)).length
  });

  const oneToOneDue = oneToOneCoverageRows
    .filter((row) => row.complianceStatus === "MISSING" || row.complianceStatus === "FOLLOW_UP_NEEDED")
    .slice(0, 8);

  const recentProgress = progressRows.slice(0, 8);

  const sortByDue = (a: DocumentationListRow, b: DocumentationListRow) => {
    const aWeight = complianceWeight(a.complianceStatus);
    const bWeight = complianceWeight(b.complianceStatus);
    if (aWeight !== bWeight) return aWeight - bWeight;
    const aTime = parseDateOnlyInputToUtcStart(a.dueDateIso as string, timeZone)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bTime = parseDateOnlyInputToUtcStart(b.dueDateIso as string, timeZone)?.getTime() ?? Number.POSITIVE_INFINITY;
    return aTime - bTime;
  };

  const udaDue = clinicalRows
    .filter((row) => row.kind === "UDA" && row.complianceStatus !== "CURRENT" && row.complianceStatus !== "COMPLETED")
    .sort(sortByDue)
    .slice(0, 8);

  const mdsDue = clinicalRows
    .filter((row) => row.kind === "MDS" && row.complianceStatus !== "CURRENT" && row.complianceStatus !== "COMPLETED")
    .sort(sortByDue)
    .slice(0, 8);

  const totalTrackable = oneToOneCoverageRows.length + clinicalRows.length;
  const completedTrackable =
    oneToOneCoverageRows.filter((row) => row.complianceStatus === "CURRENT" || row.complianceStatus === "COMPLETED").length +
    clinicalRows.filter((row) => row.complianceStatus === "CURRENT" || row.complianceStatus === "COMPLETED").length;
  const completionPercentage = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;

  return {
    rows,
    overview,
    oneToOneDue,
    recentProgress,
    udaDue,
    mdsDue,
    completionPercentage
  };
}

export async function getDocumentationRowsForKind(
  facilityId: string,
  kind?: DocumentationKind,
  timeZone?: string | null
) {
  const context = await getDocumentationSyncContext(facilityId, timeZone);

  if (kind === "ONE_TO_ONE") {
    return buildOneToOneCoverageRows({ context });
  }

  if (kind === "PROGRESS") {
    return buildProgressRowsFromContext({
      context,
      kind: "PROGRESS"
    });
  }

  if (kind === "UDA") {
    return buildClinicalAssessmentQueueRows({
      context,
      kind: "UDA",
      timeZone
    }).map(toDocumentationRowFromClinicalQueue);
  }

  if (kind === "MDS") {
    return buildClinicalAssessmentQueueRows({
      context,
      kind: "MDS",
      timeZone
    }).map(toDocumentationRowFromClinicalQueue);
  }

  return [
    ...buildProgressRowsFromContext({
      context,
      kind: "PROGRESS"
    }),
    ...buildOneToOneCoverageRows({ context }),
    ...buildClinicalAssessmentQueueRows({
      context,
      kind: "UDA",
      timeZone
    }).map(toDocumentationRowFromClinicalQueue),
    ...buildClinicalAssessmentQueueRows({
      context,
      kind: "MDS",
      timeZone
    }).map(toDocumentationRowFromClinicalQueue)
  ];
}

export async function getDocumentationEntryForEditor(params: {
  facilityId: string;
  id: string;
  expectedKind: DocumentationKind;
  timeZone?: string | null;
}): Promise<DocumentationEditorData | null> {
  const note = await prisma.progressNote.findFirst({
    where: {
      id: params.id,
      resident: {
        facilityId: params.facilityId
      }
    },
    select: {
      id: true,
      type: true,
      residentId: true,
      participationLevel: true,
      moodAffect: true,
      cuesRequired: true,
      response: true,
      followUp: true,
      narrative: true,
      createdAt: true
    }
  });

  if (!note) return null;

  const kind = inferDocumentationKind({ noteType: note.type, narrative: note.narrative });
  if (kind !== params.expectedKind) return null;

  const dueDateIso = inferDocumentationDueDate(note.narrative);

  return {
    id: note.id,
    residentId: note.residentId,
    title: note.followUp?.trim() || "",
    narrative: stripDocumentationMeta(note.narrative),
    followUp: note.followUp?.trim() || "",
    status: inferDocumentationStatus(note.narrative),
    priority: inferDocumentationPriority(note.narrative),
    dueDate: normalizeDateOnlyInput(dueDateIso, params.timeZone),
    occurredAt: toDateTimeLocalInputValueInTimeZone(note.createdAt, params.timeZone),
    participationLevel: note.participationLevel,
    moodAffect: note.moodAffect,
    cuesRequired: note.cuesRequired,
    response: note.response
  };
}

export function getDefaultDocumentationEditorData(params: {
  kind: DocumentationKind;
  residentId?: string;
  title?: string;
  narrative?: string;
  followUp?: string;
  timeZone?: string | null;
}): DocumentationEditorData {
  const defaultResponse = params.kind === "ONE_TO_ONE" ? "POSITIVE" : "NEUTRAL";

  return {
    residentId: params.residentId ?? "",
    title: params.title?.trim() ?? "",
    narrative: params.narrative?.trim() ?? "",
    followUp: params.followUp?.trim() ?? "",
    status: "DRAFT",
    priority: "MEDIUM",
    dueDate: "",
    occurredAt: toDateTimeLocalInputValueInTimeZone(new Date(), params.timeZone),
    participationLevel: "MODERATE",
    moodAffect: "CALM",
    cuesRequired: "VERBAL",
    response: defaultResponse,
  };
}

export function mapRowsByStatus(rows: DocumentationListRow[]): Record<DocumentationStatus, DocumentationListRow[]> {
  return {
    DRAFT: rows.filter((row) => row.status === "DRAFT"),
    IN_PROGRESS: rows.filter((row) => row.status === "IN_PROGRESS"),
    READY_REVIEW: rows.filter((row) => row.status === "READY_REVIEW"),
    COMPLETED: rows.filter((row) => row.status === "COMPLETED")
  };
}

export type ClinicalAssessmentKind = "UDA" | "MDS";

export type ClinicalAssessmentQueueRow = {
  id: string;
  entryId: string | null;
  kind: ClinicalAssessmentKind;
  status: DocumentationStatus;
  complianceStatus: DocumentationComplianceStatus;
  priority: DocumentationPriority;
  residentId: string;
  residentName: string;
  residentRoom: string;
  residentUnit: string | null;
  residentAge: number | null;
  residentAdmissionDateIso: string | null;
  assessmentType: DocumentationAssessmentType;
  title: string;
  summary: string;
  createdAtIso: string;
  dueDateIso: string | null;
  reviewDateIso: string | null;
  authorName: string;
  assignedStaff: string | null;
  sectionProgress: number | null;
  noMajorChange: boolean | null;
  lastCompletedDateIso: string | null;
  isOverdue: boolean;
  isDueSoon: boolean;
};

export type ClinicalAssessmentHistoryRow = {
  id: string;
  kind: ClinicalAssessmentKind;
  assessmentType: DocumentationAssessmentType;
  status: DocumentationStatus;
  createdAtIso: string;
  dueDateIso: string | null;
  reviewDateIso: string | null;
  authorName: string;
  assignedStaff: string | null;
  summary: string;
  narrative: string;
  sectionStates: Record<string, DocumentationSectionChangeState> | null;
};

export type ClinicalAssessmentEditorData = DocumentationEditorData & {
  assessmentType: DocumentationAssessmentType;
  reviewDate: string;
  assignedStaff: string;
  noMajorChange: boolean;
  sectionStates: Record<string, DocumentationSectionChangeState>;
  carryForwardFromId: string;
};

function normalizeAssessmentType(kind: ClinicalAssessmentKind, value: DocumentationAssessmentType | null) {
  if (kind === "UDA") {
    if (value === "ADMISSION" || value === "ANNUAL" || value === "QUARTERLY") return value;
    return "ANNUAL";
  }
  return "SECTION_F";
}

function normalizeDateInput(value: string | null, timeZone?: string | null) {
  return normalizeDateOnlyInput(value, timeZone);
}

function clinicalQueueSortWeight(row: ClinicalAssessmentQueueRow) {
  const compliance = row.complianceStatus;
  if (compliance === "OVERDUE" || compliance === "MISSING") return 0;
  if (compliance === "DUE_THIS_MONTH" || compliance === "DUE_SOON" || compliance === "FOLLOW_UP_NEEDED") return 1;
  return 2;
}

function makeClinicalQueueRow(params: {
  kind: ClinicalAssessmentKind;
  resident: DocumentationResidentSyncRow;
  assessmentType: DocumentationAssessmentType;
  dueDateIso: string | null;
  dueLevel: string;
  lastCompletedDateIso: string | null;
  latestEntry: DocumentationNoteSyncRow | null;
  monthStart: Date;
  monthEnd: Date;
  timeZone?: string | null;
}): ClinicalAssessmentQueueRow {
  const hasCompletedEntry = Boolean(params.lastCompletedDateIso);
  let complianceStatus = mapDueLevelToComplianceStatus({
    level: params.dueLevel,
    dueDateIso: params.dueDateIso,
    monthStart: params.monthStart,
    monthEnd: params.monthEnd,
    hasCompletedEntry
  });

  const entryStatus = params.latestEntry ? inferDocumentationStatus(params.latestEntry.narrative) : null;
  if (params.latestEntry && entryStatus && entryStatus !== "COMPLETED" && complianceStatus === "CURRENT") {
    complianceStatus = "FOLLOW_UP_NEEDED";
  }

  const status = params.latestEntry
    ? inferDocumentationStatus(params.latestEntry.narrative)
    : mapComplianceToWorkflowStatus(complianceStatus);
  const priorityFromEntry = params.latestEntry ? inferDocumentationPriority(params.latestEntry.narrative) : null;
  const priority: DocumentationPriority =
    priorityFromEntry ??
    (complianceStatus === "OVERDUE" || complianceStatus === "MISSING"
      ? "HIGH"
      : complianceStatus === "DUE_THIS_MONTH" || complianceStatus === "DUE_SOON" || complianceStatus === "FOLLOW_UP_NEEDED"
        ? "MEDIUM"
        : "LOW");

  const reviewDateIso = params.latestEntry ? inferDocumentationReviewDate(params.latestEntry.narrative) : params.dueDateIso;
  const summary =
    params.latestEntry?.narrative
      ? noteSummary(params.latestEntry.narrative, 180)
      : complianceStatus === "OVERDUE"
        ? "Assessment is overdue and needs completion."
        : complianceStatus === "DUE_THIS_MONTH" || complianceStatus === "DUE_SOON"
          ? "Assessment is coming due soon."
          : complianceStatus === "MISSING"
            ? "No assessment history found for this resident."
            : "Assessment is current for this resident.";
  const dueStats = daysFromNow(params.dueDateIso);

  return {
    id: params.latestEntry?.id ?? `due-${params.kind}-${params.assessmentType}-${params.resident.id}`,
    entryId: params.latestEntry?.id ?? null,
    kind: params.kind,
    status,
    complianceStatus,
    priority,
    residentId: params.resident.id,
    residentName: `${params.resident.firstName} ${params.resident.lastName}`,
    residentRoom: params.resident.room,
    residentUnit: params.resident.unit?.name ?? null,
    residentAge: toAge(params.resident.birthDate),
    residentAdmissionDateIso: params.resident.admissionDate ? params.resident.admissionDate.toISOString() : null,
    assessmentType: params.assessmentType,
    title:
      params.latestEntry?.followUp?.trim() ||
      (params.kind === "UDA"
        ? params.assessmentType === "ADMISSION"
          ? "Admission UDA Assessment"
          : params.assessmentType === "QUARTERLY"
            ? "Quarterly UDA Assessment"
            : "Annual UDA Assessment"
        : "MDS Section F Support Entry"),
    summary,
    createdAtIso: params.latestEntry?.createdAt.toISOString() ?? params.resident.updatedAt.toISOString(),
    dueDateIso: params.dueDateIso,
    reviewDateIso,
    authorName: params.latestEntry?.createdByUser.name ?? "Documentation Queue",
    assignedStaff: params.latestEntry ? inferDocumentationAssignedStaff(params.latestEntry.narrative) : null,
    sectionProgress: params.latestEntry ? inferDocumentationSectionProgress(params.latestEntry.narrative) : null,
    noMajorChange: params.latestEntry ? inferDocumentationNoMajorChange(params.latestEntry.narrative) : null,
    lastCompletedDateIso: params.lastCompletedDateIso,
    isOverdue: complianceStatus === "OVERDUE" || (dueStats.daysOverdue ?? 0) > 0,
    isDueSoon:
      complianceStatus === "DUE_THIS_MONTH" ||
      complianceStatus === "DUE_SOON" ||
      complianceStatus === "FOLLOW_UP_NEEDED"
  };
}

function buildClinicalAssessmentQueueRows(params: {
  context: DocumentationSyncContext;
  kind: ClinicalAssessmentKind;
  timeZone?: string | null;
}) {
  const completionMap = buildResidentCompletionsMap(
    params.context.notes.map((note) => ({
      residentId: note.residentId,
      narrative: note.narrative,
      createdAt: note.createdAt
    }))
  );

  const candidateNotes = params.context.notes.filter((note) => {
    const kind = inferDocumentationKind({
      noteType: note.type,
      narrative: note.narrative
    });
    return kind === params.kind;
  });

  const latestByResidentAssessment = new Map<string, DocumentationNoteSyncRow>();
  for (const note of candidateNotes) {
    const assessmentType = normalizeAssessmentType(params.kind, inferDocumentationAssessmentType(note.narrative));
    const key = `${note.residentId}:${assessmentType}`;
    if (!latestByResidentAssessment.has(key)) {
      latestByResidentAssessment.set(key, note);
    }
  }

  const rows: ClinicalAssessmentQueueRow[] = [];

  for (const resident of params.context.residents) {
    if (!isResidentEligibleForDocumentation(resident.status)) continue;

    const schedule = getResidentAssessmentSchedule({
      admissionDate: resident.admissionDate,
      residentCreatedAt: resident.createdAt,
      mdsManualDueDate: resident.mdsManualDueDate,
      status: resident.status,
      completions: completionMap.get(resident.id),
      now: new Date()
    });

    if (params.kind === "UDA") {
      const admissionNote = latestByResidentAssessment.get(`${resident.id}:ADMISSION`) ?? null;
      const annualNote = latestByResidentAssessment.get(`${resident.id}:ANNUAL`) ?? null;
      const quarterlyNote = latestByResidentAssessment.get(`${resident.id}:QUARTERLY`) ?? null;

      rows.push(
        makeClinicalQueueRow({
          kind: "UDA",
          resident,
          assessmentType: "ADMISSION",
          dueDateIso: normalizeDateOnlyInput(schedule.admission.dueDateIso, params.timeZone) || null,
          dueLevel: schedule.admission.level,
          lastCompletedDateIso: schedule.admission.lastCompletedIso,
          latestEntry: admissionNote,
          monthStart: params.context.monthStart,
          monthEnd: params.context.monthEnd,
          timeZone: params.timeZone
        })
      );

      rows.push(
        makeClinicalQueueRow({
          kind: "UDA",
          resident,
          assessmentType: "ANNUAL",
          dueDateIso: normalizeDateOnlyInput(schedule.annual.dueDateIso, params.timeZone) || null,
          dueLevel: schedule.annual.level,
          lastCompletedDateIso: schedule.annual.lastCompletedIso,
          latestEntry: annualNote,
          monthStart: params.context.monthStart,
          monthEnd: params.context.monthEnd,
          timeZone: params.timeZone
        })
      );

      rows.push(
        makeClinicalQueueRow({
          kind: "UDA",
          resident,
          assessmentType: "QUARTERLY",
          dueDateIso: normalizeDateOnlyInput(schedule.quarterly.dueDateIso, params.timeZone) || null,
          dueLevel: schedule.quarterly.level,
          lastCompletedDateIso: schedule.quarterly.lastCompletedIso,
          latestEntry: quarterlyNote,
          monthStart: params.context.monthStart,
          monthEnd: params.context.monthEnd,
          timeZone: params.timeZone
        })
      );

      continue;
    }

    const sectionFNote = latestByResidentAssessment.get(`${resident.id}:SECTION_F`) ?? null;
    rows.push(
      makeClinicalQueueRow({
        kind: "MDS",
        resident,
        assessmentType: "SECTION_F",
        dueDateIso: normalizeDateOnlyInput(schedule.mds.dueDateIso, params.timeZone) || null,
        dueLevel: schedule.mds.level,
        lastCompletedDateIso: schedule.mds.lastCompletedIso,
        latestEntry: sectionFNote,
        monthStart: params.context.monthStart,
        monthEnd: params.context.monthEnd,
        timeZone: params.timeZone
      })
    );
  }

  return rows.sort((a, b) => {
    const weightDiff = clinicalQueueSortWeight(a) - clinicalQueueSortWeight(b);
    if (weightDiff !== 0) return weightDiff;

    const aDue = parseDateOnlyInputToUtcStart(a.dueDateIso, params.timeZone)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = parseDateOnlyInputToUtcStart(b.dueDateIso, params.timeZone)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return a.residentName.localeCompare(b.residentName);
  });
}

export async function getClinicalAssessmentQueueData(params: {
  facilityId: string;
  kind: ClinicalAssessmentKind;
  timeZone?: string | null;
}) {
  const context = await getDocumentationSyncContext(params.facilityId, params.timeZone);
  const queueRows = buildClinicalAssessmentQueueRows({
    context,
    kind: params.kind,
    timeZone: params.timeZone
  });

  const unitOptions = Array.from(new Set(queueRows.map((row) => row.residentUnit).filter((value): value is string => Boolean(value)))).sort();
  const staffOptions = Array.from(
    new Set(queueRows.map((row) => row.assignedStaff || row.authorName).filter((value): value is string => Boolean(value)))
  ).sort();

  return {
    rows: queueRows,
    unitOptions,
    staffOptions
  };
}

function mapToClinicalHistoryRow(params: {
  note: {
    id: string;
    type: "GROUP" | "ONE_TO_ONE";
    narrative: string;
    followUp: string | null;
    createdAt: Date;
    createdByUser: { name: string };
  };
  kind: ClinicalAssessmentKind;
}): ClinicalAssessmentHistoryRow {
  const note = params.note;
  const kind = params.kind;
  const assessmentType = normalizeAssessmentType(kind, inferDocumentationAssessmentType(note.narrative));
  const summaryRaw = stripDocumentationMeta(note.narrative);
  const summary = summaryRaw.length > 180 ? `${summaryRaw.slice(0, 177)}...` : summaryRaw;

  return {
    id: note.id,
    kind,
    assessmentType,
    status: inferDocumentationStatus(note.narrative),
    createdAtIso: note.createdAt.toISOString(),
    dueDateIso: inferDocumentationDueDate(note.narrative),
    reviewDateIso: inferDocumentationReviewDate(note.narrative),
    authorName: note.createdByUser.name,
    assignedStaff: inferDocumentationAssignedStaff(note.narrative),
    summary: note.followUp?.trim() || summary,
    narrative: summaryRaw,
    sectionStates: inferDocumentationSectionStates(note.narrative)
  };
}

export async function getClinicalAssessmentHistoryForResident(params: {
  facilityId: string;
  residentId: string;
  kind: ClinicalAssessmentKind;
  limit?: number;
}) {
  const notes = await prisma.progressNote.findMany({
    where: {
      residentId: params.residentId,
      resident: {
        facilityId: params.facilityId
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: params.limit ?? 24,
    include: {
      createdByUser: {
        select: {
          name: true
        }
      }
    }
  });

  return notes
    .map((note) => {
      const kind = inferDocumentationKind({
        noteType: note.type,
        narrative: note.narrative
      });
      if (kind !== params.kind) return null;
      return mapToClinicalHistoryRow({
        note: {
          ...note,
          type: note.type as "GROUP" | "ONE_TO_ONE"
        },
        kind: params.kind
      });
    })
    .filter((row): row is ClinicalAssessmentHistoryRow => Boolean(row));
}

export async function getClinicalAssessmentEntryForEditor(params: {
  facilityId: string;
  id: string;
  kind: ClinicalAssessmentKind;
  timeZone?: string | null;
}): Promise<ClinicalAssessmentEditorData | null> {
  const note = await prisma.progressNote.findFirst({
    where: {
      id: params.id,
      resident: {
        facilityId: params.facilityId
      }
    },
    select: {
      id: true,
      type: true,
      residentId: true,
      participationLevel: true,
      moodAffect: true,
      cuesRequired: true,
      response: true,
      followUp: true,
      narrative: true,
      createdAt: true
    }
  });

  if (!note) return null;

  const kind = inferDocumentationKind({
    noteType: note.type,
    narrative: note.narrative
  });

  if (kind !== params.kind) return null;

  const meta = parseDocumentationMeta(note.narrative);
  const normalizedType = normalizeAssessmentType(params.kind, inferDocumentationAssessmentType(note.narrative));

  return {
    id: note.id,
    residentId: note.residentId,
    title: note.followUp?.trim() || "",
    narrative: stripDocumentationMeta(note.narrative),
    followUp: note.followUp?.trim() || "",
    status: inferDocumentationStatus(note.narrative),
    priority: inferDocumentationPriority(note.narrative),
    dueDate: normalizeDateInput(inferDocumentationDueDate(note.narrative), params.timeZone),
    occurredAt: toDateTimeLocalInputValueInTimeZone(note.createdAt, params.timeZone),
    participationLevel: note.participationLevel,
    moodAffect: note.moodAffect,
    cuesRequired: note.cuesRequired,
    response: note.response,
    assessmentType: normalizedType,
    reviewDate: normalizeDateInput(inferDocumentationReviewDate(note.narrative), params.timeZone),
    assignedStaff: inferDocumentationAssignedStaff(note.narrative) || "",
    noMajorChange: inferDocumentationNoMajorChange(note.narrative) ?? false,
    sectionStates: meta?.sectionStates ?? {},
    carryForwardFromId: meta?.carryForwardFromId ?? ""
  };
}

export function getDefaultClinicalAssessmentEditorData(params: {
  kind: ClinicalAssessmentKind;
  residentId?: string;
  assessmentType?: DocumentationAssessmentType;
  timeZone?: string | null;
}): ClinicalAssessmentEditorData {
  const defaults = getDefaultDocumentationEditorData({
    kind: params.kind,
    residentId: params.residentId,
    timeZone: params.timeZone
  });

  return {
    ...defaults,
    assessmentType: normalizeAssessmentType(params.kind, params.assessmentType ?? null),
    reviewDate: "",
    assignedStaff: "",
    noMajorChange: false,
    sectionStates: {},
    carryForwardFromId: ""
  };
}
