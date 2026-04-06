"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition, type ComponentType } from "react";
import {
  AlertTriangle,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FilePenLine,
  FileText,
  Filter,
  Loader2,
  Plus,
  Printer,
  Search,
  Sparkles,
  UserRound,
  Users
} from "lucide-react";

import { formatActifyDate, formatActifyDateTime, toDateTimeLocalInputValueInTimeZone } from "@/lib/datetime";
import {
  addZonedDays,
  resolveTimeZone,
  zonedDateKey,
  zonedDateStringToUtcStart
} from "@/lib/timezone";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import type {
  DocumentationAssessmentType,
  DocumentationKind,
  DocumentationListRow,
  DocumentationPriority,
  DocumentationStatus
} from "@/lib/documentation/types";

type DocumentationResidentOption = {
  id: string;
  name: string;
  room: string;
  unit: string | null;
  age: number | null;
  admissionDateIso: string | null;
  status: string | null;
};

type DocumentationCommandCenterPayload = {
  rows: DocumentationListRow[];
  residents: DocumentationResidentOption[];
  timeZone: string;
  initialTab: DocumentationKind;
  canEdit: boolean;
};

type DueFilter = "all" | "due_soon" | "overdue" | "follow_up" | "current" | "missing";
type DateRangeFilter = "all" | "7d" | "30d" | "month";
type SortMode = "newest" | "oldest" | "due_soonest" | "overdue_first" | "resident_name" | "room" | "recently_updated";
type StatusFilter = "all" | DocumentationStatus;
type QuickCreateMode = DocumentationKind;

type DueState = {
  key: "none" | "overdue" | "due_today" | "due_soon" | "follow_up" | "current" | "missing";
  label: string;
  tone: string;
  rank: number;
  dueDate: Date | null;
};

type QuickPhraseCategory =
  | "Participation"
  | "Refusal"
  | "Mood / Affect"
  | "Follow-Up"
  | "1:1 Engagement"
  | "Group Response"
  | "Sensory / Music"
  | "Bedside Visit";

type QuickPhraseItem = {
  category: QuickPhraseCategory;
  text: string;
  kind: DocumentationKind | "ALL";
};

type DocumentationApiEntry = {
  id: string;
  kind: DocumentationKind;
  status: DocumentationStatus;
  priority: DocumentationPriority;
  title: string;
  summary: string;
  residentId: string;
  residentName: string;
  residentRoom: string;
  createdAtIso: string;
  authorName: string;
  dueDateIso: string | null;
  reviewDateIso: string | null;
  assessmentType: DocumentationAssessmentType | null;
  assignedStaff: string | null;
  sectionProgress: number | null;
  noMajorChange: boolean | null;
  residentUnit: string | null;
  residentBirthDateIso: string | null;
  hasFollowUp: boolean;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  cuesRequired: "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
};

const TAB_META: Array<{
  key: DocumentationKind;
  label: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  newHref: string;
}> = [
  {
    key: "PROGRESS",
    label: "Progress Notes",
    subtitle: "Daily resident engagement and response notes",
    icon: FilePenLine,
    newHref: "/app/documentation/progress-notes/new"
  },
  {
    key: "ONE_TO_ONE",
    label: "1:1 Notes",
    subtitle: "Individualized resident visit documentation",
    icon: UserRound,
    newHref: "/app/documentation/one-to-one/new"
  },
  {
    key: "UDA",
    label: "UDA",
    subtitle: "Admission, quarterly, and annual assessment queue",
    icon: ClipboardList,
    newHref: "/app/documentation/uda/new"
  },
  {
    key: "MDS",
    label: "MDS",
    subtitle: "Section F and related activity documentation",
    icon: FileCheck2,
    newHref: "/app/documentation/mds/new"
  }
];

const STATUS_META: Record<DocumentationStatus, { label: string; tone: string }> = {
  DRAFT: {
    label: "Draft",
    tone: "border-[#d7b355]/45 bg-[#d7b355]/18 text-[#fde9b0]"
  },
  IN_PROGRESS: {
    label: "In Progress",
    tone: "border-sky-300/45 bg-sky-500/20 text-sky-100"
  },
  READY_REVIEW: {
    label: "Needs Review",
    tone: "border-violet-300/45 bg-violet-500/20 text-violet-100"
  },
  COMPLETED: {
    label: "Completed",
    tone: "border-emerald-300/45 bg-emerald-500/20 text-emerald-100"
  }
};

const ASSESSMENT_TYPE_LABEL: Record<DocumentationAssessmentType, string> = {
  ADMISSION: "Admission",
  ANNUAL: "Annual",
  QUARTERLY: "Quarterly",
  SECTION_F: "Section F"
};

const QUICK_PHRASES: QuickPhraseItem[] = [
  {
    category: "Participation",
    kind: "PROGRESS",
    text: "Resident attended group activity and remained engaged throughout the session with minimal cueing."
  },
  {
    category: "Participation",
    kind: "PROGRESS",
    text: "Resident participated partially and benefited from verbal prompts to remain involved."
  },
  {
    category: "Refusal",
    kind: "PROGRESS",
    text: "Resident declined invitation and preferred to remain in room; right to refuse honored."
  },
  {
    category: "Mood / Affect",
    kind: "PROGRESS",
    text: "Resident appeared calm and cooperative during the interaction with no acute distress observed."
  },
  {
    category: "Mood / Affect",
    kind: "ONE_TO_ONE",
    text: "Resident presented with flat affect initially and became more responsive during 1:1 conversation."
  },
  {
    category: "Follow-Up",
    kind: "ALL",
    text: "Follow-up recommended within 48 hours to reassess engagement and participation tolerance."
  },
  {
    category: "1:1 Engagement",
    kind: "ONE_TO_ONE",
    text: "Resident responded positively to 1:1 visit and engaged in preferred conversation topic."
  },
  {
    category: "1:1 Engagement",
    kind: "ONE_TO_ONE",
    text: "Bedside 1:1 completed with comfort-focused interaction and music discussion."
  },
  {
    category: "Group Response",
    kind: "PROGRESS",
    text: "Resident required encouragement at start of group but remained attentive through completion."
  },
  {
    category: "Sensory / Music",
    kind: "ONE_TO_ONE",
    text: "Music-based intervention improved resident engagement and reduced withdrawal during visit."
  },
  {
    category: "Bedside Visit",
    kind: "ONE_TO_ONE",
    text: "Resident preferred bedside interaction today; activity materials adapted for in-room participation."
  },
  {
    category: "Follow-Up",
    kind: "UDA",
    text: "Assessment indicates resident would benefit from individualized encouragement and preference-based scheduling."
  },
  {
    category: "Follow-Up",
    kind: "MDS",
    text: "Documentation supports continued focus on resident preference expression and psychosocial well-being."
  }
];

function normalizeTab(value: string | null | undefined): DocumentationKind {
  if (value === "ONE_TO_ONE" || value === "UDA" || value === "MDS") return value;
  return "PROGRESS";
}

