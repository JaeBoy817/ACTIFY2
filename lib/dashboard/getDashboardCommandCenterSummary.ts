import { unstable_cache } from "next/cache";
import { AttendanceStatus, Prisma, ResidentStatus } from "@prisma/client";

import { getDashboardHomeSummary, type DashboardHomeSummary } from "@/lib/dashboard/getDashboardHomeSummary";
import { getDashboardSummaryCacheTag } from "@/lib/dashboard/getDashboardSummary";
import { prisma } from "@/lib/prisma";
import {
  addZonedDays,
  endOfZonedDay,
  formatInTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedMonthShift,
  subtractDays
} from "@/lib/timezone";

const INACTIVE_RESIDENT_STATUSES: ResidentStatus[] = ["DISCHARGED", "TRANSFERRED", "DECEASED"];
const ENGAGED_ATTENDANCE_STATUSES = new Set<AttendanceStatus>(["PRESENT", "ACTIVE", "LEADING"]);

type ModuleKey =
  | "calendar"
  | "attendance"
  | "notes"
  | "oneToOne"
  | "carePlan"
  | "budgetStock"
  | "volunteers"
  | "residentCouncil"
  | "reports"
  | "residents";

export type DashboardMission = {
  id: string;
  title: string;
  detail: string;
  href: string;
  ctaLabel: string;
  module: ModuleKey;
  priority: "high" | "medium" | "low";
};

export type DashboardTimelineItem = {
  id: string;
  title: string;
  location: string;
  templateSource: string | null;
  startAt: string;
  endAt: string;
  timeLabel: string;
  attendanceCompleted: boolean;
  documentationCompleted: boolean;
  isUpcoming: boolean;
  isInProgress: boolean;
  isNextUp: boolean;
  attendanceHref: string;
  openHref: string;
  editHref: string;
  noteHref: string;
};

export type DashboardResidentAttentionItem = {
  id: string;
  residentId: string;
  name: string;
  room: string;
  status: string;
  reason: string;
  chips: string[];
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export type DashboardResidentAttentionCategory = {
  key:
    | "needs-one-on-one"
    | "low-participation"
    | "new-admission"
    | "care-plan-overdue"
    | "resistant-trend"
    | "follow-up";
  title: string;
  description: string;
  module: ModuleKey;
  viewAllHref: string;
  items: DashboardResidentAttentionItem[];
};

export type DashboardResidentFollowUpPriorityLevel = "critical" | "high" | "medium" | "low";

export type DashboardResidentFollowUpBoardItem = {
  id: string;
  residentId: string;
  name: string;
  room: string;
  unit: string;
  status: string;
  avatarInitials: string;
  priorityScore: number;
  priorityLevel: DashboardResidentFollowUpPriorityLevel;
  sourceModule: ModuleKey;
  primaryReason: string;
  secondaryReasons: string[];
  reasonChips: string[];
  recencyContext: string[];
  suggestedAction: {
    label: string;
    href: string;
    module: ModuleKey;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  lastUpdatedAt: string | null;
  daysSinceLastOneToOne: number | null;
  daysSinceLastAttendance: number | null;
  daysSinceLastNote: number | null;
  refusalCountRecent: number;
  participationTrend: "up" | "down" | "flat";
  documentationIssueCount: number;
  carePlanIssueFlag: boolean;
  newAdmissionFlag: boolean;
};

export type DashboardResidentFollowUpBoard = {
  generatedAt: string;
  threshold: number;
  defaultVisibleCount: number;
  totalSurfaced: number;
  viewAllHref: string;
  items: DashboardResidentFollowUpBoardItem[];
};

export type DashboardMomentumSummary = {
  dailyParticipationRate: number;
  weeklyParticipationTrend: number;
  monthlyParticipationGoalProgress: number;
  monthlyOneOnOneCompletionRate: number;
  documentationCompletionRate: number;
  carePlanCompletionRate: number;
  miniSeries: number[];
};

export type DashboardInventoryPulse = {
  lowStockCount: number;
  lowStockItems: Array<{ id: string; name: string; category: string; onHand: number; threshold: number }>;
  monthSpending: number;
  mostUsedItems: Array<{ id: string; name: string; quantity: number; revenue: number; profit: number }>;
  belowThresholdCount: number;
};

export type DashboardNotesHub = {
  notesCreatedToday: number;
  oneToOneCreatedToday: number;
  overdueOneToOneCount: number;
  groupDocumentationMissingCount: number;
  recentActivity: Array<{
    id: string;
    residentName: string;
    room: string;
    type: "GROUP" | "ONE_TO_ONE";
    createdAt: string;
    href: string;
  }>;
};

export type DashboardUpcomingPlanning = {
  tomorrowActivityCount: number;
  nextOuting: {
    title: string;
    when: string;
    location: string;
    href: string;
  } | null;
  upcomingBirthdays: Array<{
    id: string;
    residentName: string;
    room: string;
    when: string;
  }>;
  volunteerCoverageSoon: {
    shifts: number;
    hours: number;
  };
  nextResidentCouncilMeeting: {
    when: string;
    attendanceCount: number;
    href: string;
  } | null;
  reportDueIndicator: {
    label: string;
    dueDate: string;
    daysRemaining: number;
    href: string;
  };
};

export type DashboardMoraleCard = {
  title: string;
  message: string;
  prompt: string;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  href: string;
  module: ModuleKey;
};

export type DashboardCommandCenterSummary = {
  generatedAt: string;
  hero: {
    facilityName: string;
    dayOfWeek: string;
    fullDate: string;
    censusCount: number;
    scheduledTodayCount: number;
    oneToOneNeededThisMonthCount: number;
    overdueItemsCount: number;
    smartSummary: string;
  };
  base: DashboardHomeSummary;
  missions: DashboardMission[];
  timeline: DashboardTimelineItem[];
  residentAttention: DashboardResidentAttentionCategory[];
  residentFollowUpBoard: DashboardResidentFollowUpBoard;
  momentum: DashboardMomentumSummary;
  inventoryPulse: DashboardInventoryPulse;
  notesHub: DashboardNotesHub;
  upcoming: DashboardUpcomingPlanning;
  morale: DashboardMoraleCard;
  quickActions: DashboardQuickAction[];
};

export type GetDashboardCommandCenterSummaryOptions = {
  facilityId: string;
  facilityName: string;
  timeZone: string;
};

const MORALE_ROTATION: readonly DashboardMoraleCard[] = [
  {
    title: "Confidence Boost",
    message: "The smallest well-run activity can reset someone’s entire day.",
    prompt: "Idea: Run a 10-minute music recall circle before lunch."
  },
  {
    title: "Activity Idea",
    message: "Try a low-prep table challenge with sensory props and color sorting.",
    prompt: "No-budget option: magazine collage stories with resident-led prompts."
  },
  {
    title: "Seasonal Prompt",
    message: "Use local weather memories to kick off conversation and life review.",
    prompt: "Prompt: “What was your favorite spring tradition growing up?”"
  },
  {
    title: "Sensory Suggestion",
    message: "Short sensory reset blocks can increase participation in the next session.",
    prompt: "Try: 8-minute tactile station before group trivia."
  }
];

type FollowUpResidentCore = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  status: ResidentStatus;
  admissionDate: Date | null;
  createdAt: Date;
  lastOneOnOneAt: Date | null;
  followUpFlag: boolean;
  preferences: string | null;
  unitName: string | null;
};

type FollowUpAttendanceRow = {
  residentId: string;
  activityInstanceId: string;
  status: AttendanceStatus;
  barrierReason: string | null;
  startAt: Date;
  category: string | null;
};

type FollowUpNoteRow = {
  id: string;
  residentId: string;
  type: "GROUP" | "ONE_TO_ONE";
  createdAt: Date;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
  followUp: string | null;
  narrative: string;
};

type ResidentFollowUpSignal = {
  key:
    | "missing-monthly-1to1"
    | "low-participation"
    | "repeated-refusals"
    | "recent-note-follow-up"
    | "not-recently-seen"
    | "documentation-incomplete"
    | "new-admission"
    | "care-plan-signal"
    | "persistent-flag";
  label: string;
  weight: number;
  module: ModuleKey;
  timestamp: Date | null;
};

const FOLLOW_UP_PRIORITY_THRESHOLD = 25;
const FOLLOW_UP_DEFAULT_VISIBLE = 6;
const FOLLOW_UP_VIEW_ALL_HREF = "/app/residents?filter=follow-up";
const CONCERN_PHRASE_REGEX =
  /\b(withdrawn|isolat(e|ive)|declin(e|ed)|refus(ed|al)|anxious|agitated|tearful|sad|flat affect|disinterested|not engaged|follow[- ]?up|recheck|family concern)\b/gi;

function residentDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function residentInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0).toUpperCase();
  const last = lastName.trim().charAt(0).toUpperCase();
  return `${first || "R"}${last || ""}`;
}

