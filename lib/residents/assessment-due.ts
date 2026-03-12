import { parseDocumentationMeta } from "@/lib/documentation/meta";

export type AssessmentDueLevel =
  | "ON_TRACK"
  | "DUE_SOON_30"
  | "DUE_SOON_14"
  | "DUE_SOON_7"
  | "DUE_TODAY"
  | "OVERDUE"
  | "UNSCHEDULED"
  | "INACTIVE";

export type AssessmentDueStatus = {
  dueDateIso: string | null;
  level: AssessmentDueLevel;
  label: string;
  daysUntil: number | null;
  daysOverdue: number | null;
};

export type ResidentAssessmentSchedule = {
  anchorDateIso: string | null;
  admissionDateIso: string | null;
  lengthOfStayDays: number | null;
  quarterly: AssessmentDueStatus & {
    lastCompletedIso: string | null;
    intervalMonths: 3;
  };
  annual: AssessmentDueStatus & {
    lastCompletedIso: string | null;
    intervalMonths: 12;
  };
  mds: AssessmentDueStatus & {
    lastCompletedIso: string | null;
    manualOverrideIso: string | null;
    intervalMonths: 3;
  };
  nextDueType: "QUARTERLY_UDA" | "ANNUAL_UDA" | "MDS" | null;
  nextDueDateIso: string | null;
  overdueCount: number;
  dueSoonCount: number;
};

export type ResidentAssessmentCompletionSummary = {
  lastQuarterlyUdaCompletedAt: Date | null;
  lastAnnualUdaCompletedAt: Date | null;
  lastMdsCompletedAt: Date | null;
};

export type DocumentationAssessmentEntry = {
  residentId: string;
  narrative: string;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, months: number) {
  const clone = new Date(date.getTime());
  clone.setMonth(clone.getMonth() + months);
  return clone;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function resolveDueLevel(dueDate: Date | null, now: Date): AssessmentDueStatus {
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return {
      dueDateIso: null,
      level: "UNSCHEDULED",
      label: "Not scheduled",
      daysUntil: null,
      daysOverdue: null
    };
  }

  const dueStart = toDateStart(dueDate);
  const nowStart = toDateStart(now);
  const diff = Math.ceil((dueStart.getTime() - nowStart.getTime()) / DAY_MS);

  if (diff < 0) {
    const overdue = Math.abs(diff);
    return {
      dueDateIso: dueDate.toISOString(),
      level: "OVERDUE",
      label: `Overdue by ${overdue} day${overdue === 1 ? "" : "s"}`,
      daysUntil: diff,
      daysOverdue: overdue
    };
  }

  if (diff === 0) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_TODAY",
      label: "Due today",
      daysUntil: 0,
      daysOverdue: null
    };
  }

  if (diff === 1) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_SOON_7",
      label: "Due tomorrow",
      daysUntil: diff,
      daysOverdue: null
    };
  }

  if (diff <= 7) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_SOON_7",
      label: `Due in ${diff} days`,
      daysUntil: diff,
      daysOverdue: null
    };
  }

  if (diff <= 14) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_SOON_14",
      label: `Due in ${diff} days`,
      daysUntil: diff,
      daysOverdue: null
    };
  }

  if (diff <= 30) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_SOON_30",
      label: `Due in ${diff} days`,
      daysUntil: diff,
      daysOverdue: null
    };
  }

  return {
    dueDateIso: dueDate.toISOString(),
    level: "ON_TRACK",
    label: `Due in ${diff} days`,
    daysUntil: diff,
    daysOverdue: null
  };
}

function computeDueDate(anchor: Date | null, lastCompleted: Date | null, intervalMonths: number) {
  if (lastCompleted) {
    return addMonths(lastCompleted, intervalMonths);
  }

  if (!anchor) {
    return null;
  }

  return addMonths(anchor, intervalMonths);
}