function toOpenHref(row: DocumentationListRow) {
  if (row.openHref) return row.openHref;
  if (row.kind === "PROGRESS") return `/app/documentation/progress-notes/${encodeURIComponent(row.id)}`;
  if (row.kind === "ONE_TO_ONE") return `/app/documentation/one-to-one/${encodeURIComponent(row.id)}`;
  if (row.kind === "UDA") return `/app/documentation/uda/${encodeURIComponent(row.id)}`;
  return `/app/documentation/mds/${encodeURIComponent(row.id)}`;
}

function toEditHref(row: DocumentationListRow) {
  const openHref = toOpenHref(row);
  if (row.source === "DUE_TRACKER" && row.actionHref) {
    return row.actionHref;
  }
  if (openHref.endsWith("/new")) return openHref;
  if (openHref.includes("/new?")) return openHref;

  if (row.kind === "PROGRESS") return `/app/documentation/progress-notes/${encodeURIComponent(row.id)}`;
  if (row.kind === "ONE_TO_ONE") return `/app/documentation/one-to-one/${encodeURIComponent(row.id)}`;
  if (row.kind === "UDA") return `/app/documentation/uda/${encodeURIComponent(row.id)}`;
  return `/app/documentation/mds/${encodeURIComponent(row.id)}`;
}

function toDuplicateHref(row: DocumentationListRow) {
  const residentParam = `residentId=${encodeURIComponent(row.residentId)}`;
  if (row.kind === "PROGRESS") return `/app/documentation/progress-notes/new?${residentParam}`;
  if (row.kind === "ONE_TO_ONE") return `/app/documentation/one-to-one/new?${residentParam}`;
  if (row.kind === "UDA") {
    const assessmentType = row.assessmentType && row.assessmentType !== "SECTION_F" ? row.assessmentType : "QUARTERLY";
    return `/app/documentation/uda/new?${residentParam}&assessmentType=${assessmentType}`;
  }
  return `/app/documentation/mds/new?${residentParam}`;
}