function statusLabel(status: ResidentStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toPercent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysSince(now: Date, value: Date | null | undefined) {
  if (!value) return null;
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDaysAgoLabel(now: Date, value: Date | null | undefined, prefix: string) {
  const days = daysSince(now, value);
  if (days == null) return `${prefix}: none`;
  if (days === 0) return `${prefix}: today`;
  if (days === 1) return `${prefix}: 1 day ago`;
  return `${prefix}: ${days} days ago`;
}

function buildSmartSummary(input: {
  scheduledTodayCount: number;
  missingOneOnOneCount: number;
  overdueItemsCount: number;
  lowStockCount: number;
}) {
  const parts: string[] = [];

  if (input.scheduledTodayCount > 0) {
    parts.push(`${input.scheduledTodayCount} activities scheduled today`);
  }
  if (input.missingOneOnOneCount > 0) {
    parts.push(`${input.missingOneOnOneCount} residents still need 1:1 this month`);
  }
  if (input.overdueItemsCount > 0) {
    parts.push(`${input.overdueItemsCount} care plan or documentation items are overdue`);
  }
  if (input.lowStockCount > 0) {
    parts.push(`Prize or supply stock is low in ${input.lowStockCount} items`);
  }

  if (parts.length === 0) {
    return "Everything is caught up right now. Great position to plan ahead.";
  }

  return parts.slice(0, 3).join(" · ");
}

function hoursFromVisits(visits: Array<{ startAt: Date; endAt: Date | null }>) {
  if (visits.length === 0) return 0;
  const totalMs = visits.reduce((sum, visit) => {
    if (!visit.endAt) return sum;
    const delta = visit.endAt.getTime() - visit.startAt.getTime();
    return delta > 0 ? sum + delta : sum;
  }, 0);
  return Number((totalMs / (1000 * 60 * 60)).toFixed(1));
}

function pickMoraleCard(now: Date) {
  const index = Math.abs(Math.floor(now.getTime() / (1000 * 60 * 60 * 24))) % MORALE_ROTATION.length;
  return MORALE_ROTATION[index];
}

function defaultQuickActions(): DashboardQuickAction[] {
  return [
    { id: "new-activity", label: "New Activity", href: "/app/calendar?quickAdd=1", module: "calendar" },
    { id: "new-note", label: "New Progress Note", href: "/app/documentation/progress-notes/new", module: "notes" },
    { id: "new-1on1", label: "New 1:1 Note", href: "/app/documentation/one-to-one/new", module: "oneToOne" },
    { id: "attendance", label: "Add Attendance", href: "/app/attendance", module: "attendance" },
    { id: "search-resident", label: "Search Resident", href: "/app/residents", module: "residents" },
    { id: "update-care-plan", label: "Update Care Plan", href: "/app/care-plans", module: "carePlan" },
    { id: "inventory", label: "Add Inventory", href: "/app/dashboard/budget-stock?open=inventory", module: "budgetStock" },
    { id: "reports", label: "Open Reports", href: "/app/reports", module: "reports" }
  ];
}

function isConcerningFollowUpNarrative(narrative: string) {
  if (!narrative || narrative.trim().length < 3) return false;
  const matches = narrative.match(CONCERN_PHRASE_REGEX);
  if (!matches) return false;
  return new Set(matches.map((value) => value.toLowerCase())).size >= 2;
}

function toPriorityLevel(score: number): DashboardResidentFollowUpPriorityLevel {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function mapPrimaryAction(params: {
  reasonKey: ResidentFollowUpSignal["key"];
  residentId: string;
}): DashboardResidentFollowUpBoardItem["suggestedAction"] {
  const encoded = encodeURIComponent(params.residentId);

  switch (params.reasonKey) {
    case "missing-monthly-1to1":
      return { label: "Add 1:1 Note", href: `/app/documentation/one-to-one/new?residentId=${encoded}`, module: "oneToOne" };
    case "low-participation":
      return { label: "View Attendance", href: `/app/attendance/residents?residentId=${encoded}`, module: "attendance" };
    case "repeated-refusals":
      return { label: "Add Progress Note", href: `/app/documentation/progress-notes/new?residentId=${encoded}`, module: "notes" };
    case "recent-note-follow-up":
      return { label: "View Notes", href: `/app/documentation/overview?residentId=${encoded}`, module: "notes" };
    case "documentation-incomplete":
      return { label: "Complete Documentation", href: `/app/documentation/progress-notes/new?residentId=${encoded}`, module: "notes" };
    case "new-admission":
      return { label: "Open Resident", href: `/app/residents?residentId=${encoded}`, module: "residents" };
    case "care-plan-signal":
      return { label: "Open Care Plan", href: `/app/residents/${encoded}/care-plan`, module: "carePlan" };
    case "not-recently-seen":
      return { label: "Check In", href: `/app/residents?residentId=${encoded}`, module: "residents" };
    case "persistent-flag":
      return { label: "Add Follow-Up Note", href: `/app/documentation/one-to-one/new?residentId=${encoded}`, module: "oneToOne" };
    default:
      return { label: "Open Resident", href: `/app/residents?residentId=${encoded}`, module: "residents" };
  }
}

function buildResidentFollowUpBoard(args: {
  now: Date;
  residents: FollowUpResidentCore[];
  attendanceRows: FollowUpAttendanceRow[];
  noteRows: FollowUpNoteRow[];
  carePlanOverdueResidentIds: Set<string>;
  carePlanDueSoonResidentIds: Set<string>;
  carePlanCoverageResidentIds: Set<string>;
  documentedGroupActivityIdsRecent: Set<string>;
  monthStart: Date;
  weekWindowStart: Date;
  dayStart: Date;
  timeZone: string;
}): DashboardResidentFollowUpBoard {
  const attendanceByResident = new Map<string, FollowUpAttendanceRow[]>();
  const notesByResident = new Map<string, FollowUpNoteRow[]>();
  const oneToOneThisMonthResidentIds = new Set<string>();
  const oneToOneTodayResidentIds = new Set<string>();
  const documentationIssueCounts = new Map<string, number>();
  const latestSignalAtByResident = new Map<string, Date>();
  const threeDaysAgo = subtractDays(args.now, 3);
  const sevenDaysAgo = addZonedDays(args.dayStart, args.timeZone, -7);
  const fourteenDaysAgo = addZonedDays(args.dayStart, args.timeZone, -14);

  for (const row of args.attendanceRows) {
    const list = attendanceByResident.get(row.residentId);
    if (list) {
      list.push(row);
    } else {
      attendanceByResident.set(row.residentId, [row]);
    }

    if (
      row.startAt >= threeDaysAgo &&
      ENGAGED_ATTENDANCE_STATUSES.has(row.status) &&
      !args.documentedGroupActivityIdsRecent.has(row.activityInstanceId)
    ) {
      documentationIssueCounts.set(row.residentId, (documentationIssueCounts.get(row.residentId) ?? 0) + 1);
      const previous = latestSignalAtByResident.get(row.residentId);
      if (!previous || row.startAt > previous) {
        latestSignalAtByResident.set(row.residentId, row.startAt);
      }
    }
  }

  for (const row of args.noteRows) {
    const list = notesByResident.get(row.residentId);
    if (list) {
      list.push(row);
    } else {
      notesByResident.set(row.residentId, [row]);
    }

    if (row.type === "ONE_TO_ONE" && row.createdAt >= args.monthStart) {
      oneToOneThisMonthResidentIds.add(row.residentId);
    }
    if (row.type === "ONE_TO_ONE" && row.createdAt >= args.dayStart) {
      oneToOneTodayResidentIds.add(row.residentId);
    }
  }

  for (const [residentId, rows] of notesByResident.entries()) {
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (rows.length > 0) {
      latestSignalAtByResident.set(residentId, rows[0].createdAt);
    }
  }

  const items: DashboardResidentFollowUpBoardItem[] = [];

  for (const resident of args.residents) {
    const attendance = (attendanceByResident.get(resident.id) ?? []).sort(
      (a, b) => b.startAt.getTime() - a.startAt.getTime()
    );
    const notes = notesByResident.get(resident.id) ?? [];

    const attendanceLast7 = attendance.filter((row) => row.startAt >= sevenDaysAgo);
    const attendancePrev7 = attendance.filter((row) => row.startAt < sevenDaysAgo && row.startAt >= fourteenDaysAgo);
    const attendanceLast3 = attendance.filter((row) => row.startAt >= threeDaysAgo);
    const attendancePrev3 = attendance.filter((row) => row.startAt < threeDaysAgo && row.startAt >= addZonedDays(args.dayStart, args.timeZone, -6));

    const engagedLast7 = attendanceLast7.filter((row) => ENGAGED_ATTENDANCE_STATUSES.has(row.status)).length;
    const engagedPrev7 = attendancePrev7.filter((row) => ENGAGED_ATTENDANCE_STATUSES.has(row.status)).length;
    const engagedLast3 = attendanceLast3.filter((row) => ENGAGED_ATTENDANCE_STATUSES.has(row.status)).length;
    const engagedPrev3 = attendancePrev3.filter((row) => ENGAGED_ATTENDANCE_STATUSES.has(row.status)).length;

    const refusalsFromAttendance = attendanceLast7.filter((row) => row.status === "REFUSED").length;
    const concerningNotesLast7 = notes.filter(
      (row) =>
        row.createdAt >= sevenDaysAgo &&
        (Boolean(row.followUp && row.followUp.trim().length > 0) ||
          row.response === "RESISTANT" ||
          row.moodAffect === "ANXIOUS" ||
          row.moodAffect === "AGITATED" ||
          row.moodAffect === "FLAT" ||
          row.participationLevel === "MINIMAL" ||
          isConcerningFollowUpNarrative(row.narrative))
    );
    const refusalsFromNotes = notes.filter(
      (row) => row.createdAt >= sevenDaysAgo && row.response === "RESISTANT"
    ).length;
    const refusalCountRecent = refusalsFromAttendance + refusalsFromNotes;

    const latestAttendanceAt = attendance[0]?.startAt ?? null;
    const latestNoteAt = notes[0]?.createdAt ?? null;
    const latestOneToOneAt =
      notes.find((row) => row.type === "ONE_TO_ONE")?.createdAt ?? resident.lastOneOnOneAt ?? null;

    const oneToOneThisMonth = oneToOneThisMonthResidentIds.has(resident.id);
    const oneToOneToday = oneToOneTodayResidentIds.has(resident.id);
    const preferenceText = (resident.preferences ?? "").toLowerCase();
    const preferenceAdjusted =
      preferenceText.includes("1:1") ||
      preferenceText.includes("one-to-one") ||
      preferenceText.includes("in-room") ||
      preferenceText.includes("independent");
    const documentationIssueCount = documentationIssueCounts.get(resident.id) ?? 0;
    const hasCarePlanOverdue = args.carePlanOverdueResidentIds.has(resident.id);
    const hasCarePlanDueSoon = args.carePlanDueSoonResidentIds.has(resident.id);
    const hasCarePlanCoverage = args.carePlanCoverageResidentIds.has(resident.id);
    const admissionAnchor = resident.admissionDate ?? resident.createdAt;
    const newAdmissionFlag = admissionAnchor >= addZonedDays(args.dayStart, args.timeZone, -14);
    const preferencesMissing = !resident.preferences || resident.preferences.trim().length === 0;

    const signals: ResidentFollowUpSignal[] = [];
    let score = 0;
    const pushSignal = (signal: ResidentFollowUpSignal) => {
      if (signals.some((item) => item.key === signal.key)) return;
      signals.push(signal);
      score += signal.weight;
    };

    if (!oneToOneThisMonth) {
      pushSignal({
        key: "missing-monthly-1to1",
        label: latestOneToOneAt ? "Needs monthly 1:1" : "No 1:1 note this month",
        weight: 40,
        module: "oneToOne",
        timestamp: latestOneToOneAt
      });
    }

    const noGroupParticipationLast7 = engagedLast7 === 0 && attendanceLast7.length > 0;
    const lowParticipationRatio =
      attendanceLast7.length >= 3 && engagedLast7 / Math.max(1, attendanceLast7.length) < 0.4;
    const trendDown =
      engagedLast7 === 0 ? engagedPrev7 > 0 : engagedLast7 < engagedPrev7;

    if ((!preferenceAdjusted && noGroupParticipationLast7) || lowParticipationRatio || trendDown) {
      pushSignal({
        key: "low-participation",
        label: noGroupParticipationLast7 ? "No recent group attendance" : "Participation trending down",
        weight: noGroupParticipationLast7 ? 30 : 26,
        module: "attendance",
        timestamp: latestAttendanceAt
      });
    }

    if (refusalCountRecent >= 2) {
      pushSignal({
        key: "repeated-refusals",
        label: "Repeated refusals in the last 7 days",
        weight: 30,
        module: "attendance",
        timestamp: latestAttendanceAt
      });
    }

    if (concerningNotesLast7.length > 0) {
      pushSignal({
        key: "recent-note-follow-up",
        label: "Follow-up recommended from note",
        weight: 35,
        module: "notes",
        timestamp: concerningNotesLast7[0].createdAt
      });
    }

    const noAttendanceIn7Days = !latestAttendanceAt || latestAttendanceAt < sevenDaysAgo;
    const noNoteIn7Days = !latestNoteAt || latestNoteAt < sevenDaysAgo;
    if (noAttendanceIn7Days && noNoteIn7Days) {
      pushSignal({
        key: "not-recently-seen",
        label: "Not recently seen",
        weight: 20,
        module: "residents",
        timestamp: latestSignalAtByResident.get(resident.id) ?? null
      });
    }

    if (documentationIssueCount > 0) {
      pushSignal({
        key: "documentation-incomplete",
        label: "Recent activity missing follow-up documentation",
        weight: 15,
        module: "notes",
        timestamp: latestAttendanceAt
      });
    }

    if (newAdmissionFlag && (preferencesMissing || !oneToOneThisMonth)) {
      pushSignal({
        key: "new-admission",
        label: preferencesMissing ? "New admission with missing preferences" : "New admission needs engagement follow-up",
        weight: preferencesMissing ? 24 : 20,
        module: "residents",
        timestamp: admissionAnchor
      });
    }

    if (hasCarePlanOverdue || hasCarePlanDueSoon || (!hasCarePlanCoverage && admissionAnchor < subtractDays(args.now, 30))) {
      pushSignal({
        key: "care-plan-signal",
        label: hasCarePlanOverdue ? "Care plan review overdue" : "Care plan follow-up needed",
        weight: hasCarePlanOverdue ? 20 : 15,
        module: "carePlan",
        timestamp: latestSignalAtByResident.get(resident.id) ?? null
      });
    }

    if (resident.followUpFlag) {
      pushSignal({
        key: "persistent-flag",
        label: "Existing follow-up flag remains active",
        weight: 10,
        module: "residents",
        timestamp: resident.createdAt
      });
    }

    if (signals.length >= 3) {
      score += 10;
    }

    if (oneToOneToday) {
      score -= 20;
    }

    if (
      latestOneToOneAt &&
      latestOneToOneAt >= threeDaysAgo &&
      engagedLast3 > engagedPrev3
    ) {
      score -= 10;
    }

    score = Math.max(0, score);
    const priorityLevel = toPriorityLevel(score);
    if (score < FOLLOW_UP_PRIORITY_THRESHOLD) {
      continue;
    }

    const orderedSignals = [...signals].sort((a, b) => b.weight - a.weight || (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
    const primarySignal = orderedSignals[0];
    if (!primarySignal) {
      continue;
    }

    const suggestedAction = mapPrimaryAction({
      reasonKey: primarySignal.key,
      residentId: resident.id
    });

    const recencyContext = [
      formatDaysAgoLabel(args.now, latestOneToOneAt, "Last 1:1"),
      formatDaysAgoLabel(args.now, latestAttendanceAt, "Last attendance"),
      formatDaysAgoLabel(args.now, latestNoteAt, "Last note"),
      refusalCountRecent > 0 ? `${refusalCountRecent} refusals this week` : null
    ].filter((value): value is string => Boolean(value)).slice(0, 3);

    const trend: "up" | "down" | "flat" = engagedLast7 > engagedPrev7 ? "up" : engagedLast7 < engagedPrev7 ? "down" : "flat";

    items.push({
      id: `follow-board-${resident.id}`,
      residentId: resident.id,
      name: residentDisplayName(resident.firstName, resident.lastName),
      room: resident.room,
      unit: resident.unitName ?? "Unassigned",
      status: statusLabel(resident.status),
      avatarInitials: residentInitials(resident.firstName, resident.lastName),
      priorityScore: score,
      priorityLevel,
      sourceModule: primarySignal.module,
      primaryReason: primarySignal.label,
      secondaryReasons: orderedSignals.slice(1, 3).map((signal) => signal.label),
      reasonChips: orderedSignals.map((signal) => signal.label).slice(0, 3),
      recencyContext,
      suggestedAction,
      secondaryAction: {
        label: "Open Resident",
        href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
      },
      lastUpdatedAt: (primarySignal.timestamp ?? latestSignalAtByResident.get(resident.id) ?? null)?.toISOString() ?? null,
      daysSinceLastOneToOne: daysSince(args.now, latestOneToOneAt),
      daysSinceLastAttendance: daysSince(args.now, latestAttendanceAt),
      daysSinceLastNote: daysSince(args.now, latestNoteAt),
      refusalCountRecent,
      participationTrend: trend,
      documentationIssueCount,
      carePlanIssueFlag: hasCarePlanOverdue || hasCarePlanDueSoon || !hasCarePlanCoverage,
      newAdmissionFlag
    });
  }

  items.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    const aUpdated = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0;
    const bUpdated = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0;
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    if (a.newAdmissionFlag !== b.newAdmissionFlag) return a.newAdmissionFlag ? -1 : 1;
    const aRecency = Math.max(a.daysSinceLastAttendance ?? 0, a.daysSinceLastNote ?? 0, a.daysSinceLastOneToOne ?? 0);
    const bRecency = Math.max(b.daysSinceLastAttendance ?? 0, b.daysSinceLastNote ?? 0, b.daysSinceLastOneToOne ?? 0);
    if (bRecency !== aRecency) return bRecency - aRecency;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return {
    generatedAt: args.now.toISOString(),
    threshold: FOLLOW_UP_PRIORITY_THRESHOLD,
    defaultVisibleCount: FOLLOW_UP_DEFAULT_VISIBLE,
    totalSurfaced: items.length,
    viewAllHref: FOLLOW_UP_VIEW_ALL_HREF,
    items: items.slice(0, 24)
  };
}

function deriveLowStockCountFromAlerts(base: DashboardHomeSummary) {
  const inventoryAlert = base.alerts.items.find((item) => item.id === "inventory-low");
  if (!inventoryAlert) return 0;
  const match = inventoryAlert.detail.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function buildFallbackCommandCenterSummary(args: {
  base: DashboardHomeSummary;
  facilityName: string;
  timeZone: string;
}): DashboardCommandCenterSummary {
  const now = new Date();
  const lowStockCount = deriveLowStockCountFromAlerts(args.base);
  const overdueItemsCount =
    args.base.oneToOne.missingThisMonthCount +
    args.base.alerts.items.filter((item) => item.id === "careplan-overdue" || item.id === "attendance-pending").length;

  const timeline: DashboardTimelineItem[] = args.base.todayAgenda.map((item, index) => ({
    id: item.id,
    title: item.title,
    location: item.location,
    templateSource: null,
    startAt: item.startAt,
    endAt: item.endAt,
    timeLabel: item.timeLabel,
    attendanceCompleted: item.attendanceCompleted,
    documentationCompleted: true,
    isUpcoming: index === 0,
    isInProgress: false,
    isNextUp: index === 0,
    attendanceHref: "/app/attendance",
    openHref: item.href,
    editHref: item.href,
    noteHref: "/app/documentation/progress-notes/new"
  }));

  const missions: DashboardMission[] = [
    {
      id: "mission-calendar",
      title: "Run Today’s Schedule",
      detail: `${timeline.length} activities queued.`,
      href: "/app/calendar?view=day",
      ctaLabel: "Open calendar",
      module: "calendar",
      priority: timeline.length > 0 ? "high" : "medium"
    },
    {
      id: "mission-1on1",
      title: "Complete 1:1 Visits",
      detail: `${args.base.oneToOne.missingThisMonthCount} residents still need 1:1 this month.`,
      href: "/app/documentation/one-to-one/new",
      ctaLabel: "Start 1:1",
      module: "oneToOne",
      priority: args.base.oneToOne.missingThisMonthCount > 0 ? "high" : "low"
    },
    {
      id: "mission-documentation",
      title: "Document Today’s Activities",
      detail: `${Math.max(0, args.base.dailyMetrics.programsToday - args.base.dailyMetrics.attendanceSessionsCompleted)} sessions still need documentation.`,
      href: "/app/documentation/progress-notes/new",
      ctaLabel: "Add note",
      module: "notes",
      priority: "medium"
    },
    {
      id: "mission-stock",
      title: "Restock Prize Cart",
      detail: `${lowStockCount} inventory items below threshold.`,
      href: "/app/dashboard/budget-stock?tab=stock&mode=LOW",
      ctaLabel: "Open stock",
      module: "budgetStock",
      priority: lowStockCount > 0 ? "medium" : "low"
    }
  ];

  const residentAttention: DashboardResidentAttentionCategory[] = [
    {
      key: "needs-one-on-one",
      title: "Needs 1:1 this month",
      description: "Residents with no logged 1:1 note in the current month.",
      module: "oneToOne",
      viewAllHref: args.base.oneToOne.viewAllHref,
      items: args.base.oneToOne.items.slice(0, 8).map((item) => ({
        id: `needs-${item.id}`,
        residentId: item.residentId,
        name: item.residentName,
        room: item.room,
        status: item.statusLabel,
        reason: item.reason,
        chips: ["1:1 pending"],
        primaryAction: {
          label: "Start note",
          href: item.href
        },
        secondaryAction: {
          label: "Resident profile",
          href: `/app/residents?residentId=${encodeURIComponent(item.residentId)}`
        }
      }))
    }
  ];

  const residentFollowUpBoard: DashboardResidentFollowUpBoard = {
    generatedAt: now.toISOString(),
    threshold: FOLLOW_UP_PRIORITY_THRESHOLD,
    defaultVisibleCount: FOLLOW_UP_DEFAULT_VISIBLE,
    totalSurfaced: residentAttention.flatMap((group) => group.items).length,
    viewAllHref: FOLLOW_UP_VIEW_ALL_HREF,
    items: residentAttention
      .flatMap((group) =>
        group.items.map((item, index) => ({
          id: `fallback-board-${item.id}`,
          residentId: item.residentId,
          name: item.name,
          room: item.room,
          unit: "Unassigned",
          status: item.status,
          avatarInitials: residentInitials(item.name.split(" ")[0] ?? "R", item.name.split(" ")[1] ?? ""),
          priorityScore: Math.max(45, 80 - index * 4),
          priorityLevel: (index < 2 ? "high" : "medium") as DashboardResidentFollowUpPriorityLevel,
          sourceModule: group.module,
          primaryReason: item.reason,
          secondaryReasons: item.chips.slice(0, 2),
          reasonChips: item.chips.slice(0, 3),
          recencyContext: [item.reason],
          suggestedAction: {
            label: item.primaryAction.label,
            href: item.primaryAction.href,
            module: group.module
          },
          secondaryAction: item.secondaryAction,
          lastUpdatedAt: null,
          daysSinceLastOneToOne: null,
          daysSinceLastAttendance: null,
          daysSinceLastNote: null,
          refusalCountRecent: 0,
          participationTrend: "flat" as const,
          documentationIssueCount: 0,
          carePlanIssueFlag: group.key === "care-plan-overdue",
          newAdmissionFlag: group.key === "new-admission"
        }))
      )
      .slice(0, 12)
  };

  return {
    generatedAt: now.toISOString(),
    hero: {
      facilityName: args.facilityName,
      dayOfWeek: formatInTimeZone(now, args.timeZone, { weekday: "long" }),
      fullDate: formatInTimeZone(now, args.timeZone, {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      censusCount: args.base.participationPreview.activeResidents,
      scheduledTodayCount: args.base.dailyMetrics.programsToday,
      oneToOneNeededThisMonthCount: args.base.oneToOne.missingThisMonthCount,
      overdueItemsCount,
      smartSummary: buildSmartSummary({
        scheduledTodayCount: args.base.dailyMetrics.programsToday,
        missingOneOnOneCount: args.base.oneToOne.missingThisMonthCount,
        overdueItemsCount,
        lowStockCount
      })
    },
    base: args.base,
    missions,
    timeline,
    residentAttention,
    residentFollowUpBoard,
    momentum: {
      dailyParticipationRate: clampPercent(args.base.analytics.today.participationPercent),
      weeklyParticipationTrend: 0,
      monthlyParticipationGoalProgress: clampPercent((args.base.analytics.month.participationPercent / 70) * 100),
      monthlyOneOnOneCompletionRate: toPercent(
        args.base.oneToOne.residentsWithNoteThisMonth,
        args.base.oneToOne.totalEligibleResidents
      ),
      documentationCompletionRate: toPercent(
        args.base.dailyMetrics.attendanceSessionsCompleted,
        Math.max(1, args.base.dailyMetrics.programsToday)
      ),
      carePlanCompletionRate: clampPercent(100 - Math.min(100, args.base.alerts.items.some((item) => item.id === "careplan-overdue") ? 25 : 0)),
      miniSeries: [
        clampPercent(args.base.analytics.today.participationPercent),
        clampPercent(args.base.analytics.month.averageDailyPercent),
        clampPercent((args.base.analytics.month.participationPercent / 70) * 100),
        clampPercent(toPercent(args.base.oneToOne.residentsWithNoteThisMonth, args.base.oneToOne.totalEligibleResidents)),
        clampPercent(toPercent(args.base.dailyMetrics.attendanceSessionsCompleted, Math.max(1, args.base.dailyMetrics.programsToday)))
      ]
    },
    inventoryPulse: {
      lowStockCount,
      lowStockItems: [],
      monthSpending: 0,
      mostUsedItems: [],
      belowThresholdCount: lowStockCount
    },
    notesHub: {
      notesCreatedToday: args.base.dailyMetrics.oneToOneCompletedToday,
      oneToOneCreatedToday: args.base.dailyMetrics.oneToOneCompletedToday,
      overdueOneToOneCount: args.base.oneToOne.missingThisMonthCount,
      groupDocumentationMissingCount: Math.max(
        0,
        args.base.dailyMetrics.programsToday - args.base.dailyMetrics.attendanceSessionsCompleted
      ),
      recentActivity: args.base.recentOneToOneNotes.map((note) => ({
        id: note.id,
        residentName: note.residentName,
        room: note.room,
        type: "ONE_TO_ONE",
        createdAt: note.createdAt,
        href: note.continueHref
      }))
    },
    upcoming: {
      tomorrowActivityCount: 0,
      nextOuting: null,
      upcomingBirthdays: [],
      volunteerCoverageSoon: {
        shifts: 0,
        hours: 0
      },
      nextResidentCouncilMeeting: null,
      reportDueIndicator: {
        label: "Monthly reports due",
        dueDate: formatInTimeZone(startOfZonedMonthShift(now, args.timeZone, 1), args.timeZone, {
          month: "short",
          day: "numeric"
        }),
        daysRemaining: 0,
        href: "/app/reports"
      }
    },
    morale: pickMoraleCard(now),
    quickActions: defaultQuickActions()
  };
}

function buildEmergencyCommandCenterSummary(args: {
  facilityName: string;
  timeZone: string;
}): DashboardCommandCenterSummary {
  const now = new Date();
  return {
    generatedAt: now.toISOString(),
    hero: {
      facilityName: args.facilityName,
      dayOfWeek: formatInTimeZone(now, args.timeZone, { weekday: "long" }),
      fullDate: formatInTimeZone(now, args.timeZone, {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      censusCount: 0,
      scheduledTodayCount: 0,
      oneToOneNeededThisMonthCount: 0,
      overdueItemsCount: 0,
      smartSummary: "Dashboard data is loading. Use quick actions to continue work."
    },
    base: {
      generatedAt: now.toISOString(),
      dateLabel: formatInTimeZone(now, args.timeZone, {
        weekday: "long",
        month: "short",
        day: "numeric"
      }),
      quickStatusLine: "Loading facility summary",
      nextUp: null,
      todayAgenda: [],
      agendaInsights: { overlapCount: 0, missingLocationCount: 0 },
      dailyMetrics: {
        attendanceToday: 0,
        programsToday: 0,
        oneToOneCompletedToday: 0,
        residentsEngagedToday: 0,
        attendanceSessionsCompleted: 0
      },
      monthlyMetrics: {
        totalPrograms: 0,
        averageAttendancePerProgram: 0,
        totalOneToOneNotes: 0,
        volunteerHours: null
      },
      analytics: {
        today: {
          rangeLabel: "Today",
          averageDailyPercent: 0,
          participationPercent: 0,
          residentsParticipated: 0,
          totalAttendedResidents: 0,
          oneOnOneNotes: 0,
          carePlanReviews: 0
        },
        month: {
          rangeLabel: "30D",
          averageDailyPercent: 0,
          participationPercent: 0,
          residentsParticipated: 0,
          totalAttendedResidents: 0,
          oneOnOneNotes: 0,
          carePlanReviews: 0,
          volunteerHours: 0
        }
      },
      participationPreview: {
        averageDailyPercent: 0,
        participationPercent: 0,
        residentsParticipated: 0,
        totalAttendedResidents: 0,
        activeResidents: 0
      },
      oneToOne: {
        queueDateKey: "",
        queueSize: 0,
        dueTodayCount: 0,
        missingThisMonthCount: 0,
        residentsWithNoteThisMonth: 0,
        totalEligibleResidents: 0,
        items: [],
        viewAllHref: "/app/documentation/one-to-one"
      },
      recentOneToOneNotes: [],
      alerts: {
        count: 0,
        items: []
      }
    },
    missions: [],
    timeline: [],
    residentAttention: [],
    residentFollowUpBoard: {
      generatedAt: now.toISOString(),
      threshold: FOLLOW_UP_PRIORITY_THRESHOLD,
      defaultVisibleCount: FOLLOW_UP_DEFAULT_VISIBLE,
      totalSurfaced: 0,
      viewAllHref: FOLLOW_UP_VIEW_ALL_HREF,
      items: []
    },
    momentum: {
      dailyParticipationRate: 0,
      weeklyParticipationTrend: 0,
      monthlyParticipationGoalProgress: 0,
      monthlyOneOnOneCompletionRate: 0,
      documentationCompletionRate: 0,
      carePlanCompletionRate: 0,
      miniSeries: [0, 0, 0, 0, 0]
    },
    inventoryPulse: {
      lowStockCount: 0,
      lowStockItems: [],
      monthSpending: 0,
      mostUsedItems: [],
      belowThresholdCount: 0
    },
    notesHub: {
      notesCreatedToday: 0,
      oneToOneCreatedToday: 0,
      overdueOneToOneCount: 0,
      groupDocumentationMissingCount: 0,
      recentActivity: []
    },
    upcoming: {
      tomorrowActivityCount: 0,
      nextOuting: null,
      upcomingBirthdays: [],
      volunteerCoverageSoon: {
        shifts: 0,
        hours: 0
      },
      nextResidentCouncilMeeting: null,
      reportDueIndicator: {
        label: "Monthly reports due",
        dueDate: formatInTimeZone(startOfZonedMonthShift(now, args.timeZone, 1), args.timeZone, {
          month: "short",
          day: "numeric"
        }),
        daysRemaining: 0,
        href: "/app/reports"
      }
    },
    morale: pickMoraleCard(now),
    quickActions: defaultQuickActions()
  };
}

function isMissingPrismaResourceError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

async function withOptionalData<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (isMissingPrismaResourceError(error)) {
      return fallback;
    }
    throw error;
  }
}

async function computeDashboardCommandCenterSummary(args: {
  facilityId: string;
  facilityName: string;
  timeZone: string;
}): Promise<DashboardCommandCenterSummary> {
  const now = new Date();
  const dayStart = startOfZonedDay(now, args.timeZone);
  const dayEnd = endOfZonedDay(now, args.timeZone);
  const tomorrowStart = addZonedDays(dayStart, args.timeZone, 1);
  const tomorrowEnd = endOfZonedDay(tomorrowStart, args.timeZone);
  const weekWindowStart = addZonedDays(dayStart, args.timeZone, -6);
  const previousWeekStart = addZonedDays(dayStart, args.timeZone, -13);
  const previousWeekEnd = new Date(weekWindowStart.getTime() - 1);
  const monthStart = startOfZonedMonth(now, args.timeZone);
  const nextMonthStart = startOfZonedMonthShift(now, args.timeZone, 1);
  const monthEnd = new Date(nextMonthStart.getTime() - 1);
  const fourteenDaysAgo = subtractDays(now, 14);
  const thirtyDaysAgo = subtractDays(now, 30);
  const fortyFiveDaysAgo = subtractDays(now, 45);
  const threeDaysAgo = subtractDays(now, 3);
  const admissionWindowStart = subtractDays(now, 45);
  const thirtyDaysAhead = addZonedDays(dayStart, args.timeZone, 30);
  const sevenDaysAhead = addZonedDays(dayStart, args.timeZone, 7);

  const residentWhere: Prisma.ResidentWhereInput = {
    facilityId: args.facilityId,
    OR: [{ isActive: true }, { status: { in: ["ACTIVE", "BED_BOUND"] as ResidentStatus[] } }],
    NOT: {
      status: {
        in: INACTIVE_RESIDENT_STATUSES
      }
    }
  };

  const baseSummaryPromise = getDashboardHomeSummary({
    facilityId: args.facilityId,
    timeZone: args.timeZone
  });

  const [
    base,
    todaysActivities,
    todayAttendanceGroups,
    todayGroupNotes,
    monthlyGroupNotes,
    notesTodayTotal,
    oneToOneTodayCount,
    recentNotes,
    lowStockRows,
    monthSpendingAggregate,
    salesMonthRows,
    tomorrowActivityCount,
    nextOuting,
    activeResidentsWithBirthdays,
    volunteerSoonVisits,
    nextCouncilMeeting,
    unresolvedCouncilCount,
    residentsMissingOneToOneMonth,
    attendanceWeekRows,
    newAdmissionsMissingPrefs,
    carePlanOverdueRows,
    carePlanDueSoonRows,
    resistantTrendRows,
    followUpRows,
    carePlanCoverageRows,
    attendanceLast7Rows,
    attendancePrevious7Rows,
    residentsForFollowUp,
    followUpAttendanceRows,
    followUpNoteRows,
    documentedGroupActivityIdsRecentRows
  ] = await Promise.all([
    baseSummaryPromise,
    prisma.activityInstance.findMany({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      orderBy: [{ startAt: "asc" }],
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        template: {
          select: {
            title: true
          }
        }
      }
    }),
    prisma.attendance.groupBy({
      by: ["activityInstanceId"],
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.progressNote.findMany({
      where: {
        type: "GROUP",
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      },
      select: {
        activityInstanceId: true
      },
      distinct: ["activityInstanceId"]
    }),
    prisma.progressNote.findMany({
      where: {
        type: "GROUP",
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: monthStart,
            lt: nextMonthStart
          }
        }
      },
      select: {
        activityInstanceId: true
      },
      distinct: ["activityInstanceId"]
    }),
    prisma.progressNote.count({
      where: {
        resident: {
          facilityId: args.facilityId
        },
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    }),
    prisma.progressNote.count({
      where: {
        resident: {
          facilityId: args.facilityId
        },
        type: "ONE_TO_ONE",
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        resident: {
          facilityId: args.facilityId
        }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        type: true,
        createdAt: true,
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true
          }
        }
      }
    }),
    withOptionalData(
      () =>
        prisma.budgetStockItem.findMany({
          where: {
            facilityId: args.facilityId,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            category: true,
            onHand: true,
            reorderPoint: true,
            parLevel: true
          }
        }),
      []
    ),
    withOptionalData(
      () =>
        prisma.budgetStockExpense.aggregate({
          where: {
            facilityId: args.facilityId,
            date: {
              gte: monthStart,
              lt: nextMonthStart
            }
          },
          _sum: {
            amount: true
          }
        }),
      { _sum: { amount: 0 } }
    ),
    withOptionalData(
      () =>
        prisma.budgetStockSale.findMany({
          where: {
            facilityId: args.facilityId,
            date: {
              gte: monthStart,
              lt: nextMonthStart
            }
          },
          select: {
            itemId: true,
            qty: true,
            revenue: true,
            profit: true,
            item: {
              select: {
                name: true
              }
            }
          }
        }),
      []
    ),
    prisma.activityInstance.count({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: tomorrowStart,
          lte: tomorrowEnd
        }
      }
    }),
    prisma.activityInstance.findFirst({
      where: {
        facilityId: args.facilityId,
        startAt: {
          gte: now
        },
        OR: [
          { title: { contains: "outing", mode: "insensitive" } },
          { title: { contains: "trip", mode: "insensitive" } },
          { title: { contains: "special", mode: "insensitive" } }
        ]
      },
      orderBy: [{ startAt: "asc" }],
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true
      }
    }),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        birthDate: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        birthDate: true
      }
    }),
    withOptionalData(
      () =>
        prisma.volunteerVisit.findMany({
          where: {
            startAt: {
              gte: dayStart,
              lte: sevenDaysAhead
            },
            volunteer: {
              facilityId: args.facilityId
            }
          },
          select: {
            startAt: true,
            endAt: true
          }
        }),
      []
    ),
    withOptionalData(
      () =>
        prisma.residentCouncilMeeting.findFirst({
          where: {
            facilityId: args.facilityId,
            heldAt: {
              gte: now
            }
          },
          orderBy: [{ heldAt: "asc" }],
          select: {
            id: true,
            heldAt: true,
            attendanceCount: true
          }
        }),
      null
    ),
    withOptionalData(
      () =>
        prisma.residentCouncilItem.count({
          where: {
            status: "UNRESOLVED",
            meeting: {
              facilityId: args.facilityId
            }
          }
        }),
      0
    ),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        OR: [{ lastOneOnOneAt: null }, { lastOneOnOneAt: { lt: monthStart } }]
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 24,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        lastOneOnOneAt: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: weekWindowStart,
            lte: dayEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        status: true,
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        }
      }
    }),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        createdAt: {
          gte: admissionWindowStart
        },
        OR: [{ preferences: null }, { preferences: "" }]
      },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.carePlan.findMany({
      where: {
        status: "ACTIVE",
        nextReviewDate: {
          lt: dayStart
        },
        resident: residentWhere
      },
      take: 16,
      orderBy: [{ nextReviewDate: "asc" }],
      select: {
        id: true,
        nextReviewDate: true,
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        }
      }
    }),
    prisma.carePlan.findMany({
      where: {
        status: "ACTIVE",
        nextReviewDate: {
          gte: dayStart,
          lte: sevenDaysAhead
        },
        resident: residentWhere
      },
      take: 24,
      orderBy: [{ nextReviewDate: "asc" }],
      select: {
        residentId: true
      }
    }),
    prisma.progressNote.findMany({
      where: {
        type: "ONE_TO_ONE",
        createdAt: {
          gte: fourteenDaysAgo
        },
        resident: residentWhere,
        OR: [
          { response: "RESISTANT" },
          { moodAffect: "ANXIOUS" },
          { moodAffect: "AGITATED" },
          { moodAffect: "FLAT" }
        ]
      },
      orderBy: [{ createdAt: "desc" }],
      take: 30,
      select: {
        residentId: true,
        createdAt: true,
        response: true,
        moodAffect: true,
        resident: {
          select: {
            firstName: true,
            lastName: true,
            room: true,
            status: true
          }
        }
      }
    }),
    prisma.resident.findMany({
      where: {
        ...residentWhere,
        followUpFlag: true
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 16,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        updatedAt: true
      }
    }),
    prisma.carePlan.findMany({
      where: {
        status: "ACTIVE",
        resident: residentWhere
      },
      distinct: ["residentId"],
      select: {
        residentId: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: weekWindowStart,
            lte: dayEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        status: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: previousWeekStart,
            lte: previousWeekEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        status: true
      }
    }),
    prisma.resident.findMany({
      where: residentWhere,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        room: true,
        status: true,
        admissionDate: true,
        createdAt: true,
        lastOneOnOneAt: true,
        followUpFlag: true,
        preferences: true,
        unit: {
          select: {
            name: true
          }
        }
      }
    }),
    prisma.attendance.findMany({
      where: {
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: thirtyDaysAgo,
            lte: dayEnd
          }
        },
        resident: residentWhere
      },
      select: {
        residentId: true,
        activityInstanceId: true,
        status: true,
        barrierReason: true,
        activityInstance: {
          select: {
            startAt: true,
            template: {
              select: {
                category: true
              }
            }
          }
        }
      }
    }),
    prisma.progressNote.findMany({
      where: {
        resident: residentWhere,
        createdAt: {
          gte: fortyFiveDaysAgo,
          lte: dayEnd
        }
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        residentId: true,
        type: true,
        createdAt: true,
        participationLevel: true,
        moodAffect: true,
        response: true,
        followUp: true,
        narrative: true
      }
    }),
    prisma.progressNote.findMany({
      where: {
        type: "GROUP",
        activityInstanceId: {
          not: null
        },
        activityInstance: {
          facilityId: args.facilityId,
          startAt: {
            gte: threeDaysAgo,
            lte: dayEnd
          }
        }
      },
      distinct: ["activityInstanceId"],
      select: {
        activityInstanceId: true
      }
    })
  ]);

  const attendanceCompletedIds = new Set(todayAttendanceGroups.map((item) => item.activityInstanceId));
  const documentationCompletedIds = new Set(
    todayGroupNotes
      .map((item) => item.activityInstanceId)
      .filter((value): value is string => Boolean(value))
  );
  const monthlyDocumentationCoverageCount = monthlyGroupNotes.filter((row) => row.activityInstanceId).length;

  const timeline: DashboardTimelineItem[] = todaysActivities.map((activity): DashboardTimelineItem => {
    const isInProgress = now >= activity.startAt && now <= activity.endAt;
    const isUpcoming = now < activity.startAt;
    return {
      id: activity.id,
      title: activity.title,
      location: activity.location || "Location not set",
      templateSource: activity.template?.title ?? null,
      startAt: activity.startAt.toISOString(),
      endAt: activity.endAt.toISOString(),
      timeLabel: `${formatInTimeZone(activity.startAt, args.timeZone, {
        hour: "numeric",
        minute: "2-digit"
      })} - ${formatInTimeZone(activity.endAt, args.timeZone, {
        hour: "numeric",
        minute: "2-digit"
      })}`,
      attendanceCompleted: attendanceCompletedIds.has(activity.id),
      documentationCompleted: documentationCompletedIds.has(activity.id),
      isUpcoming,
      isInProgress,
      isNextUp: false,
      attendanceHref: `/app/attendance?activityId=${encodeURIComponent(activity.id)}`,
      openHref: `/app/calendar?view=day&date=${encodeURIComponent(activity.startAt.toISOString())}`,
      editHref: `/app/calendar?activityId=${encodeURIComponent(activity.id)}`,
      noteHref: `/app/documentation/progress-notes/new?activityId=${encodeURIComponent(activity.id)}`
    };
  });

  const nextTimelineIndex = timeline.findIndex((row) => row.isUpcoming || row.isInProgress);
  if (nextTimelineIndex >= 0) {
    timeline[nextTimelineIndex] = {
      ...timeline[nextTimelineIndex],
      isNextUp: true
    };
  }

  const lowStockItems = lowStockRows
    .map((item) => {
      const threshold = item.reorderPoint ?? Math.floor(item.parLevel * 0.3);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        onHand: item.onHand,
        threshold: Math.max(0, threshold)
      };
    })
    .filter((item) => item.onHand <= item.threshold)
    .sort((a, b) => a.onHand - b.onHand);

  const salesByItem = new Map<string, { id: string; name: string; quantity: number; revenue: number; profit: number }>();
  for (const sale of salesMonthRows) {
    const key = sale.itemId;
    const existing = salesByItem.get(key) ?? {
      id: key,
      name: sale.item.name,
      quantity: 0,
      revenue: 0,
      profit: 0
    };
    existing.quantity += sale.qty;
    existing.revenue += sale.revenue;
    existing.profit += sale.profit;
    salesByItem.set(key, existing);
  }
  const mostUsedItems = Array.from(salesByItem.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 4);

  const reportDueDaysRemaining = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const followUpResidents: FollowUpResidentCore[] = residentsForFollowUp.map((resident) => ({
    id: resident.id,
    firstName: resident.firstName,
    lastName: resident.lastName,
    room: resident.room,
    status: resident.status,
    admissionDate: resident.admissionDate,
    createdAt: resident.createdAt,
    lastOneOnOneAt: resident.lastOneOnOneAt,
    followUpFlag: resident.followUpFlag,
    preferences: resident.preferences,
    unitName: resident.unit?.name ?? null
  }));

  const followUpAttendanceSignalRows: FollowUpAttendanceRow[] = followUpAttendanceRows.map((row) => ({
    residentId: row.residentId,
    activityInstanceId: row.activityInstanceId,
    status: row.status,
    barrierReason: row.barrierReason ?? null,
    startAt: row.activityInstance.startAt,
    category: row.activityInstance.template?.category ?? null
  }));

  const followUpNoteSignalRows: FollowUpNoteRow[] = followUpNoteRows.map((row) => ({
    id: row.id,
    residentId: row.residentId,
    type: row.type,
    createdAt: row.createdAt,
    participationLevel: row.participationLevel,
    moodAffect: row.moodAffect,
    response: row.response,
    followUp: row.followUp,
    narrative: row.narrative
  }));

  const carePlanOverdueResidentIds = new Set(carePlanOverdueRows.map((plan) => plan.resident.id));
  const carePlanDueSoonResidentIds = new Set(carePlanDueSoonRows.map((plan) => plan.residentId));
  const carePlanCoverageResidentIds = new Set(carePlanCoverageRows.map((plan) => plan.residentId));
  const documentedGroupActivityIdsRecent = new Set(
    documentedGroupActivityIdsRecentRows
      .map((row) => row.activityInstanceId)
      .filter((value): value is string => Boolean(value))
  );

  const residentFollowUpBoard = buildResidentFollowUpBoard({
    now,
    residents: followUpResidents,
    attendanceRows: followUpAttendanceSignalRows,
    noteRows: followUpNoteSignalRows,
    carePlanOverdueResidentIds,
    carePlanDueSoonResidentIds,
    carePlanCoverageResidentIds,
    documentedGroupActivityIdsRecent,
    monthStart,
    weekWindowStart,
    dayStart,
    timeZone: args.timeZone
  });

  const residentEngagementMap = new Map<
    string,
    {
      residentId: string;
      name: string;
      room: string;
      status: ResidentStatus;
      engagedCount: number;
      totalCount: number;
    }
  >();

  for (const row of attendanceWeekRows) {
    const resident = row.resident;
    const current = residentEngagementMap.get(row.residentId) ?? {
      residentId: row.residentId,
      name: residentDisplayName(resident.firstName, resident.lastName),
      room: resident.room,
      status: resident.status,
      engagedCount: 0,
      totalCount: 0
    };
    current.totalCount += 1;
    if (ENGAGED_ATTENDANCE_STATUSES.has(row.status)) {
      current.engagedCount += 1;
    }
    residentEngagementMap.set(row.residentId, current);
  }

  const lowParticipationItems: DashboardResidentAttentionItem[] = Array.from(residentEngagementMap.values())
    .filter((row) => row.totalCount >= 2 && row.engagedCount / row.totalCount < 0.4)
    .sort((a, b) => (a.engagedCount / a.totalCount) - (b.engagedCount / b.totalCount))
    .slice(0, 8)
    .map((row) => ({
      id: `low-part-${row.residentId}`,
      residentId: row.residentId,
      name: row.name,
      room: row.room,
      status: statusLabel(row.status),
      reason: `${row.engagedCount}/${row.totalCount} engaged sessions in the past week`,
      chips: ["Low participation"],
      primaryAction: {
        label: "Open resident",
        href: `/app/residents?residentId=${encodeURIComponent(row.residentId)}`
      },
      secondaryAction: {
        label: "Add 1:1 note",
        href: `/app/documentation/one-to-one/new?residentId=${encodeURIComponent(row.residentId)}`
      }
    }));

  const resistantByResident = new Map<
    string,
    {
      residentId: string;
      name: string;
      room: string;
      status: ResidentStatus;
      count: number;
      latestAt: Date;
    }
  >();

  for (const row of resistantTrendRows) {
    const existing = resistantByResident.get(row.residentId);
    if (existing) {
      existing.count += 1;
      if (row.createdAt > existing.latestAt) {
        existing.latestAt = row.createdAt;
      }
      continue;
    }

    resistantByResident.set(row.residentId, {
      residentId: row.residentId,
      name: residentDisplayName(row.resident.firstName, row.resident.lastName),
      room: row.resident.room,
      status: row.resident.status,
      count: 1,
      latestAt: row.createdAt
    });
  }

  const resistantTrendItems: DashboardResidentAttentionItem[] = Array.from(resistantByResident.values())
    .sort((a, b) => b.count - a.count || b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, 8)
    .map((row) => ({
      id: `resist-${row.residentId}`,
      residentId: row.residentId,
      name: row.name,
      room: row.room,
      status: statusLabel(row.status),
      reason: `${row.count} resistant/withdrawn note signals in the last 14 days`,
      chips: ["Behavioral trend"],
      primaryAction: {
        label: "Start 1:1 note",
        href: `/app/documentation/one-to-one/new?residentId=${encodeURIComponent(row.residentId)}`
      },
      secondaryAction: {
        label: "Open care plan",
        href: `/app/residents/${encodeURIComponent(row.residentId)}/care-plan`
      }
    }));

  const residentAttention: DashboardResidentAttentionCategory[] = [
    {
      key: "needs-one-on-one",
      title: "Needs 1:1 this month",
      description: "Residents with no logged 1:1 note in the current month.",
      module: "oneToOne",
      viewAllHref: "/app/documentation/one-to-one",
      items: residentsMissingOneToOneMonth.slice(0, 8).map((resident) => ({
        id: `1on1-${resident.id}`,
        residentId: resident.id,
        name: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        status: statusLabel(resident.status),
        reason: resident.lastOneOnOneAt
          ? `Last 1:1 on ${formatInTimeZone(resident.lastOneOnOneAt, args.timeZone, {
              month: "short",
              day: "numeric"
            })}`
          : "No 1:1 note logged yet",
        chips: ["1:1 pending"],
        primaryAction: {
          label: "Start note",
          href: `/app/documentation/one-to-one/new?residentId=${encodeURIComponent(resident.id)}`
        },
        secondaryAction: {
          label: "Resident profile",
          href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
        }
      }))
    },
    {
      key: "low-participation",
      title: "Low participation this week",
      description: "Residents with low engaged attendance ratios this week.",
      module: "attendance",
      viewAllHref: "/app/attendance/residents",
      items: lowParticipationItems
    },
    {
      key: "new-admission",
      title: "New admission missing preferences",
      description: "Recently added residents without activity preferences documented.",
      module: "residents",
      viewAllHref: "/app/residents",
      items: newAdmissionsMissingPrefs.slice(0, 8).map((resident) => ({
        id: `new-${resident.id}`,
        residentId: resident.id,
        name: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        status: statusLabel(resident.status),
        reason: `Admitted ${formatInTimeZone(resident.createdAt, args.timeZone, {
          month: "short",
          day: "numeric"
        })} with no preference profile`,
        chips: ["New admission"],
        primaryAction: {
          label: "Add preferences",
          href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
        }
      }))
    },
    {
      key: "care-plan-overdue",
      title: "Care plan review overdue",
      description: "Residents with care plans past next review date.",
      module: "carePlan",
      viewAllHref: "/app/care-plans?status=overdue",
      items: carePlanOverdueRows.slice(0, 8).map((plan) => ({
        id: `cp-${plan.id}`,
        residentId: plan.resident.id,
        name: residentDisplayName(plan.resident.firstName, plan.resident.lastName),
        room: plan.resident.room,
        status: statusLabel(plan.resident.status),
        reason: `Review due ${formatInTimeZone(plan.nextReviewDate, args.timeZone, {
          month: "short",
          day: "numeric"
        })}`,
        chips: ["Care plan overdue"],
        primaryAction: {
          label: "Open care plan",
          href: `/app/residents/${encodeURIComponent(plan.resident.id)}/care-plan`
        }
      }))
    },
    {
      key: "resistant-trend",
      title: "Recent resistant/withdrawn trend",
      description: "Residents with recurring resistant or withdrawn response markers.",
      module: "notes",
      viewAllHref: "/app/documentation/one-to-one",
      items: resistantTrendItems
    },
    {
      key: "follow-up",
      title: "Follow-up recommended",
      description: "Residents flagged for follow-up from recent notes and workflows.",
      module: "notes",
      viewAllHref: "/app/residents?filter=follow-up",
      items: followUpRows.slice(0, 8).map((resident) => ({
        id: `follow-${resident.id}`,
        residentId: resident.id,
        name: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        status: statusLabel(resident.status),
        reason: `Follow-up flag active as of ${formatInTimeZone(resident.updatedAt, args.timeZone, {
          month: "short",
          day: "numeric"
        })}`,
        chips: ["Follow-up"],
        primaryAction: {
          label: "Add follow-up note",
          href: `/app/documentation/one-to-one/new?residentId=${encodeURIComponent(resident.id)}`
        },
        secondaryAction: {
          label: "Open resident",
          href: `/app/residents?residentId=${encodeURIComponent(resident.id)}`
        }
      }))
    }
  ];

  const attendanceWeekEngagedCount = attendanceLast7Rows.reduce((sum, row) => (
    ENGAGED_ATTENDANCE_STATUSES.has(row.status) ? sum + 1 : sum
  ), 0);
  const attendancePrevWeekEngagedCount = attendancePrevious7Rows.reduce((sum, row) => (
    ENGAGED_ATTENDANCE_STATUSES.has(row.status) ? sum + 1 : sum
  ), 0);
  const weeklyParticipationTrend = attendancePrevWeekEngagedCount === 0
    ? attendanceWeekEngagedCount > 0 ? 100 : 0
    : Math.round(((attendanceWeekEngagedCount - attendancePrevWeekEngagedCount) / attendancePrevWeekEngagedCount) * 100);

  const monthlyParticipationGoalProgress = clampPercent((base.analytics.month.participationPercent / 70) * 100);
  const monthlyOneOnOneCompletionRate = toPercent(
    base.oneToOne.residentsWithNoteThisMonth,
    base.oneToOne.totalEligibleResidents
  );
  const documentationCompletionRate = toPercent(
    monthlyDocumentationCoverageCount,
    Math.max(1, base.monthlyMetrics.totalPrograms)
  );
  const carePlanCompletionRate = toPercent(
    carePlanCoverageRows.length,
    Math.max(1, base.participationPreview.activeResidents)
  );

  const momentum: DashboardMomentumSummary = {
    dailyParticipationRate: clampPercent(base.analytics.today.participationPercent),
    weeklyParticipationTrend,
    monthlyParticipationGoalProgress,
    monthlyOneOnOneCompletionRate,
    documentationCompletionRate,
    carePlanCompletionRate,
    miniSeries: [
      clampPercent(base.analytics.today.participationPercent),
      clampPercent(base.analytics.month.averageDailyPercent),
      clampPercent(monthlyOneOnOneCompletionRate),
      clampPercent(documentationCompletionRate),
      clampPercent(carePlanCompletionRate)
    ]
  };

  const notesHub: DashboardNotesHub = {
    notesCreatedToday: notesTodayTotal,
    oneToOneCreatedToday: oneToOneTodayCount,
    overdueOneToOneCount: base.oneToOne.missingThisMonthCount,
    groupDocumentationMissingCount: Math.max(0, timeline.filter((row) => !row.documentationCompleted).length),
    recentActivity: recentNotes.map((note) => ({
      id: note.id,
      residentName: residentDisplayName(note.resident.firstName, note.resident.lastName),
      room: note.resident.room,
      type: note.type,
      createdAt: formatInTimeZone(note.createdAt, args.timeZone, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }),
      href: `/app/documentation/${note.type === "ONE_TO_ONE" ? "one-to-one" : "progress-notes"}/${encodeURIComponent(note.id)}`
    }))
  };

  const upcomingBirthdays = activeResidentsWithBirthdays
    .map((resident) => {
      if (!resident.birthDate) return null;
      const birthDate = resident.birthDate;
      const thisYear = Number(formatInTimeZone(now, args.timeZone, { year: "numeric" }));
      const month = Number(formatInTimeZone(birthDate, "UTC", { month: "numeric" }));
      const day = Number(formatInTimeZone(birthDate, "UTC", { day: "numeric" }));
      const thisYearBirthday = new Date(Date.UTC(thisYear, month - 1, day, 12, 0, 0));
      const nextBirthday = thisYearBirthday >= now
        ? thisYearBirthday
        : new Date(Date.UTC(thisYear + 1, month - 1, day, 12, 0, 0));
      if (nextBirthday > thirtyDaysAhead) {
        return null;
      }
      return {
        id: resident.id,
        residentName: residentDisplayName(resident.firstName, resident.lastName),
        room: resident.room,
        when: formatInTimeZone(nextBirthday, args.timeZone, {
          month: "short",
          day: "numeric"
        }),
        dateValue: nextBirthday.getTime()
      };
    })
    .filter((item): item is { id: string; residentName: string; room: string; when: string; dateValue: number } => Boolean(item))
    .sort((a, b) => a.dateValue - b.dateValue)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      residentName: item.residentName,
      room: item.room,
      when: item.when
    }));

  const upcoming: DashboardUpcomingPlanning = {
    tomorrowActivityCount,
    nextOuting: nextOuting
      ? {
          title: nextOuting.title,
          when: formatInTimeZone(nextOuting.startAt, args.timeZone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          }),
          location: nextOuting.location || "Location not set",
          href: `/app/calendar?view=day&date=${encodeURIComponent(nextOuting.startAt.toISOString())}`
        }
      : null,
    upcomingBirthdays,
    volunteerCoverageSoon: {
      shifts: volunteerSoonVisits.length,
      hours: hoursFromVisits(volunteerSoonVisits)
    },
    nextResidentCouncilMeeting: nextCouncilMeeting
      ? {
          when: formatInTimeZone(nextCouncilMeeting.heldAt, args.timeZone, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          }),
          attendanceCount: nextCouncilMeeting.attendanceCount,
          href: `/app/resident-council/meetings/${encodeURIComponent(nextCouncilMeeting.id)}`
        }
      : null,
    reportDueIndicator: {
      label: "Monthly reports due",
      dueDate: formatInTimeZone(monthEnd, args.timeZone, {
        month: "short",
        day: "numeric"
      }),
      daysRemaining: reportDueDaysRemaining,
      href: "/app/reports"
    }
  };

  const overdueItemsCount =
    base.oneToOne.missingThisMonthCount +
    base.alerts.items.filter((alert) => alert.id === "careplan-overdue" || alert.id === "attendance-pending").length;

  const missions: DashboardMission[] = [
    {
      id: "mission-calendar",
      title: "Run Today’s Schedule",
      detail: `${timeline.length} activities queued with ${timeline.filter((row) => !row.attendanceCompleted).length} attendance tasks open.`,
      href: "/app/calendar?view=day",
      ctaLabel: "Open calendar",
      module: "calendar",
      priority: timeline.length > 0 ? "high" : "medium"
    },
    {
      id: "mission-1on1",
      title: "Complete 1:1 Visits",
      detail: `${base.oneToOne.missingThisMonthCount} residents still need a monthly 1:1 note.`,
      href: "/app/documentation/one-to-one/new",
      ctaLabel: "Start 1:1",
      module: "oneToOne",
      priority: base.oneToOne.missingThisMonthCount > 0 ? "high" : "low"
    },
    {
      id: "mission-documentation",
      title: "Document Today’s Activities",
      detail: `${notesHub.groupDocumentationMissingCount} activities still missing group documentation.`,
      href: "/app/documentation/progress-notes/new",
      ctaLabel: "Add note",
      module: "notes",
      priority: notesHub.groupDocumentationMissingCount > 0 ? "high" : "medium"
    },
    {
      id: "mission-participation",
      title: "Review Low Participation",
      detail: `${lowParticipationItems.length} residents surfaced for low participation this week.`,
      href: "/app/attendance/residents",
      ctaLabel: "Review residents",
      module: "attendance",
      priority: lowParticipationItems.length > 0 ? "medium" : "low"
    },
    {
      id: "mission-stock",
      title: "Restock Prize Cart",
      detail: `${lowStockItems.length} inventory items are below threshold.`,
      href: "/app/dashboard/budget-stock?tab=stock&mode=LOW",
      ctaLabel: "Open stock",
      module: "budgetStock",
      priority: lowStockItems.length > 0 ? "high" : "low"
    },
    {
      id: "mission-council",
      title: "Prepare Resident Council",
      detail: `${unresolvedCouncilCount} unresolved council items need follow-through.`,
      href: "/app/resident-council",
      ctaLabel: "Open council",
      module: "residentCouncil",
      priority: unresolvedCouncilCount > 0 ? "medium" : "low"
    }
  ];

  const quickActions: DashboardQuickAction[] = [
    { id: "new-activity", label: "New Activity", href: "/app/calendar?quickAdd=1", module: "calendar" },
    { id: "new-note", label: "New Progress Note", href: "/app/documentation/progress-notes/new", module: "notes" },
    { id: "new-1on1", label: "New 1:1 Note", href: "/app/documentation/one-to-one/new", module: "oneToOne" },
    { id: "attendance", label: "Add Attendance", href: "/app/attendance", module: "attendance" },
    { id: "search-resident", label: "Search Resident", href: "/app/residents", module: "residents" },
    { id: "update-care-plan", label: "Update Care Plan", href: "/app/care-plans", module: "carePlan" },
    { id: "inventory", label: "Add Inventory", href: "/app/dashboard/budget-stock?open=inventory", module: "budgetStock" },
    { id: "reports", label: "Open Reports", href: "/app/reports", module: "reports" }
  ];

  return {
    generatedAt: now.toISOString(),
    hero: {
      facilityName: args.facilityName,
      dayOfWeek: formatInTimeZone(now, args.timeZone, { weekday: "long" }),
      fullDate: formatInTimeZone(now, args.timeZone, {
        month: "long",
        day: "numeric",
        year: "numeric"
      }),
      censusCount: base.participationPreview.activeResidents,
      scheduledTodayCount: timeline.length,
      oneToOneNeededThisMonthCount: base.oneToOne.missingThisMonthCount,
      overdueItemsCount,
      smartSummary: buildSmartSummary({
        scheduledTodayCount: timeline.length,
        missingOneOnOneCount: base.oneToOne.missingThisMonthCount,
        overdueItemsCount,
        lowStockCount: lowStockItems.length
      })
    },
    base,
    missions,
    timeline,
    residentAttention,
    residentFollowUpBoard,
    momentum,
    inventoryPulse: {
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 6),
      monthSpending: Number((monthSpendingAggregate._sum.amount ?? 0).toFixed(2)),
      mostUsedItems,
      belowThresholdCount: lowStockItems.length
    },
    notesHub,
    upcoming,
    morale: pickMoraleCard(now),
    quickActions
  };
}