export function getResidentAssessmentSchedule(params: {
  admissionDate: Date | null;
  residentCreatedAt: Date | null;
  mdsManualDueDate: Date | null;
  status?: string | null;
  completions?: Partial<ResidentAssessmentCompletionSummary> | null;
  now?: Date;
}): ResidentAssessmentSchedule {
  const now = params.now ?? new Date();
  const anchor = params.admissionDate ?? params.residentCreatedAt ?? null;
  const lengthOfStayDays = anchor ? Math.max(0, Math.floor((toDateStart(now).getTime() - toDateStart(anchor).getTime()) / DAY_MS)) : null;

  const inactive =
    params.status === "DISCHARGED" ||
    params.status === "DECEASED" ||
    params.status === "TRANSFERRED";

  const lastQuarterly = params.completions?.lastQuarterlyUdaCompletedAt ?? null;
  const lastAnnual = params.completions?.lastAnnualUdaCompletedAt ?? null;
  const lastMds = params.completions?.lastMdsCompletedAt ?? null;

  const quarterlyDue = computeDueDate(anchor, lastQuarterly, 3);
  const annualDue = computeDueDate(anchor, lastAnnual, 12);
  const mdsDue = params.mdsManualDueDate ?? computeDueDate(anchor, lastMds, 3);

  const quarterlyStatus = resolveDueLevel(quarterlyDue, now);
  const annualStatus = resolveDueLevel(annualDue, now);
  const mdsStatus = resolveDueLevel(mdsDue, now);

  const applyInactive = (status: AssessmentDueStatus): AssessmentDueStatus => {
    if (!inactive) return status;
    return {
      ...status,
      level: "INACTIVE",
      label: "Inactive"
    };
  };

  const quarterly = {
    ...applyInactive(quarterlyStatus),
    lastCompletedIso: toIso(lastQuarterly),
    intervalMonths: 3 as const
  };

  const annual = {
    ...applyInactive(annualStatus),
    lastCompletedIso: toIso(lastAnnual),
    intervalMonths: 12 as const
  };

  const mds = {
    ...applyInactive(mdsStatus),
    lastCompletedIso: toIso(lastMds),
    manualOverrideIso: toIso(params.mdsManualDueDate),
    intervalMonths: 3 as const
  };

  const dueEntries = [
    { type: "QUARTERLY_UDA" as const, status: quarterly },
    { type: "ANNUAL_UDA" as const, status: annual },
    { type: "MDS" as const, status: mds }
  ]
    .filter((entry) => entry.status.dueDateIso)
    .sort((a, b) => new Date(a.status.dueDateIso as string).getTime() - new Date(b.status.dueDateIso as string).getTime());

  const nextDue = dueEntries[0] ?? null;

  const overdueCount = [quarterly, annual, mds].filter((status) => status.level === "OVERDUE").length;
  const dueSoonCount = [quarterly, annual, mds].filter((status) =>
    status.level === "DUE_SOON_7" || status.level === "DUE_SOON_14" || status.level === "DUE_SOON_30" || status.level === "DUE_TODAY"
  ).length;

  return {
    anchorDateIso: toIso(anchor),
    admissionDateIso: toIso(params.admissionDate),
    lengthOfStayDays,
    quarterly,
    annual,
    mds,
    nextDueType: nextDue?.type ?? null,
    nextDueDateIso: nextDue?.status.dueDateIso ?? null,
    overdueCount,
    dueSoonCount
  };
}

export function buildResidentCompletionsMap(entries: DocumentationAssessmentEntry[]) {
  const map = new Map<string, ResidentAssessmentCompletionSummary>();

  for (const entry of entries) {
    const meta = parseDocumentationMeta(entry.narrative);
    if (!meta) continue;
    if ((meta.kind !== "UDA" && meta.kind !== "MDS") || meta.status !== "COMPLETED") continue;

    const current =
      map.get(entry.residentId) ?? {
        lastQuarterlyUdaCompletedAt: null,
        lastAnnualUdaCompletedAt: null,
        lastMdsCompletedAt: null
      };

    if (meta.kind === "MDS") {
      if (!current.lastMdsCompletedAt || current.lastMdsCompletedAt < entry.createdAt) {
        current.lastMdsCompletedAt = entry.createdAt;
      }
      map.set(entry.residentId, current);
      continue;
    }

    if (meta.assessmentType === "ANNUAL") {
      if (!current.lastAnnualUdaCompletedAt || current.lastAnnualUdaCompletedAt < entry.createdAt) {
        current.lastAnnualUdaCompletedAt = entry.createdAt;
      }
    } else if (meta.assessmentType === "QUARTERLY") {
      if (!current.lastQuarterlyUdaCompletedAt || current.lastQuarterlyUdaCompletedAt < entry.createdAt) {
        current.lastQuarterlyUdaCompletedAt = entry.createdAt;
      }
    } else {
      if (!current.lastQuarterlyUdaCompletedAt || current.lastQuarterlyUdaCompletedAt < entry.createdAt) {
        current.lastQuarterlyUdaCompletedAt = entry.createdAt;
      }
      if (!current.lastAnnualUdaCompletedAt || current.lastAnnualUdaCompletedAt < entry.createdAt) {
        current.lastAnnualUdaCompletedAt = entry.createdAt;
      }
    }

    map.set(entry.residentId, current);
  }

  return map;
}

export function dueLevelTone(level: AssessmentDueLevel) {
  if (level === "OVERDUE") {
    return "danger" as const;
  }
  if (level === "DUE_TODAY" || level === "DUE_SOON_7" || level === "DUE_SOON_14" || level === "DUE_SOON_30") {
    return "warning" as const;
  }
  if (level === "ON_TRACK") {
    return "success" as const;
  }
  return "neutral" as const;
}