function parseDueDate(row: DocumentationListRow, timeZone: string) {
  if (!row.dueDateIso) return null;
  const normalized = zonedDateStringToUtcStart(row.dueDateIso, timeZone);
  if (normalized) return normalized;
  const parsed = new Date(row.dueDateIso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function resolveDueState(row: DocumentationListRow, now: Date, timeZone: string): DueState {
  const dueDate = parseDueDate(row, timeZone);
  const todayKey = zonedDateKey(now, timeZone);
  const todayStart = zonedDateStringToUtcStart(todayKey, timeZone) ?? now;

  if (row.complianceStatus === "OVERDUE") {
    return {
      key: "overdue",
      label: "Overdue",
      tone: "border-rose-300/45 bg-rose-500/20 text-rose-100",
      rank: 0,
      dueDate
    };
  }

  if (row.complianceStatus === "MISSING") {
    return {
      key: "missing",
      label: "Missing",
      tone: "border-rose-300/45 bg-rose-500/20 text-rose-100",
      rank: 0,
      dueDate
    };
  }

  if (row.complianceStatus === "FOLLOW_UP_NEEDED") {
    return {
      key: "follow_up",
      label: "Follow-Up Needed",
      tone: "border-blue-300/45 bg-blue-500/20 text-blue-100",
      rank: 1,
      dueDate
    };
  }

  if (row.complianceStatus === "DUE_THIS_MONTH" || row.complianceStatus === "DUE_SOON") {
    return {
      key: "due_soon",
      label: "Due Soon",
      tone: "border-amber-300/45 bg-amber-500/20 text-amber-100",
      rank: 1,
      dueDate
    };
  }

  if (dueDate && row.status !== "COMPLETED") {
    if (dueDate < todayStart) {
      return {
        key: "overdue",
        label: "Overdue",
        tone: "border-rose-300/45 bg-rose-500/20 text-rose-100",
        rank: 0,
        dueDate
      };
    }

    const dueKey = zonedDateKey(dueDate, timeZone);
    if (dueKey === todayKey) {
      return {
        key: "due_today",
        label: "Due Today",
        tone: "border-amber-300/45 bg-amber-500/20 text-amber-100",
        rank: 1,
        dueDate
      };
    }

    const daysSeven = addZonedDays(todayStart, timeZone, 7);
    if (dueDate <= daysSeven) {
      return {
        key: "due_soon",
        label: "Due Soon",
        tone: "border-amber-300/45 bg-amber-500/20 text-amber-100",
        rank: 1,
        dueDate
      };
    }
  }

  if (row.status === "COMPLETED" || row.complianceStatus === "CURRENT" || row.complianceStatus === "COMPLETED") {
    return {
      key: "current",
      label: "Current",
      tone: "border-emerald-300/45 bg-emerald-500/20 text-emerald-100",
      rank: 3,
      dueDate
    };
  }

  return {
    key: "none",
    label: "No Due Date",
    tone: "border-[#3c5a86] bg-[#132644] text-[#cfe0ff]",
    rank: 4,
    dueDate
  };
}

function formatDueDetail(row: DocumentationListRow, timeZone: string) {
  const parsed = parseDueDate(row, timeZone);
  if (!parsed) return "No due date";
  return formatActifyDate(parsed, timeZone);
}

function getTabLabel(kind: DocumentationKind) {
  return TAB_META.find((tab) => tab.key === kind)?.label ?? kind;
}

function formatRelativeDue(row: DocumentationListRow, timeZone: string) {
  const dueDate = parseDueDate(row, timeZone);
  if (!dueDate) return "";

  const nowKey = zonedDateKey(new Date(), timeZone);
  const nowStart = zonedDateStringToUtcStart(nowKey, timeZone) ?? new Date();
  const diff = dueDate.getTime() - nowStart.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Due today";
  if (days > 0) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  const overdue = Math.abs(days);
  return `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
}

function getHistorySummaryRows(rows: DocumentationListRow[], residentId: string, max = 10) {
  return rows
    .filter((row) => row.residentId === residentId)
    .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime())
    .slice(0, max);
}

function parseTabFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return normalizeTab(params.get("tab"));
}

export function DocumentationCommandCenter({
  rows,
  residents,
  timeZone,
  initialTab,
  canEdit
}: DocumentationCommandCenterPayload) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const resolvedTimeZone = resolveTimeZone(timeZone);

  const [allRows, setAllRows] = useState<DocumentationListRow[]>(rows);
  const [activeTab, setActiveTab] = useState<DocumentationKind>(initialTab);
  const [search, setSearch] = useState("");
  const [residentFilter, setResidentFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("overdue_first");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(rows[0]?.id ?? null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(residents[0]?.id ?? null);
  const [isTabPending, startTabTransition] = useTransition();

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateKind, setQuickCreateKind] = useState<QuickCreateMode>(initialTab);
  const [quickCreateResidentId, setQuickCreateResidentId] = useState("");
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [quickCreateNarrative, setQuickCreateNarrative] = useState("");
  const [quickCreateFollowUp, setQuickCreateFollowUp] = useState("");
  const [quickCreateDueDate, setQuickCreateDueDate] = useState("");
  const [quickCreateAssessmentType, setQuickCreateAssessmentType] = useState<"ADMISSION" | "ANNUAL" | "QUARTERLY">("QUARTERLY");
  const [quickPhraseCategory, setQuickPhraseCategory] = useState<QuickPhraseCategory | "ALL">("ALL");
  const [quickPhraseQuery, setQuickPhraseQuery] = useState("");
  const [savingQuickCreate, setSavingQuickCreate] = useState(false);
  const [completingEntryId, setCompletingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const tabFromUrl = parseTabFromUrl();
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  useEffect(() => {
    setAllRows(rows);
  }, [rows]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    router.replace(`/app/documentation?${params.toString()}`, { scroll: false });
  }, [activeTab, router]);

  const residentOptions = useMemo(() => {
    return [...residents].sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" }));
  }, [residents]);

  const residentById = useMemo(() => {
    return new Map(residents.map((resident) => [resident.id, resident]));
  }, [residents]);

  const unitOptions = useMemo(() => {
    return Array.from(new Set(residents.map((resident) => resident.unit).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [residents]);

  const now = useMemo(() => new Date(), []);

  const summary = useMemo(() => {
    const dueSoon = allRows.filter((row) => {
      const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
      return dueState.key === "due_soon" || dueState.key === "due_today" || dueState.key === "follow_up";
    }).length;

    const overdue = allRows.filter((row) => {
      const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
      return dueState.key === "overdue" || dueState.key === "missing";
    }).length;

    const weekStart = addZonedDays(
      zonedDateStringToUtcStart(zonedDateKey(new Date(), resolvedTimeZone), resolvedTimeZone) ?? new Date(),
      resolvedTimeZone,
      -6
    );

    const notesCompletedWeek = allRows.filter((row) => {
      const createdAt = new Date(row.createdAtIso);
      if (Number.isNaN(createdAt.getTime())) return false;
      return row.status === "COMPLETED" && createdAt >= weekStart;
    }).length;

    const residentsNeedingFollowUp = new Set(
      allRows
        .filter((row) => {
          const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
          return dueState.key === "overdue" || dueState.key === "missing" || dueState.key === "follow_up";
        })
        .map((row) => row.residentId)
    ).size;

    const newAdmissionsNeedingDocs = residents.filter((resident) => {
      if (!resident.admissionDateIso) return false;
      const admissionDate = new Date(resident.admissionDateIso);
      if (Number.isNaN(admissionDate.getTime())) return false;
      const windowStart = addZonedDays(new Date(), resolvedTimeZone, -14);
      if (admissionDate < windowStart) return false;
      return !allRows.some((row) => row.residentId === resident.id && row.kind === "ONE_TO_ONE");
    }).length;

    return {
      dueSoon,
      overdue,
      notesCompletedWeek,
      residentsNeedingFollowUp,
      newAdmissionsNeedingDocs
    };
  }, [allRows, residents, resolvedTimeZone]);

  const tabCounts = useMemo(() => {
    return {
      PROGRESS: allRows.filter((row) => row.kind === "PROGRESS").length,
      ONE_TO_ONE: allRows.filter((row) => row.kind === "ONE_TO_ONE").length,
      UDA: allRows.filter((row) => row.kind === "UDA").length,
      MDS: allRows.filter((row) => row.kind === "MDS").length
    } as Record<DocumentationKind, number>;
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const todayKey = zonedDateKey(new Date(), resolvedTimeZone);
    const monthStart = zonedDateStringToUtcStart(`${todayKey.slice(0, 7)}-01`, resolvedTimeZone);
    const sevenDayStart = addZonedDays(new Date(), resolvedTimeZone, -6);
    const thirtyDayStart = addZonedDays(new Date(), resolvedTimeZone, -29);

    const visible = allRows.filter((row) => {
      if (row.kind !== activeTab) return false;

      if (residentFilter !== "all" && row.residentId !== residentFilter) return false;
      if (unitFilter !== "all" && (row.residentUnit ?? "") !== unitFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;

      const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
      if (dueFilter !== "all") {
        if (dueFilter === "due_soon" && !(dueState.key === "due_soon" || dueState.key === "due_today")) return false;
        if (dueFilter === "overdue" && dueState.key !== "overdue") return false;
        if (dueFilter === "follow_up" && dueState.key !== "follow_up") return false;
        if (dueFilter === "current" && dueState.key !== "current") return false;
        if (dueFilter === "missing" && dueState.key !== "missing") return false;
      }

      const createdAt = new Date(row.createdAtIso);
      if (!Number.isNaN(createdAt.getTime())) {
        if (dateRange === "7d" && createdAt < sevenDayStart) return false;
        if (dateRange === "30d" && createdAt < thirtyDayStart) return false;
        if (dateRange === "month" && monthStart && createdAt < monthStart) return false;
      }

      if (!query) return true;

      const searchable = [
        row.title,
        row.summary,
        row.residentName,
        row.residentRoom,
        row.authorName,
        row.assignedStaff ?? "",
        row.assessmentType ? ASSESSMENT_TYPE_LABEL[row.assessmentType] : ""
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });

    const sorted = [...visible];
    sorted.sort((a, b) => {
      const aCreated = new Date(a.createdAtIso).getTime();
      const bCreated = new Date(b.createdAtIso).getTime();
      const aDue = parseDueDate(a, resolvedTimeZone)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = parseDueDate(b, resolvedTimeZone)?.getTime() ?? Number.POSITIVE_INFINITY;
      const aDueState = resolveDueState(a, new Date(), resolvedTimeZone);
      const bDueState = resolveDueState(b, new Date(), resolvedTimeZone);

      if (sortMode === "newest") {
        return bCreated - aCreated;
      }
      if (sortMode === "oldest") {
        return aCreated - bCreated;
      }
      if (sortMode === "resident_name") {
        const byName = a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
        if (byName !== 0) return byName;
        return a.residentRoom.localeCompare(b.residentRoom, undefined, { numeric: true, sensitivity: "base" });
      }
      if (sortMode === "room") {
        const byRoom = a.residentRoom.localeCompare(b.residentRoom, undefined, { numeric: true, sensitivity: "base" });
        if (byRoom !== 0) return byRoom;
        return a.residentName.localeCompare(b.residentName, undefined, { sensitivity: "base" });
      }
      if (sortMode === "due_soonest") {
        if (aDue !== bDue) return aDue - bDue;
        return bCreated - aCreated;
      }
      if (sortMode === "recently_updated") {
        const aUpdated = new Date(a.reviewDateIso ?? a.createdAtIso).getTime();
        const bUpdated = new Date(b.reviewDateIso ?? b.createdAtIso).getTime();
        return bUpdated - aUpdated;
      }

      if (aDueState.rank !== bDueState.rank) return aDueState.rank - bDueState.rank;
      if (aDue !== bDue) return aDue - bDue;
      return bCreated - aCreated;
    });

    return sorted;
  }, [
    activeTab,
    allRows,
    dateRange,
    dueFilter,
    residentFilter,
    resolvedTimeZone,
    search,
    sortMode,
    statusFilter,
    unitFilter
  ]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedRowId(null);
      return;
    }
    if (selectedRowId && filteredRows.some((row) => row.id === selectedRowId)) return;
    setSelectedRowId(filteredRows[0]?.id ?? null);
  }, [filteredRows, selectedRowId]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return filteredRows.find((row) => row.id === selectedRowId) ?? null;
  }, [filteredRows, selectedRowId]);

  useEffect(() => {
    if (selectedRow?.residentId) {
      setSelectedResidentId(selectedRow.residentId);
    }
  }, [selectedRow?.residentId]);

  const selectedResident = useMemo(() => {
    if (!selectedResidentId) return null;
    return residentById.get(selectedResidentId) ?? null;
  }, [residentById, selectedResidentId]);

  const residentHistoryRows = useMemo(() => {
    if (!selectedResidentId) return [];
    return getHistorySummaryRows(allRows, selectedResidentId, 12);
  }, [allRows, selectedResidentId]);

  const dueItems = useMemo(() => {
    const enriched = allRows
      .map((row) => {
        const dueState = resolveDueState(row, now, resolvedTimeZone);
        return {
          row,
          dueState,
          dueDate: dueState.dueDate?.getTime() ?? Number.POSITIVE_INFINITY
        };
      })
      .filter(({ dueState }) => dueState.key !== "none" && dueState.key !== "current")
      .sort((a, b) => {
        if (a.dueState.rank !== b.dueState.rank) return a.dueState.rank - b.dueState.rank;
        if (a.dueDate !== b.dueDate) return a.dueDate - b.dueDate;
        return new Date(b.row.createdAtIso).getTime() - new Date(a.row.createdAtIso).getTime();
      });

    return enriched.slice(0, 10);
  }, [allRows, now, resolvedTimeZone]);

  const quickPhraseRows = useMemo(() => {
    const query = quickPhraseQuery.trim().toLowerCase();

    return QUICK_PHRASES.filter((phrase) => {
      if (phrase.kind !== "ALL" && phrase.kind !== quickCreateKind && phrase.kind !== activeTab) {
        return false;
      }
      if (quickPhraseCategory !== "ALL" && phrase.category !== quickPhraseCategory) {
        return false;
      }
      if (!query) return true;
      return `${phrase.category} ${phrase.text}`.toLowerCase().includes(query);
    });
  }, [activeTab, quickCreateKind, quickPhraseCategory, quickPhraseQuery]);

  const quickCreateHref = useMemo(() => {
    const params = new URLSearchParams();
    if (quickCreateResidentId) params.set("residentId", quickCreateResidentId);
    if (quickCreateNarrative.trim()) params.set("prefill", quickCreateNarrative.trim());
    if (quickCreateTitle.trim()) params.set("title", quickCreateTitle.trim());
    if (quickCreateFollowUp.trim()) params.set("followUp", quickCreateFollowUp.trim());

    if (quickCreateKind === "PROGRESS") {
      return `/app/documentation/progress-notes/new${params.size ? `?${params.toString()}` : ""}`;
    }
    if (quickCreateKind === "ONE_TO_ONE") {
      return `/app/documentation/one-to-one/new${params.size ? `?${params.toString()}` : ""}`;
    }
    if (quickCreateKind === "UDA") {
      params.set("assessmentType", quickCreateAssessmentType);
      return `/app/documentation/uda/new${params.size ? `?${params.toString()}` : ""}`;
    }
    return `/app/documentation/mds/new${params.size ? `?${params.toString()}` : ""}`;
  }, [quickCreateAssessmentType, quickCreateFollowUp, quickCreateKind, quickCreateNarrative, quickCreateResidentId, quickCreateTitle]);

  const authorizedFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getToken().catch(() => null);
      const headers = new Headers(init.headers ?? {});
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(input, {
        ...init,
        headers,
        credentials: "include"
      });
    },
    [getToken]
  );

  const copyPhrase = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Phrase copied",
          description: "Quick phrase copied to clipboard."
        });
      } catch {
        toast({
          title: "Copy failed",
          description: "Clipboard access was blocked in this browser.",
          variant: "destructive"
        });
      }
    },
    [toast]
  );

  const insertPhrase = useCallback((text: string) => {
    setQuickCreateNarrative((previous) => {
      if (!previous.trim()) return text;
      return `${previous.trim()}\n${text}`;
    });
  }, []);

  const saveQuickDraft = useCallback(
    async (openAfterSave: boolean) => {
      if (!canEdit) {
        toast({
          title: "Read-only access",
          description: "You do not have permission to create documentation entries.",
          variant: "destructive"
        });
        return;
      }

      if (!quickCreateResidentId) {
        toast({
          title: "Resident required",
          description: "Select a resident before saving.",
          variant: "destructive"
        });
        return;
      }

      if (quickCreateNarrative.trim().length < 8) {
        toast({
          title: "Narrative required",
          description: "Add a short documentation narrative before saving.",
          variant: "destructive"
        });
        return;
      }

      setSavingQuickCreate(true);
      try {
        const payload = {
          kind: quickCreateKind,
          residentId: quickCreateResidentId,
          title: quickCreateTitle.trim(),
          narrative: quickCreateNarrative.trim(),
          followUp: quickCreateFollowUp.trim() || null,
          status: "DRAFT" as DocumentationStatus,
          priority: "MEDIUM" as DocumentationPriority,
          participationLevel: "MODERATE",
          moodAffect: "CALM",
          cuesRequired: "VERBAL",
          response: quickCreateKind === "ONE_TO_ONE" ? "POSITIVE" : "NEUTRAL",
          dueDate: quickCreateDueDate || null,
          occurredAt: toDateTimeLocalInputValueInTimeZone(new Date(), resolvedTimeZone),
          assessmentType: quickCreateKind === "UDA" ? quickCreateAssessmentType : quickCreateKind === "MDS" ? "SECTION_F" : null,
          reviewDate: null,
          assignedStaff: null,
          noMajorChange: null,
          sectionStates: null,
          sectionProgress: null,
          carryForwardFromId: null
        };

        const response = await authorizedFetch("/api/documentation/entries", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const body = (await response.json().catch(() => null)) as
          | {
              entry?: DocumentationApiEntry;
              error?: { message?: string };
            }
          | null;

        if (!response.ok || !body?.entry) {
          throw new Error(body?.error?.message || "Unable to create documentation draft.");
        }

        const resident = residentById.get(body.entry.residentId);
        const nextRow: DocumentationListRow = {
          ...body.entry,
          residentUnit: body.entry.residentUnit ?? resident?.unit ?? null,
          residentBirthDateIso: body.entry.residentBirthDateIso ?? null,
          complianceStatus: body.entry.status === "COMPLETED" ? "COMPLETED" : null,
          openHref:
            body.entry.kind === "PROGRESS"
              ? `/app/documentation/progress-notes/${encodeURIComponent(body.entry.id)}`
              : body.entry.kind === "ONE_TO_ONE"
                ? `/app/documentation/one-to-one/${encodeURIComponent(body.entry.id)}`
                : body.entry.kind === "UDA"
                  ? `/app/documentation/uda/${encodeURIComponent(body.entry.id)}`
                  : `/app/documentation/mds/${encodeURIComponent(body.entry.id)}`,
          source: "ENTRY"
        };

        setAllRows((previous) => [nextRow, ...previous]);
        setSelectedRowId(nextRow.id);
        setSelectedResidentId(nextRow.residentId);

        toast({
          title: "Draft created",
          description: `${getTabLabel(nextRow.kind)} draft created for ${nextRow.residentName}.`
        });

        if (openAfterSave) {
          router.push(toOpenHref(nextRow));
          return;
        }

        setQuickCreateOpen(false);
        setQuickCreateTitle("");
        setQuickCreateNarrative("");
        setQuickCreateFollowUp("");
        setQuickCreateDueDate("");
      } catch (error) {
        toast({
          title: "Create failed",
          description: error instanceof Error ? error.message : "Unable to create documentation draft.",
          variant: "destructive"
        });
      } finally {
        setSavingQuickCreate(false);
      }
    },
    [
      authorizedFetch,
      canEdit,
      quickCreateAssessmentType,
      quickCreateDueDate,
      quickCreateFollowUp,
      quickCreateKind,
      quickCreateNarrative,
      quickCreateResidentId,
      quickCreateTitle,
      resolvedTimeZone,
      residentById,
      router,
      toast
    ]
  );

  const markRowComplete = useCallback(
    async (row: DocumentationListRow) => {
      if (!canEdit) {
        toast({
          title: "Read-only access",
          description: "You do not have permission to update documentation entries.",
          variant: "destructive"
        });
        return;
      }

      if (row.source === "DUE_TRACKER") {
        toast({
          title: "Open entry first",
          description: "Start the assessment entry before marking it complete.",
          variant: "destructive"
        });
        return;
      }

      setCompletingEntryId(row.id);
      try {
        const readResponse = await authorizedFetch(`/api/documentation/entries/${encodeURIComponent(row.id)}`, {
          cache: "no-store"
        });
        const readBody = (await readResponse.json().catch(() => null)) as
          | {
              entry?: DocumentationApiEntry;
              narrativeBody?: string;
              meta?: {
                assessmentType?: DocumentationAssessmentType | null;
                reviewDateIso?: string | null;
                assignedStaff?: string | null;
                sectionProgress?: number | null;
                noMajorChange?: boolean | null;
                sectionStates?: Record<string, "NO_CHANGE" | "UPDATED" | "SIGNIFICANT_CHANGE"> | null;
              };
              followUpTitle?: string | null;
              error?: { message?: string };
            }
          | null;

        if (!readResponse.ok || !readBody?.entry || !readBody.narrativeBody) {
          throw new Error(readBody?.error?.message || "Unable to load entry before completion update.");
        }

        const patchPayload = {
          title: readBody.followUpTitle ?? readBody.entry.title ?? "",
          narrative: readBody.narrativeBody,
          followUp: readBody.followUpTitle ?? "",
          status: "COMPLETED" as DocumentationStatus,
          priority: readBody.entry.priority,
          participationLevel: readBody.entry.participationLevel,
          moodAffect: readBody.entry.moodAffect,
          cuesRequired: readBody.entry.cuesRequired,
          response: readBody.entry.response,
          dueDate: readBody.entry.dueDateIso ?? null,
          occurredAt: toDateTimeLocalInputValueInTimeZone(readBody.entry.createdAtIso, resolvedTimeZone),
          sectionProgress: readBody.meta?.sectionProgress ?? null,
          assessmentType: readBody.meta?.assessmentType ?? null,
          reviewDate: readBody.meta?.reviewDateIso ?? null,
          assignedStaff: readBody.meta?.assignedStaff ?? null,
          noMajorChange: readBody.meta?.noMajorChange ?? null,
          sectionStates: readBody.meta?.sectionStates ?? null,
          carryForwardFromId: null
        };

        const patchResponse = await authorizedFetch(`/api/documentation/entries/${encodeURIComponent(row.id)}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(patchPayload)
        });
        const patchBody = (await patchResponse.json().catch(() => null)) as
          | {
              entry?: DocumentationApiEntry;
              error?: { message?: string };
            }
          | null;

        if (!patchResponse.ok || !patchBody?.entry) {
          throw new Error(patchBody?.error?.message || "Unable to mark entry complete.");
        }

        setAllRows((previous) =>
          previous.map((entry) => {
            if (entry.id !== row.id) return entry;
            return {
              ...entry,
              status: "COMPLETED",
              complianceStatus: "COMPLETED"
            };
          })
        );

        toast({
          title: "Marked complete",
          description: `${row.title} is now marked completed.`
        });
      } catch (error) {
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Unable to update entry.",
          variant: "destructive"
        });
      } finally {
        setCompletingEntryId(null);
      }
    },
    [authorizedFetch, canEdit, resolvedTimeZone, toast]
  );

  const deleteRow = useCallback(
    async (row: DocumentationListRow) => {
      if (!canEdit) {
        toast({
          title: "Read-only access",
          description: "You do not have permission to delete entries.",
          variant: "destructive"
        });
        return;
      }

      if (row.source === "DUE_TRACKER") {
        toast({
          title: "Queue-only row",
          description: "This row is generated from due logic and cannot be deleted.",
          variant: "destructive"
        });
        return;
      }

      const confirmed = window.confirm(`Delete ${row.title} for ${row.residentName}? This cannot be undone.`);
      if (!confirmed) return;

      try {
        const response = await authorizedFetch(`/api/documentation/entries/${encodeURIComponent(row.id)}`, {
          method: "DELETE"
        });
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        if (!response.ok) {
          throw new Error(body?.error?.message || "Unable to delete entry.");
        }

        setAllRows((previous) => previous.filter((entry) => entry.id !== row.id));
        toast({
          title: "Entry deleted",
          description: `${row.title} was removed.`
        });
      } catch (error) {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unable to delete entry.",
          variant: "destructive"
        });
      }
    },
    [authorizedFetch, canEdit, toast]
  );

  const exportRowsCsv = useCallback(() => {
    const lines: string[] = [];
    lines.push("Type,Resident,Room,Unit,Status,Due State,Due Date,Created,Author,Priority,Summary");

    for (const row of filteredRows) {
      const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
      lines.push(
        [
          getTabLabel(row.kind),
          row.residentName,
          row.residentRoom,
          row.residentUnit ?? "",
          STATUS_META[row.status].label,
          dueState.label,
          formatDueDetail(row, resolvedTimeZone),
          formatActifyDateTime(row.createdAtIso, resolvedTimeZone),
          row.authorName,
          row.priority,
          (row.summary ?? "").replaceAll("\n", " ")
        ]
          .map((value) => {
            const token = String(value ?? "");
            if (!/[",\n]/.test(token)) return token;
            return `"${token.replaceAll("\"", "\"\"")}"`;
          })
          .join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `documentation-${activeTab.toLowerCase()}-${zonedDateKey(new Date(), resolvedTimeZone)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }, [activeTab, filteredRows, resolvedTimeZone]);

  const printWorkspace = useCallback(() => {
    const docWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
    if (!docWindow) {
      toast({
        title: "Print blocked",
        description: "Allow pop-ups to print documentation lists.",
        variant: "destructive"
      });
      return;
    }

    const rowsMarkup = filteredRows
      .map((row) => {
        const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
        return `<tr>
          <td>${row.residentName}</td>
          <td>${row.residentRoom}</td>
          <td>${getTabLabel(row.kind)}</td>
          <td>${STATUS_META[row.status].label}</td>
          <td>${dueState.label}</td>
          <td>${formatDueDetail(row, resolvedTimeZone)}</td>
          <td>${formatActifyDateTime(row.createdAtIso, resolvedTimeZone)}</td>
          <td>${row.authorName}</td>
        </tr>`;
      })
      .join("");

    docWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Documentation Workspace</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; margin: 24px; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  p { margin: 0 0 4px; color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
  th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
</style>
</head>
<body>
  <h1>Documentation · ${getTabLabel(activeTab)}</h1>
  <p>Generated ${formatActifyDateTime(new Date(), resolvedTimeZone)}</p>
  <p>Rows: ${filteredRows.length}</p>
  <table>
    <thead>
      <tr>
        <th>Resident</th>
        <th>Room</th>
        <th>Type</th>
        <th>Status</th>
        <th>Due State</th>
        <th>Due Date</th>
        <th>Created</th>
        <th>Author</th>
      </tr>
    </thead>
    <tbody>${rowsMarkup}</tbody>
  </table>
</body>
</html>`);

    docWindow.document.close();
    docWindow.focus();
    docWindow.print();
  }, [activeTab, filteredRows, resolvedTimeZone, toast]);

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#050b18] p-3 md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1180px_520px_at_-8%_0%,rgba(250,204,21,0.14),transparent_62%),radial-gradient(860px_420px_at_95%_0%,rgba(56,189,248,0.16),transparent_62%),radial-gradient(760px_360px_at_40%_100%,rgba(129,140,248,0.14),transparent_72%)]" />

      <div className="relative z-10 space-y-4">
        <section className="rounded-2xl border border-[#2a3e64] bg-[#091327]/95 p-4 shadow-[0_24px_60px_-38px_rgba(37,99,235,0.6)] md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#93acd7]">Documentation Hub</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Documentation Command Center</h1>
              <p className="mt-2 text-sm text-[#9cb3d9]">Keep notes, due items, resident history, and follow-up documentation aligned across Progress, 1:1, UDA, and MDS workflows.</p>
              <p className="mt-2 text-xs text-[#7f95bc]">{formatActifyDate(new Date(), resolvedTimeZone)} · {summary.overdue} overdue · {summary.dueSoon} due soon</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickCreateKind(activeTab);
                  setQuickCreateResidentId(selectedResidentId ?? "");
                  setQuickCreateOpen(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-300/45 bg-[linear-gradient(180deg,#294a7f_0%,#1d345d_100%)] px-3 text-sm font-semibold text-white transition hover:border-blue-200/60"
              >
                <Plus className="h-4 w-4" />
                New Note
              </button>
              <Link
                href={TAB_META.find((tab) => tab.key === activeTab)?.newHref ?? "/app/documentation/progress-notes/new"}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3f5f8f] bg-[#112340] px-3 text-sm font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
              >
                <FilePenLine className="h-4 w-4" />
                Open Editor
              </Link>
              <button
                type="button"
                onClick={exportRowsCsv}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3f5f8f] bg-[#112340] px-3 text-sm font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={printWorkspace}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3f5f8f] bg-[#112340] px-3 text-sm font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              key: "due-soon",
              label: "Due Soon",
              value: summary.dueSoon,
              help: "Items due this week or pending follow-up",
              icon: CalendarClock,
              tone: "from-amber-400/25 to-orange-500/15",
              border: "border-amber-300/35"
            },
            {
              key: "overdue",
              label: "Overdue",
              value: summary.overdue,
              help: "Documentation requiring immediate action",
              icon: AlertTriangle,
              tone: "from-rose-500/25 to-orange-500/15",
              border: "border-rose-300/35"
            },
            {
              key: "completed",
              label: "Notes Completed This Week",
              value: summary.notesCompletedWeek,
              help: "Completed documentation in the last 7 days",
              icon: ClipboardCheck,
              tone: "from-emerald-500/25 to-teal-500/15",
              border: "border-emerald-300/35"
            },
            {
              key: "follow-up",
              label: "Residents Needing Follow-Up",
              value: summary.residentsNeedingFollowUp,
              help: "Residents tied to overdue or follow-up items",
              icon: Users,
              tone: "from-sky-500/25 to-indigo-500/15",
              border: "border-sky-300/35"
            },
            {
              key: "admission",
              label: "New Admissions Requiring Docs",
              value: summary.newAdmissionsNeedingDocs,
              help: "Recent admissions without documentation coverage",
              icon: Sparkles,
              tone: "from-violet-500/25 to-fuchsia-500/15",
              border: "border-violet-300/35"
            }
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.key}
                className={cn(
                  "rounded-2xl border bg-[#0a162b]/95 p-4",
                  "bg-gradient-to-br",
                  card.tone,
                  card.border
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b3c7ea]">{card.label}</p>
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                <p className="mt-1 text-xs text-[#d0def8]">{card.help}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[#283c60] bg-[#081222]/95 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {TAB_META.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    startTabTransition(() => {
                      setActiveTab(tab.key);
                    });
                  }}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                    isActive
                      ? "border-cyan-300/45 bg-cyan-500/20 text-cyan-100"
                      : "border-[#39557f] bg-[#0f1d35] text-[#c5d7f7] hover:border-[#557bb1]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span className="rounded-full border border-current/40 px-2 py-0.5 text-[11px]">{tabCounts[tab.key]}</span>
                </button>
              );
            })}
            {isTabPending ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#3e5f8f] bg-[#112340] px-3 py-1 text-xs text-[#cde0ff]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating tab
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-[#9cb3d9]">{TAB_META.find((tab) => tab.key === activeTab)?.subtitle}</p>
        </section>

        <section className="rounded-2xl border border-[#283c60] bg-[#081222]/95 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_220px_220px_190px_190px_190px_220px]">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Search Documentation</span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-[#39557f] bg-[#0f1d35] px-3">
                <Search className="h-4 w-4 text-[#9eb7df]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Resident, room, summary, author"
                  className="w-full bg-transparent text-sm text-[#dbe8ff] outline-none placeholder:text-[#7f97bf]"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Resident</span>
              <select
                value={residentFilter}
                onChange={(event) => {
                  setResidentFilter(event.target.value);
                  if (event.target.value !== "all") {
                    setSelectedResidentId(event.target.value);
                  }
                }}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="all">All residents</option>
                {residentOptions.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.room} · {resident.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Unit</span>
              <select
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="all">All units</option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="all">All status</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="READY_REVIEW">Needs Review</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Due</span>
              <select
                value={dueFilter}
                onChange={(event) => setDueFilter(event.target.value as DueFilter)}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="all">All due states</option>
                <option value="due_soon">Due Soon</option>
                <option value="overdue">Overdue</option>
                <option value="follow_up">Follow-Up Needed</option>
                <option value="current">Current</option>
                <option value="missing">Missing</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Date Range</span>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value as DateRangeFilter)}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="month">This month</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Sort</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="overdue_first">Overdue First</option>
                <option value="due_soonest">Due Soonest</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="resident_name">Resident Name</option>
                <option value="room">Room Number</option>
                <option value="recently_updated">Recently Updated</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setResidentFilter("all");
                setUnitFilter("all");
                setStatusFilter("all");
                setDueFilter("all");
                setDateRange("all");
                setSortMode("overdue_first");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
            >
              <Filter className="h-3.5 w-3.5" />
              Reset Filters
            </button>
            <span className="rounded-full border border-[#3d5b85] bg-[#10203c] px-3 py-1 text-xs font-semibold text-[#cde0ff]">
              {filteredRows.length} results
            </span>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-full border border-[#395b8a] bg-[#12233f] px-3 text-xs font-semibold text-[#d6e5ff]"
            >
              <Plus className="h-3.5 w-3.5" />
              Quick Create
            </button>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-[#2a3f63] bg-[#081224]/95">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#243751] px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{getTabLabel(activeTab)} List</h2>
                  <p className="text-xs text-[#95add5]">Searchable resident-linked documentation rows with status and due tracking.</p>
                </div>
                <Link
                  href={TAB_META.find((tab) => tab.key === activeTab)?.newHref ?? "/app/documentation/progress-notes/new"}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New {getTabLabel(activeTab).replace(" Notes", "")}
                </Link>
              </header>

              {filteredRows.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-5 text-sm text-[#a9bfdf]">
                    <p className="text-base font-semibold text-[#dce8ff]">No documentation found for these filters.</p>
                    <p className="mt-1">Adjust filters or create a new {getTabLabel(activeTab).toLowerCase()} entry.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCreateKind(activeTab);
                        setQuickCreateOpen(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 py-1.5 text-xs font-semibold text-[#dbe8ff]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create {getTabLabel(activeTab).replace(" Notes", "")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-h-[840px] overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {filteredRows.map((row) => {
                      const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
                      const isSelected = row.id === selectedRowId;
                      const meta = STATUS_META[row.status];

                      return (
                        <article
                          key={`${row.kind}-${row.id}`}
                          className={cn(
                            "rounded-xl border px-3 py-3 transition",
                            isSelected
                              ? "border-[#5f86bf] bg-[#122443]"
                              : "border-[#243751] bg-[#0d1a31] hover:border-[#395782]"
                          )}
                          onClick={() => {
                            setSelectedRowId(row.id);
                            setSelectedResidentId(row.residentId);
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-[#3e5b86] bg-[#11223e] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c4d7f7]">
                                  {getTabLabel(row.kind)}
                                </span>
                                <span className="rounded-full border border-[#3e5b86] bg-[#11223e] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c4d7f7]">
                                  Room {row.residentRoom}
                                </span>
                                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]", meta.tone)}>
                                  {meta.label}
                                </span>
                                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]", dueState.tone)}>
                                  {dueState.label}
                                </span>
                                {row.priority !== "LOW" ? (
                                  <span className={cn(
                                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                                    row.priority === "HIGH"
                                      ? "border-rose-300/45 bg-rose-500/20 text-rose-100"
                                      : "border-amber-300/45 bg-amber-500/20 text-amber-100"
                                  )}>
                                    {row.priority} Priority
                                  </span>
                                ) : null}
                                {row.hasFollowUp ? (
                                  <span className="rounded-full border border-blue-300/45 bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                                    Follow-Up Flag
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="text-sm font-semibold text-white">{row.residentName} · {row.title}</h3>
                              <p className="line-clamp-2 text-xs text-[#b7caea]">{row.summary || "No summary available."}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9ab3d8]">
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {formatActifyDateTime(row.createdAtIso, resolvedTimeZone)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <UserRound className="h-3.5 w-3.5" />
                                  {row.authorName}
                                </span>
                                {row.assessmentType ? <span>{ASSESSMENT_TYPE_LABEL[row.assessmentType]}</span> : null}
                                {row.dueDateIso ? <span>{formatRelativeDue(row, resolvedTimeZone)}</span> : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={toOpenHref(row)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dbe8ff]"
                              >
                                Open
                              </Link>
                              <Link
                                href={toEditHref(row)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dbe8ff]"
                              >
                                Edit
                              </Link>
                              <Link
                                href={toDuplicateHref(row)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dbe8ff]"
                              >
                                Duplicate
                              </Link>
                              {row.status !== "COMPLETED" ? (
                                <button
                                  type="button"
                                  onClick={() => void markRowComplete(row)}
                                  disabled={completingEntryId === row.id}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-300/45 bg-emerald-500/20 px-2 text-[11px] font-semibold text-emerald-100 disabled:opacity-60"
                                >
                                  {completingEntryId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                  Mark Complete
                                </button>
                              ) : null}
                              <Link
                                href={`/app/residents/${encodeURIComponent(row.residentId)}`}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dbe8ff]"
                              >
                                Resident
                              </Link>
                              <button
                                type="button"
                                onClick={() => void deleteRow(row)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-300/45 bg-rose-500/20 px-2 text-[11px] font-semibold text-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-[#2a3f63] bg-[#081224]/95 p-4">
              <h3 className="text-base font-semibold text-white">Selected Documentation Preview</h3>
              {selectedRow ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                    <p className="text-sm font-semibold text-white">{selectedRow.title}</p>
                    <p className="mt-1 text-xs text-[#b7caea]">{selectedRow.summary || "No summary available."}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#9ab3d8]">
                      <span>{selectedRow.residentName}</span>
                      <span>Room {selectedRow.residentRoom}</span>
                      <span>{STATUS_META[selectedRow.status].label}</span>
                      <span>{formatDueDetail(selectedRow, resolvedTimeZone)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={toOpenHref(selectedRow)}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff]"
                    >
                      <BookOpenText className="h-3.5 w-3.5" />
                      Open Entry
                    </Link>
                    <Link
                      href={`/app/residents/${encodeURIComponent(selectedRow.residentId)}`}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff]"
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      Resident Profile
                    </Link>
                    <Link
                      href="/app/attendance"
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff]"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Attendance
                    </Link>
                    <Link
                      href={`/app/residents/${encodeURIComponent(selectedRow.residentId)}/care-plan`}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff]"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      Care Plan
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-4 text-sm text-[#a9bfdf]">
                  Select a documentation row to preview details.
                </div>
              )}
            </article>
          </div>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Documentation Due</h3>
              {dueItems.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-4 text-sm text-[#a9bfdf]">
                  You’re caught up for now.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {dueItems.map(({ row, dueState }) => (
                    <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{row.residentName}</p>
                        <span className="rounded-full border border-[#3e5b84] bg-[#11223e] px-2 py-0.5 text-[11px] font-semibold text-[#c4d7f7]">{row.residentRoom}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#b7caea]">{getTabLabel(row.kind)} · {row.title}</p>
                      <p className="mt-1 text-[11px] text-[#9ab3d8]">{formatRelativeDue(row, resolvedTimeZone) || dueState.label}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]", dueState.tone)}>{dueState.label}</span>
                        <Link href={row.actionHref ?? toOpenHref(row)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                          {row.actionLabel ?? "Open"}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Resident History</h3>
              <div className="mt-3 space-y-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Resident</span>
                  <select
                    value={selectedResidentId ?? ""}
                    onChange={(event) => setSelectedResidentId(event.target.value || null)}
                    className="h-9 w-full rounded-lg border border-[#35527b] bg-[#0f1d35] px-2 text-xs text-[#dbe8ff] outline-none"
                  >
                    <option value="">Select resident</option>
                    {residentOptions.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.room} · {resident.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedResident ? (
                  <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                    <p className="text-sm font-semibold text-white">{selectedResident.name}</p>
                    <p className="text-xs text-[#9ab3d8]">Room {selectedResident.room}{selectedResident.unit ? ` · ${selectedResident.unit}` : ""}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#b7caea]">
                      {selectedResident.age ? <span>Age {selectedResident.age}</span> : null}
                      {selectedResident.admissionDateIso ? <span>Admitted {formatActifyDate(selectedResident.admissionDateIso, resolvedTimeZone)}</span> : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-3 text-xs text-[#a9bfdf]">
                    Select a resident to view linked documentation history.
                  </div>
                )}

                {selectedResident && residentHistoryRows.length > 0 ? (
                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                    {residentHistoryRows.map((row) => {
                      const dueState = resolveDueState(row, new Date(), resolvedTimeZone);
                      return (
                        <Link
                          key={`${row.kind}-${row.id}-history`}
                          href={toOpenHref(row)}
                          className="block rounded-lg border border-[#243753] bg-[#0e1d36] p-2.5"
                        >
                          <p className="text-xs font-semibold text-white">{getTabLabel(row.kind)} · {STATUS_META[row.status].label}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] text-[#b7caea]">{row.summary || row.title}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-[#8fa9d3]">
                            <span>{formatActifyDate(row.createdAtIso, resolvedTimeZone)}</span>
                            <span>{dueState.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : selectedResident ? (
                  <div className="rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-3 text-xs text-[#a9bfdf]">
                    No documentation history for this resident yet.
                  </div>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Quick Phrases</h3>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateOpen(true);
                    setQuickCreateKind(activeTab);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-2.5 text-[11px] font-semibold text-[#dbe8ff]"
                >
                  Insert
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Search phrases</span>
                  <input
                    value={quickPhraseQuery}
                    onChange={(event) => setQuickPhraseQuery(event.target.value)}
                    placeholder="Search by phrase"
                    className="h-9 w-full rounded-lg border border-[#35527b] bg-[#0f1d35] px-2 text-xs text-[#dbe8ff] outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Category</span>
                  <select
                    value={quickPhraseCategory}
                    onChange={(event) => setQuickPhraseCategory(event.target.value as QuickPhraseCategory | "ALL")}
                    className="h-9 w-full rounded-lg border border-[#35527b] bg-[#0f1d35] px-2 text-xs text-[#dbe8ff] outline-none"
                  >
                    <option value="ALL">All categories</option>
                    {Array.from(new Set(QUICK_PHRASES.map((phrase) => phrase.category))).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {quickPhraseRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#385176] bg-[#0e1d35] p-3 text-xs text-[#a9bfdf]">
                      No quick phrases matched your search.
                    </div>
                  ) : (
                    quickPhraseRows.map((phrase, index) => (
                      <div key={`${phrase.category}-${index}-${phrase.text.slice(0, 24)}`} className="rounded-lg border border-[#243753] bg-[#0e1d36] p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9ab3d8]">{phrase.category}</p>
                        <p className="mt-1 text-xs text-[#d7e4fd]">{phrase.text}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => insertPhrase(phrase.text)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-300/45 bg-blue-500/20 px-2 text-[11px] font-semibold text-blue-100"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Insert
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyPhrase(phrase.text)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dbe8ff]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>

      {quickCreateOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#020714]/75 backdrop-blur-sm">
          <aside className="h-full w-full max-w-[520px] overflow-y-auto border-l border-[#2b426a] bg-[#081224] p-4 shadow-[0_25px_60px_-24px_rgba(15,23,42,0.8)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#93acd7]">Quick Create</p>
                <h2 className="mt-1 text-xl font-bold text-white">Create Documentation Draft</h2>
                <p className="mt-1 text-sm text-[#9cb3d9]">Capture a draft quickly, then open the full editor when needed.</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickCreateOpen(false)}
                className="inline-flex h-8 items-center rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {TAB_META.map((tab) => (
                  <button
                    key={`quick-${tab.key}`}
                    type="button"
                    onClick={() => setQuickCreateKind(tab.key)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
                      quickCreateKind === tab.key
                        ? "border-cyan-300/45 bg-cyan-500/20 text-cyan-100"
                        : "border-[#3f5f8f] bg-[#112340] text-[#dbe8ff]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Resident</span>
                <select
                  value={quickCreateResidentId}
                  onChange={(event) => setQuickCreateResidentId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
                >
                  <option value="">Select resident</option>
                  {residentOptions.map((resident) => (
                    <option key={`quick-res-${resident.id}`} value={resident.id}>
                      {resident.room} · {resident.name}
                    </option>
                  ))}
                </select>
              </label>

              {quickCreateKind === "UDA" ? (
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Assessment Type</span>
                  <select
                    value={quickCreateAssessmentType}
                    onChange={(event) => setQuickCreateAssessmentType(event.target.value as "ADMISSION" | "ANNUAL" | "QUARTERLY")}
                    className="h-11 w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
                  >
                    <option value="ADMISSION">Admission</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </label>
              ) : null}

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Title (optional)</span>
                <input
                  value={quickCreateTitle}
                  onChange={(event) => setQuickCreateTitle(event.target.value)}
                  placeholder="Short title"
                  className="h-11 w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none placeholder:text-[#7f97bf]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Narrative</span>
                <textarea
                  value={quickCreateNarrative}
                  onChange={(event) => setQuickCreateNarrative(event.target.value)}
                  rows={7}
                  placeholder="Enter documentation summary..."
                  className="w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 py-2 text-sm text-[#dbe8ff] outline-none placeholder:text-[#7f97bf]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Follow-Up (optional)</span>
                <textarea
                  value={quickCreateFollowUp}
                  onChange={(event) => setQuickCreateFollowUp(event.target.value)}
                  rows={3}
                  placeholder="Follow-up recommendation"
                  className="w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 py-2 text-sm text-[#dbe8ff] outline-none placeholder:text-[#7f97bf]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Due Date (optional)</span>
                <input
                  type="date"
                  value={quickCreateDueDate}
                  onChange={(event) => setQuickCreateDueDate(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
                />
              </label>

              <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ab3d8]">Quick Phrase Insert</p>
                <div className="mt-2 max-h-[180px] space-y-2 overflow-y-auto pr-1">
                  {quickPhraseRows.slice(0, 6).map((phrase, index) => (
                    <button
                      key={`drawer-phrase-${index}-${phrase.text.slice(0, 14)}`}
                      type="button"
                      onClick={() => insertPhrase(phrase.text)}
                      className="w-full rounded-lg border border-[#35527b] bg-[#10213f] px-2.5 py-2 text-left text-xs text-[#d7e4fd] transition hover:border-[#5a82bc]"
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9ab3d8]">{phrase.category}</span>
                      <span className="mt-1 block line-clamp-2">{phrase.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void saveQuickDraft(false)}
                  disabled={savingQuickCreate}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3f5f8f] bg-[#112340] px-3 text-sm font-semibold text-[#dbe8ff] disabled:opacity-60"
                >
                  {savingQuickCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => void saveQuickDraft(true)}
                  disabled={savingQuickCreate}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300/45 bg-emerald-500/20 px-3 text-sm font-semibold text-emerald-100 disabled:opacity-60"
                >
                  {savingQuickCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                  Save & Open
                </button>
                <Link
                  href={quickCreateHref}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-300/45 bg-blue-500/20 px-3 text-sm font-semibold text-blue-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Full Editor
                </Link>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