function getCachedDashboardCommandCenterSummary(facilityId: string, facilityName: string) {
  return unstable_cache(
    async (timeZone: string) =>
      computeDashboardCommandCenterSummary({
        facilityId,
        facilityName,
        timeZone
      }),
    ["dashboard-command-center-v2", facilityId, facilityName],
    {
      revalidate: 45,
      tags: [getDashboardSummaryCacheTag(facilityId)]
    }
  );
}

export async function getDashboardCommandCenterSummary(
  options: GetDashboardCommandCenterSummaryOptions
): Promise<DashboardCommandCenterSummary> {
  const timeZone = resolveTimeZone(options.timeZone);
  const getCached = getCachedDashboardCommandCenterSummary(options.facilityId, options.facilityName);

  try {
    return await getCached(timeZone);
  } catch (error) {
    console.error("[dashboard-command-center] Falling back to base summary", error);
    try {
      const base = await getDashboardHomeSummary({
        facilityId: options.facilityId,
        timeZone
      });
      return buildFallbackCommandCenterSummary({
        base,
        facilityName: options.facilityName,
        timeZone
      });
    } catch (baseError) {
      console.error("[dashboard-command-center] Emergency fallback", baseError);
      return buildEmergencyCommandCenterSummary({
        facilityName: options.facilityName,
        timeZone
      });
    }
  }
}
