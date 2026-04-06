"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  Filter,
  Flag,
  LayoutGrid,
  ListFilter,
  NotebookPen,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
  UserPlus,
  Users
} from "lucide-react";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { GlowProgressBar } from "@/components/dashboard/v4/GlowProgressBar";
import { ImportResidentsModal } from "@/components/residents/ImportResidentsModal";
import { ResidentFormModal } from "@/components/residents/ResidentFormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compareResidentsByRoom, formatResidentStatusLabel } from "@/lib/resident-status";
import { type AssessmentDueLevel } from "@/lib/residents/assessment-due";
import {
  isNeedsOneOnOne,
  RESIDENT_FILTER_OPTIONS,
  RESIDENT_SORT_OPTIONS,
  toResidentStatusLabel,
  type ResidentFilterKey,
  type ResidentListRow,
  type ResidentSortKey,
  type ResidentUpsertPayload
} from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type ParticipationBand = "all" | "high" | "moderate" | "low";
type ProfileTab = "overview" | "preferences" | "participation" | "documentation" | "care-plan" | "due";
type AssessmentKind = "ADMISSION_UDA" | "QUARTERLY_UDA" | "ANNUAL_UDA" | "MDS";

type ResidentDueItem = {
  id: string;
  label: string;
  kind: "ASSESSMENT" | "ONE_TO_ONE";
  dueDateIso: string | null;
  level: AssessmentDueLevel;
  statusLabel: string;
  daysUntil: number | null;
  daysOverdue: number | null;
  actionHref: string;
  actionLabel: string;
  assessmentKind?: AssessmentKind;
};

const DUE_SOON_LEVELS: AssessmentDueLevel[] = ["DUE_TODAY", "DUE_SOON_7", "DUE_SOON_14", "DUE_SOON_30"];

const PROFILE_TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "preferences", label: "Interests & Preferences" },
  { id: "participation", label: "Participation History" },
  { id: "documentation", label: "Documentation History" },
  { id: "care-plan", label: "Care Plan Snapshot" },
  { id: "due", label: "Upcoming Due Items" }
];

function parseIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDate(value: string | null | undefined) {
  const parsed = parseIsoDate(value ?? null);
  if (!parsed) return "Not set";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateShort(value: string | null | undefined) {
  const parsed = parseIsoDate(value ?? null);
  if (!parsed) return "Not set";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatDateTime(value: string | null | undefined) {
  const parsed = parseIsoDate(value ?? null);
  if (!parsed) return "Not recorded";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toCsvField(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  if (!text.includes(",") && !text.includes('"') && !text.includes("\n")) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function getResidentName(resident: ResidentListRow) {
  return `${resident.firstName} ${resident.lastName}`;
}

function formatLengthOfStay(days: number | null) {
  if (days == null) return "Unknown";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  const remaining = days % 30;
  if (remaining === 0) return `${months}m`;
  return `${months}m ${remaining}d`;
}

function isDueSoon(level: AssessmentDueLevel) {
  return DUE_SOON_LEVELS.includes(level);
}

function isDueOrOverdue(level: AssessmentDueLevel) {
  return level === "OVERDUE" || isDueSoon(level);
}

function dueBadgeClass(level: AssessmentDueLevel) {
  if (level === "OVERDUE") {
    return "border-rose-300/50 bg-rose-500/15 text-rose-100";
  }
  if (isDueSoon(level)) {
    return "border-amber-300/50 bg-amber-500/15 text-amber-100";
  }
  if (level === "ON_TRACK") {
    return "border-emerald-300/45 bg-emerald-500/12 text-emerald-100";
  }
  if (level === "INACTIVE") {
    return "border-zinc-500/45 bg-zinc-500/20 text-zinc-200";
  }
  return "border-[#3d5e92] bg-[#10223f] text-[#c8daf8]";
}

function duePriority(level: AssessmentDueLevel) {
  if (level === "OVERDUE") return 0;
  if (level === "DUE_TODAY") return 1;
  if (level === "DUE_SOON_7") return 2;
  if (level === "DUE_SOON_14") return 3;
  if (level === "DUE_SOON_30") return 4;
  if (level === "ON_TRACK") return 5;
  if (level === "UNSCHEDULED") return 6;
  return 7;
}

function oneToOneDueModel(resident: ResidentListRow, now: Date) {
  const lastVisitDate = parseIsoDate(resident.lastOneOnOneAt);
  if (!lastVisitDate) {
    return {
      dueDateIso: null,
      level: "OVERDUE" as AssessmentDueLevel,
      statusLabel: "No 1:1 this month",
      daysUntil: null,
      daysOverdue: 30
    };
  }

  const dueDate = new Date(lastVisitDate.getTime());
  dueDate.setDate(dueDate.getDate() + 30);

  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueBy = Math.abs(diffDays);
    return {
      dueDateIso: dueDate.toISOString(),
      level: "OVERDUE" as AssessmentDueLevel,
      statusLabel: `Overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"}`,
      daysUntil: diffDays,
      daysOverdue: overdueBy
    };
  }

  if (diffDays === 0) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_TODAY" as AssessmentDueLevel,
      statusLabel: "Due today",
      daysUntil: 0,
      daysOverdue: null
    };
  }

  if (diffDays <= 7) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_SOON_7" as AssessmentDueLevel,
      statusLabel: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      daysUntil: diffDays,
      daysOverdue: null
    };
  }

  if (diffDays <= 14) {
    return {
      dueDateIso: dueDate.toISOString(),
      level: "DUE_SOON_14" as AssessmentDueLevel,
      statusLabel: `Due in ${diffDays} days`,
      daysUntil: diffDays,
      daysOverdue: null
    };
  }

  return {
    dueDateIso: dueDate.toISOString(),
    level: "ON_TRACK" as AssessmentDueLevel,
    statusLabel: "Current",
    daysUntil: diffDays,
    daysOverdue: null
  };
}

function buildResidentDueItems(resident: ResidentListRow, now: Date): ResidentDueItem[] {
  const assessmentItems: ResidentDueItem[] = [
    {
      id: `${resident.id}-admission-uda`,
      label: "Admission UDA",
      kind: "ASSESSMENT",
      dueDateIso: resident.assessmentSchedule.admission.dueDateIso,
      level: resident.assessmentSchedule.admission.level,
      statusLabel: resident.assessmentSchedule.admission.label,
      daysUntil: resident.assessmentSchedule.admission.daysUntil,
      daysOverdue: resident.assessmentSchedule.admission.daysOverdue,
      actionHref: `/app/documentation/uda?residentId=${resident.id}&assessmentType=ADMISSION`,
      actionLabel: "Open Admission UDA",
      assessmentKind: "ADMISSION_UDA"
    },
    {
      id: `${resident.id}-quarterly-uda`,
      label: "Quarterly UDA",
      kind: "ASSESSMENT",
      dueDateIso: resident.assessmentSchedule.quarterly.dueDateIso,
      level: resident.assessmentSchedule.quarterly.level,
      statusLabel: resident.assessmentSchedule.quarterly.label,
      daysUntil: resident.assessmentSchedule.quarterly.daysUntil,
      daysOverdue: resident.assessmentSchedule.quarterly.daysOverdue,
      actionHref: `/app/documentation/uda?residentId=${resident.id}&assessmentType=QUARTERLY`,
      actionLabel: "Open Quarterly UDA",
      assessmentKind: "QUARTERLY_UDA"
    },
    {
      id: `${resident.id}-annual-uda`,
      label: "Annual UDA",
      kind: "ASSESSMENT",
      dueDateIso: resident.assessmentSchedule.annual.dueDateIso,
      level: resident.assessmentSchedule.annual.level,
      statusLabel: resident.assessmentSchedule.annual.label,
      daysUntil: resident.assessmentSchedule.annual.daysUntil,
      daysOverdue: resident.assessmentSchedule.annual.daysOverdue,
      actionHref: `/app/documentation/uda?residentId=${resident.id}&assessmentType=ANNUAL`,
      actionLabel: "Open Annual UDA",
      assessmentKind: "ANNUAL_UDA"
    },
    {
      id: `${resident.id}-mds`,
      label: "MDS",
      kind: "ASSESSMENT",
      dueDateIso: resident.assessmentSchedule.mds.dueDateIso,
      level: resident.assessmentSchedule.mds.level,
      statusLabel: resident.assessmentSchedule.mds.label,
      daysUntil: resident.assessmentSchedule.mds.daysUntil,
      daysOverdue: resident.assessmentSchedule.mds.daysOverdue,
      actionHref: `/app/documentation/mds?residentId=${resident.id}`,
      actionLabel: "Open MDS",
      assessmentKind: "MDS"
    }
  ];

  const oneToOneStatus = oneToOneDueModel(resident, now);

  const oneToOneItem: ResidentDueItem = {
    id: `${resident.id}-one-to-one`,
    label: "1:1 Note",
    kind: "ONE_TO_ONE",
    dueDateIso: oneToOneStatus.dueDateIso,
    level: oneToOneStatus.level,
    statusLabel: oneToOneStatus.statusLabel,
    daysUntil: oneToOneStatus.daysUntil,
    daysOverdue: oneToOneStatus.daysOverdue,
    actionHref: `/app/documentation/one-to-one/new?residentId=${resident.id}`,
    actionLabel: "Add 1:1 Note"
  };

  return [...assessmentItems, oneToOneItem].sort((a, b) => {
    const priorityDelta = duePriority(a.level) - duePriority(b.level);
    if (priorityDelta !== 0) return priorityDelta;

    const aDate = parseIsoDate(a.dueDateIso)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDate = parseIsoDate(b.dueDateIso)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDate !== bDate) return aDate - bDate;

    return a.label.localeCompare(b.label);
  });
}

function participationLabel(percent: number | null) {
  if (percent == null) {
    return { text: "No Data", tone: "border-zinc-500/45 bg-zinc-500/20 text-zinc-200" };
  }
  if (percent >= 70) {
    return { text: "High Participation", tone: "border-emerald-300/45 bg-emerald-500/12 text-emerald-100" };
  }
  if (percent >= 40) {
    return { text: "Moderate Participation", tone: "border-blue-300/45 bg-blue-500/12 text-blue-100" };
  }
  return { text: "Low Participation", tone: "border-amber-300/45 bg-amber-500/12 text-amber-100" };
}

function admissionDaysAgo(resident: ResidentListRow, now: Date) {
  const admission = parseIsoDate(resident.admissionDate);
  if (!admission) return null;
  return Math.max(0, Math.floor((now.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24)));
}

function isNewAdmission(resident: ResidentListRow, now: Date, thresholdDays = 14) {
  const days = admissionDaysAgo(resident, now);
  return days != null && days <= thresholdDays;
}

function matchesResidentFilter(resident: ResidentListRow, filter: ResidentFilterKey) {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return resident.status === "ACTIVE" || resident.status === "BED_BOUND";
  if (filter === "BED_BOUND") return resident.status === "BED_BOUND";
  if (filter === "HOSPITAL") return resident.status === "HOSPITALIZED";
  if (filter === "ON_LEAVE") return resident.status === "ON_LEAVE";
  if (filter === "DISCHARGED") return resident.status === "DISCHARGED";
  if (filter === "OVERDUE") return resident.assessmentFlags.overdueCount > 0;
  if (filter === "DUE_SOON") return resident.assessmentFlags.overdueCount === 0 && resident.assessmentFlags.dueSoonCount > 0;
  if (filter === "QUARTERLY_DUE") return isDueOrOverdue(resident.assessmentSchedule.quarterly.level);
  if (filter === "ANNUAL_DUE") return isDueOrOverdue(resident.assessmentSchedule.annual.level);
  if (filter === "MDS_DUE") return isDueOrOverdue(resident.assessmentSchedule.mds.level);
  return true;
}

function matchesParticipationFilter(resident: ResidentListRow, filter: ParticipationBand) {
  if (filter === "all") return true;
  const participation = resident.attendanceSnapshot.participationPercent30d ?? 0;
  if (filter === "high") return participation >= 70;
  if (filter === "moderate") return participation >= 40 && participation < 70;
  return participation < 40;
}

function nextDueDateMillis(resident: ResidentListRow) {
  const parsed = parseIsoDate(resident.assessmentSchedule.nextDueDateIso);
  return parsed ? parsed.getTime() : Number.POSITIVE_INFINITY;
}

function maxOverdueDays(resident: ResidentListRow) {
  return Math.max(
    resident.assessmentSchedule.admission.daysOverdue ?? 0,
    resident.assessmentSchedule.quarterly.daysOverdue ?? 0,
    resident.assessmentSchedule.annual.daysOverdue ?? 0,
    resident.assessmentSchedule.mds.daysOverdue ?? 0
  );
}

function sortResidents(rows: ResidentListRow[], sortBy: ResidentSortKey) {
  const sorted = [...rows];

  if (sortBy === "NAME") {
    return sorted.sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
      if (last !== 0) return last;
      return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
    });
  }

  if (sortBy === "ADMISSION_NEWEST") {
    return sorted.sort((a, b) => {
      const aTime = parseIsoDate(a.admissionDate)?.getTime() ?? 0;
      const bTime = parseIsoDate(b.admissionDate)?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  if (sortBy === "ADMISSION_OLDEST") {
    return sorted.sort((a, b) => {
      const aTime = parseIsoDate(a.admissionDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bTime = parseIsoDate(b.admissionDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }

  if (sortBy === "NEXT_DUE") {
    return sorted.sort((a, b) => nextDueDateMillis(a) - nextDueDateMillis(b));
  }

  if (sortBy === "MOST_OVERDUE") {
    return sorted.sort((a, b) => maxOverdueDays(b) - maxOverdueDays(a));
  }

  if (sortBy === "PARTICIPATION_HIGH") {
    return sorted.sort((a, b) => (b.attendanceSnapshot.participationPercent30d ?? 0) - (a.attendanceSnapshot.participationPercent30d ?? 0));
  }

  if (sortBy === "PARTICIPATION_LOW") {
    return sorted.sort((a, b) => (a.attendanceSnapshot.participationPercent30d ?? 0) - (b.attendanceSnapshot.participationPercent30d ?? 0));
  }

  if (sortBy === "NEEDS_1TO1") {
    return sorted.sort((a, b) => {
      const aLast = parseIsoDate(a.lastOneOnOneAt)?.getTime() ?? 0;
      const bLast = parseIsoDate(b.lastOneOnOneAt)?.getTime() ?? 0;
      return aLast - bLast;
    });
  }

  if (sortBy === "RECENTLY_SEEN") {
    return sorted.sort((a, b) => {
      const aLast = parseIsoDate(a.lastOneOnOneAt)?.getTime() ?? 0;
      const bLast = parseIsoDate(b.lastOneOnOneAt)?.getTime() ?? 0;
      return bLast - aLast;
    });
  }

  return sorted.sort(compareResidentsByRoom);
}

function splitTextToChips(value: string | null, max = 12) {
  if (!value) return [];
  const chips = value
    .split(/[\n,;|•]/g)
    .map((token) => token.trim())
    .filter(Boolean);

  return chips.slice(0, max);
}

function primaryResidentSnippet(resident: ResidentListRow) {
  const source = resident.preferences || resident.notes || resident.bestTimesOfDay || resident.safetyNotes;
  if (!source) return "Preferences and engagement details can be added from profile editing.";
  const compact = source.replace(/\s+/g, " ").trim();
  if (compact.length <= 92) return compact;
  return `${compact.slice(0, 92)}...`;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  accentClass
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accentClass: string;
}) {
  return (
    <article className="rounded-2xl border border-[#28416b] bg-[linear-gradient(180deg,#111f38_0%,#0d182c_100%)] p-3 shadow-[0_20px_38px_-30px_rgba(37,99,235,0.8)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#97b1dc]">{label}</p>
        <span className={cn("rounded-lg border p-1.5", accentClass)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-[#a8bfe7]">{detail}</p>
    </article>
  );
}

function ResidentListItem({
  resident,
  selected,
  now,
  onSelect,
  onEdit,
  canEdit
}: {
  resident: ResidentListRow;
  selected: boolean;
  now: Date;
  onSelect: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const participation = resident.attendanceSnapshot.participationPercent30d;
  const participationState = participationLabel(participation);
  const requiresOneToOne = isNeedsOneOnOne(resident.lastOneOnOneAt, now, 30);
  const isNew = isNewAdmission(resident, now);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60",
        selected
          ? "border-cyan-300/60 bg-[linear-gradient(180deg,#15305a_0%,#102347_100%)] shadow-[0_20px_36px_-28px_rgba(45,212,191,0.75)]"
          : "border-[#2a436e] bg-[linear-gradient(180deg,#0f1c33_0%,#0d182d_100%)] hover:border-[#44679f] hover:bg-[linear-gradient(180deg,#132744_0%,#10203a_100%)]"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3f6298] bg-[#10213f] text-sm font-bold text-[#d8e7ff]">
          {resident.firstName.charAt(0)}
          {resident.lastName.charAt(0)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-white">{getResidentName(resident)}</p>
            {resident.preferredName ? (
              <Badge className="border-violet-300/45 bg-violet-500/14 text-[10px] text-violet-100">“{resident.preferredName}”</Badge>
            ) : null}
            <Badge className="border-[#3f6298] bg-[#10213f] text-[10px] text-[#d3e4ff]">Room {resident.room}</Badge>
            <Badge className="border-[#3f6298] bg-[#10213f] text-[10px] text-[#d3e4ff]">{toResidentStatusLabel(resident.status)}</Badge>
          </div>

          <p className="mt-2 line-clamp-2 text-xs text-[#a8bfe8]">{primaryResidentSnippet(resident)}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className={cn("text-[10px]", participationState.tone)}>{participationState.text}</Badge>
            {resident.assessmentFlags.overdueCount > 0 ? (
              <Badge className="border-rose-300/45 bg-rose-500/14 text-[10px] text-rose-100">Overdue {resident.assessmentFlags.overdueCount}</Badge>
            ) : null}
            {resident.assessmentFlags.dueSoonCount > 0 ? (
              <Badge className="border-amber-300/45 bg-amber-500/14 text-[10px] text-amber-100">Due soon {resident.assessmentFlags.dueSoonCount}</Badge>
            ) : null}
            {resident.followUpFlag ? <Badge className="border-blue-300/45 bg-blue-500/14 text-[10px] text-blue-100">Follow-up</Badge> : null}
            {requiresOneToOne ? <Badge className="border-violet-300/45 bg-violet-500/14 text-[10px] text-violet-100">1:1 Needed</Badge> : null}
            {isNew ? <Badge className="border-cyan-300/45 bg-cyan-500/14 text-[10px] text-cyan-100">New Admission</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#2f4a79] pt-2">
        <p className="text-[11px] text-[#9db5de]">Admission: {formatDateShort(resident.admissionDate)}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 border-[#3f6298] bg-[#10213f] px-2.5 text-[11px] text-[#d9e7ff] hover:bg-[#19335a]"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          disabled={!canEdit}
        >
          Edit
        </Button>
      </div>
    </button>
  );
}

export function ResidentsWorkspace({
  initialResidents,
  initialUnits,
  canEdit
}: {
  initialResidents: ResidentListRow[];
  initialUnits: Array<{ id: string; name: string }>;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const now = useMemo(() => new Date(), []);

  const [residents, setResidents] = useState(initialResidents);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ResidentFilterKey>("ACTIVE");
  const [sortBy, setSortBy] = useState<ResidentSortKey>("ROOM");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [participationFilter, setParticipationFilter] = useState<ParticipationBand>("all");
  const [admissionMonthFilter, setAdmissionMonthFilter] = useState<string>("all");
  const [profileTab, setProfileTab] = useState<ProfileTab>("overview");
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(initialResidents[0]?.id ?? null);

  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<ResidentListRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [isMarking, startMarkingTransition] = useTransition();

  const queryAppliedRef = useRef(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setResidents(initialResidents);
  }, [initialResidents]);

  useEffect(() => {
    if (queryAppliedRef.current) return;
    queryAppliedRef.current = true;

    const params = new URLSearchParams(window.location.search);

    const filterParam = params.get("filter");
    if (filterParam && RESIDENT_FILTER_OPTIONS.some((option) => option.value === filterParam)) {
      setFilter(filterParam as ResidentFilterKey);
    }

    const residentParam = params.get("residentId");
    if (residentParam) {
      setSelectedResidentId(residentParam);
    }

    const editResidentId = params.get("edit");
    if (!editResidentId) return;

    const match = initialResidents.find((resident) => resident.id === editResidentId);
    if (!match) return;

    setEditingResident(match);
    setAddEditOpen(true);

    params.delete("edit");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [initialResidents]);

  const monthOptions = useMemo(() => {
    const options = new Set<string>();

    residents.forEach((resident) => {
      const admission = parseIsoDate(resident.admissionDate);
      if (!admission) return;
      const key = `${admission.getFullYear()}-${String(admission.getMonth() + 1).padStart(2, "0")}`;
      options.add(key);
    });

    return Array.from(options).sort((a, b) => b.localeCompare(a));
  }, [residents]);

  const filteredResidents = useMemo(() => {
    const token = deferredSearch.trim().toLowerCase();

    const rows = residents.filter((resident) => {
      if (!matchesResidentFilter(resident, filter)) return false;
      if (unitFilter !== "all" && resident.unitId !== unitFilter) return false;
      if (!matchesParticipationFilter(resident, participationFilter)) return false;

      if (admissionMonthFilter !== "all") {
        const admission = parseIsoDate(resident.admissionDate);
        const month = admission ? `${admission.getFullYear()}-${String(admission.getMonth() + 1).padStart(2, "0")}` : null;
        if (!month || month !== admissionMonthFilter) return false;
      }

      if (!token) return true;

      const searchableParts = [
        getResidentName(resident),
        `${resident.lastName}, ${resident.firstName}`,
        resident.preferredName ?? "",
        resident.room,
        resident.unitName ?? "",
        toResidentStatusLabel(resident.status),
        resident.preferences ?? "",
        resident.notes ?? "",
        resident.bestTimesOfDay ?? ""
      ];

      return searchableParts.some((value) => value.toLowerCase().includes(token));
    });

    return sortResidents(rows, sortBy);
  }, [admissionMonthFilter, deferredSearch, filter, participationFilter, residents, sortBy, unitFilter]);

  useEffect(() => {
    if (filteredResidents.length === 0) {
      setSelectedResidentId(null);
      return;
    }

    if (!selectedResidentId || !filteredResidents.some((resident) => resident.id === selectedResidentId)) {
      setSelectedResidentId(filteredResidents[0].id);
    }
  }, [filteredResidents, selectedResidentId]);

  const selectedResident = useMemo(() => {
    if (!selectedResidentId) return null;
    return residents.find((resident) => resident.id === selectedResidentId) ?? null;
  }, [residents, selectedResidentId]);

  const selectedDueItems = useMemo(() => {
    if (!selectedResident) return [];
    return buildResidentDueItems(selectedResident, now);
  }, [now, selectedResident]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (filter !== "ACTIVE") count += 1;
    if (unitFilter !== "all") count += 1;
    if (participationFilter !== "all") count += 1;
    if (admissionMonthFilter !== "all") count += 1;
    if (sortBy !== "ROOM") count += 1;
    return count;
  }, [admissionMonthFilter, filter, participationFilter, search, sortBy, unitFilter]);

  const summary = useMemo(() => {
    const activeResidents = residents.filter((resident) => resident.status !== "DISCHARGED" && resident.status !== "DECEASED");

    const dueThisWeek = activeResidents.filter((resident) => {
      const statuses = [
        resident.assessmentSchedule.admission,
        resident.assessmentSchedule.quarterly,
        resident.assessmentSchedule.annual,
        resident.assessmentSchedule.mds
      ];

      return statuses.some((status) => status.daysUntil != null && status.daysUntil >= 0 && status.daysUntil <= 7);
    }).length;

    const newAdmissions = activeResidents.filter((resident) => isNewAdmission(resident, now)).length;

    const followUpNeeded = activeResidents.filter((resident) => {
      const lowParticipation = (resident.attendanceSnapshot.participationPercent30d ?? 0) < 40;
      const needsOneToOne = isNeedsOneOnOne(resident.lastOneOnOneAt, now, 30);
      return resident.followUpFlag || resident.assessmentFlags.overdueCount > 0 || needsOneToOne || lowParticipation;
    }).length;

    const highEngagement = activeResidents.filter((resident) => (resident.attendanceSnapshot.participationPercent30d ?? 0) >= 70).length;

    return {
      totalResidents: activeResidents.length,
      dueThisWeek,
      newAdmissions,
      followUpNeeded,
      highEngagement
    };
  }, [now, residents]);

  const globalDueQueue = useMemo(() => {
    return residents
      .flatMap((resident) =>
        buildResidentDueItems(resident, now).map((item) => ({
          ...item,
          residentId: resident.id,
          residentName: getResidentName(resident),
          room: resident.room
        }))
      )
      .filter((entry) => entry.level === "OVERDUE" || isDueSoon(entry.level))
      .sort((a, b) => {
        const priorityDelta = duePriority(a.level) - duePriority(b.level);
        if (priorityDelta !== 0) return priorityDelta;

        const aDate = parseIsoDate(a.dueDateIso)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bDate = parseIsoDate(b.dueDateIso)?.getTime() ?? Number.POSITIVE_INFINITY;
        return aDate - bDate;
      })
      .slice(0, 16);
  }, [now, residents]);

  const recentAdmissions = useMemo(() => {
    return residents
      .filter((resident) => isNewAdmission(resident, now, 45))
      .sort((a, b) => {
        const aTime = parseIsoDate(a.admissionDate)?.getTime() ?? 0;
        const bTime = parseIsoDate(b.admissionDate)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [now, residents]);

  function clearFilters() {
    setSearch("");
    setFilter("ACTIVE");
    setSortBy("ROOM");
    setUnitFilter("all");
    setParticipationFilter("all");
    setAdmissionMonthFilter("all");
  }

  function openAddResident() {
    setEditingResident(null);
    setAddEditOpen(true);
  }

  async function refreshResidents() {
    const response = await fetch("/api/residents?includeAll=true", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error ?? "Could not refresh resident records.");
    setResidents((payload.residents as ResidentListRow[]) ?? []);
  }

  async function upsertResident(payload: ResidentUpsertPayload, residentId?: string) {
    const endpoint = residentId ? `/api/residents/${encodeURIComponent(residentId)}` : "/api/residents";
    const method = residentId ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not save resident.");
    }

    const nextResident = body?.resident as ResidentListRow | undefined;
    if (nextResident?.id) {
      setResidents((current) => {
        const withoutTarget = current.filter((resident) => resident.id !== nextResident.id);
        return [...withoutTarget, nextResident];
      });
      setSelectedResidentId(nextResident.id);
      return;
    }

    await refreshResidents();
  }

  async function importResidents(rows: Array<{ firstName: string; lastName: string; room: string; status: string; notes?: string }>) {
    const response = await fetch("/api/residents/import", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ rows })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error ?? "Could not import residents.");
    }

    await refreshResidents();
    toast({
      title: "Import complete",
      description: `${body.summary?.processed ?? rows.length} row(s) processed.`
    });
  }

  async function markAssessmentComplete(residentId: string, kind: AssessmentKind) {
    if (!canEdit) return;

    startMarkingTransition(async () => {
      try {
        const response = await fetch(`/api/residents/${encodeURIComponent(residentId)}/assessments/complete`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ kind })
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error ?? "Could not mark assessment complete.");
        }

        await refreshResidents();
        toast({
          title: "Assessment updated",
          description: `${
            kind === "MDS"
              ? "MDS"
              : kind === "ANNUAL_UDA"
                ? "Annual UDA"
                : kind === "ADMISSION_UDA"
                  ? "Admission UDA"
                  : "Quarterly UDA"
          } marked complete.`
        });
      } catch (error) {
        toast({
          title: "Could not update assessment",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      }
    });
  }

  function exportVisibleResidents() {
    const headers = [
      "First Name",
      "Last Name",
      "Preferred Name",
      "Room",
      "Status",
      "Participation %",
      "Admission Date",
      "Next Due",
      "Overdue Count",
      "Follow Up Flag"
    ];

    const lines = [headers.join(",")];

    filteredResidents.forEach((resident) => {
      lines.push(
        [
          resident.firstName,
          resident.lastName,
          resident.preferredName,
          resident.room,
          formatResidentStatusLabel(resident.status),
          resident.attendanceSnapshot.participationPercent30d ?? 0,
          formatDate(resident.admissionDate),
          formatDate(resident.assessmentSchedule.nextDueDateIso),
          resident.assessmentFlags.overdueCount,
          resident.followUpFlag ? "Yes" : "No"
        ]
          .map((value) => toCsvField(value))
          .join(",")
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `actify-residents-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const selectedParticipation = selectedResident?.attendanceSnapshot.participationPercent30d ?? 0;
  const selectedParticipationState = participationLabel(selectedResident?.attendanceSnapshot.participationPercent30d ?? null);

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1e3255] bg-[#060c1a] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-4%_0%,rgba(56,189,248,0.18),transparent_58%),radial-gradient(940px_420px_at_96%_0%,rgba(139,92,246,0.22),transparent_58%),radial-gradient(880px_460px_at_60%_100%,rgba(37,99,235,0.18),transparent_66%)]" />

      <div className="relative z-10 space-y-4">
        <TopContentHeader
          eyebrow="Resident Management"
          title="Residents"
          subtitle="Manage resident profiles, engagement, documentation due dates, and follow-up actions from one calm workspace."
          icon={Users}
          accentGradientClasses="from-cyan-300 via-blue-400 to-indigo-500"
          actions={
            <>
              <Button
                type="button"
                onClick={openAddResident}
                disabled={!canEdit}
                className="h-10 rounded-full border border-cyan-300/50 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30"
              >
                <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
                Add Resident
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]"
                onClick={() => setImportOpen(true)}
                disabled={!canEdit}
              >
                <Upload className="mr-1.5 h-4 w-4" aria-hidden />
                Import Residents
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]"
                onClick={exportVisibleResidents}
              >
                <Download className="mr-1.5 h-4 w-4" aria-hidden />
                Export
              </Button>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={openAddResident}
              disabled={!canEdit}
              className="h-9 rounded-full border border-cyan-300/50 bg-cyan-500/20 px-4 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30"
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              Add Resident
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/documentation">Open Documentation</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/attendance">Open Attendance</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/residents/archive">Archived Residents</Link>
            </Button>
          </div>
        </TopContentHeader>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={Users}
            label="Total Residents"
            value={String(summary.totalResidents)}
            detail="Active resident census in this workspace"
            accentClass="border-cyan-300/45 bg-cyan-500/14 text-cyan-100"
          />
          <SummaryCard
            icon={Clock3}
            label="Due This Week"
            value={String(summary.dueThisWeek)}
            detail="Residents with due/overdue UDA, MDS, or 1:1"
            accentClass="border-amber-300/45 bg-amber-500/14 text-amber-100"
          />
          <SummaryCard
            icon={UserPlus}
            label="New Admissions"
            value={String(summary.newAdmissions)}
            detail="Admitted in the last 14 days"
            accentClass="border-blue-300/45 bg-blue-500/14 text-blue-100"
          />
          <SummaryCard
            icon={Flag}
            label="Follow-Up Needed"
            value={String(summary.followUpNeeded)}
            detail="Flagged by participation, due logic, or 1:1 gap"
            accentClass="border-violet-300/45 bg-violet-500/14 text-violet-100"
          />
          <SummaryCard
            icon={Sparkles}
            label="High Engagement"
            value={String(summary.highEngagement)}
            detail="Residents at 70%+ participation in 30 days"
            accentClass="border-emerald-300/45 bg-emerald-500/14 text-emerald-100"
          />
        </section>

        <section className="rounded-2xl border border-[#223a60] bg-[linear-gradient(180deg,#111f38_0%,#0c162b_100%)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98b2dc]">Resident Search & Filters</p>
              <p className="text-sm text-[#c8daf7]">Find residents quickly by room, due status, participation, and admission timing.</p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 ? (
                <Badge className="border-cyan-300/45 bg-cyan-500/16 text-cyan-100">
                  {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                </Badge>
              ) : (
                <Badge className="border-[#3b5d8f] bg-[#11203a] text-[#c6d9fb]">Default view</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-9 border-[#3b5d90] bg-[#122342] text-xs text-[#d4e5ff] hover:bg-[#193055]"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <Filter className="mr-1 h-3.5 w-3.5" aria-hidden />
                Reset
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <label className="group relative flex h-11 items-center rounded-xl border border-[#2f456e] bg-[#0f1a30] px-3 transition focus-within:border-[#4f74aa] focus-within:bg-[#13203a] lg:col-span-4">
              <Search className="h-4 w-4 shrink-0 text-[#9db4dd]" aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by resident name, room, preference, or notes"
                className="h-full flex-1 border-none bg-transparent px-2 text-sm text-[#dce9ff] placeholder:text-[#9eb4da] focus-visible:ring-0"
              />
            </label>

            <div className="lg:col-span-2">
              <Select value={filter} onValueChange={(value) => setFilter(value as ResidentFilterKey)}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <ListFilter className="mr-1 h-4 w-4 text-[#9ab1da]" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESIDENT_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <SelectValue placeholder="Unit / Hall" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {initialUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={admissionMonthFilter} onValueChange={setAdmissionMonthFilter}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <CalendarClock className="mr-1 h-4 w-4 text-[#9ab1da]" aria-hidden />
                  <SelectValue placeholder="Admission Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Admission Months</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(`${month}-01T12:00:00.000Z`).toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric"
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={participationFilter} onValueChange={(value) => setParticipationFilter(value as ParticipationBand)}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <SelectValue placeholder="Participation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Participation</SelectItem>
                  <SelectItem value="high">High (70%+)</SelectItem>
                  <SelectItem value="moderate">Moderate (40-69%)</SelectItem>
                  <SelectItem value="low">Low (&lt;40%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as ResidentSortKey)}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <LayoutGrid className="mr-1 h-4 w-4 text-[#9ab1da]" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESIDENT_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
          <aside className="rounded-2xl border border-[#21385d] bg-[linear-gradient(180deg,#0f1b31_0%,#0b1527_100%)] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9bb5de]">Resident Directory</p>
                <p className="text-sm text-[#c6d9f8]">
                  {filteredResidents.length} resident{filteredResidents.length === 1 ? "" : "s"} in view
                </p>
              </div>
              {isMarking ? <Badge className="border-blue-300/40 bg-blue-500/16 text-blue-100">Updating…</Badge> : null}
            </div>

            {filteredResidents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3a5688] bg-[#0d1a31] p-8 text-center">
                <p className="text-base font-semibold text-white">No residents match these filters.</p>
                <p className="mt-1 text-sm text-[#98b0da]">Try adjusting filters or clearing search terms.</p>
              </div>
            ) : (
              <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-1">
                {filteredResidents.map((resident) => (
                  <ResidentListItem
                    key={resident.id}
                    resident={resident}
                    selected={selectedResidentId === resident.id}
                    now={now}
                    onSelect={() => {
                      setSelectedResidentId(resident.id);
                      setProfileTab("overview");
                    }}
                    onEdit={() => {
                      setEditingResident(resident);
                      setAddEditOpen(true);
                    }}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </aside>

          <section className="rounded-2xl border border-[#213a60] bg-[linear-gradient(180deg,#0f1b32_0%,#0b1528_100%)] p-4">
            {!selectedResident ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-[#3a5688] bg-[#0d1a31] p-10 text-center">
                <div className="max-w-md">
                  <p className="text-lg font-semibold text-white">Select a resident to open profile details.</p>
                  <p className="mt-2 text-sm text-[#9db5df]">
                    Profile overview, preferences, participation trends, documentation history, care-plan snapshot, and due timelines appear here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <header className="rounded-2xl border border-[#2d4874] bg-[linear-gradient(180deg,#13294b_0%,#0f2240_100%)] p-4 shadow-[0_24px_40px_-30px_rgba(37,99,235,0.75)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/45 bg-cyan-500/15 text-sm font-black text-cyan-100">
                        {selectedResident.firstName.charAt(0)}
                        {selectedResident.lastName.charAt(0)}
                      </span>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-black text-white">{getResidentName(selectedResident)}</h2>
                          {selectedResident.preferredName ? (
                            <Badge className="border-violet-300/45 bg-violet-500/14 text-violet-100">Prefers {selectedResident.preferredName}</Badge>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#c7daf8]">
                          <Badge className="border-[#45699f] bg-[#16305c] text-[#d5e5ff]">Room {selectedResident.room}</Badge>
                          <Badge className="border-[#45699f] bg-[#16305c] text-[#d5e5ff]">{formatResidentStatusLabel(selectedResident.status)}</Badge>
                          <Badge className="border-[#45699f] bg-[#16305c] text-[#d5e5ff]">Unit: {selectedResident.unitName ?? "Unassigned"}</Badge>
                          <Badge className="border-[#45699f] bg-[#16305c] text-[#d5e5ff]">Admission: {formatDate(selectedResident.admissionDate)}</Badge>
                          <Badge className="border-[#45699f] bg-[#16305c] text-[#d5e5ff]">
                            LOS: {formatLengthOfStay(selectedResident.assessmentSchedule.lengthOfStayDays)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" className="h-8 rounded-full bg-[#1e4a88] px-3 text-xs font-semibold text-white hover:bg-[#255a9f]">
                        <Link href={`/app/documentation/progress-notes/new?residentId=${selectedResident.id}`}>
                          <NotebookPen className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                          Add Progress Note
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]">
                        <Link href={`/app/documentation/one-to-one/new?residentId=${selectedResident.id}`}>Add 1:1 Note</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]">
                        <Link href={`/app/residents/${selectedResident.id}`}>Open Full Profile</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full border-[#4a6fa8] bg-[#17315c] px-3 text-xs text-[#d8e7ff] hover:bg-[#1d3d6f]"
                        onClick={() => {
                          setEditingResident(selectedResident);
                          setAddEditOpen(true);
                        }}
                        disabled={!canEdit}
                      >
                        Edit Resident
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#3e5f92] bg-[#15315d] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a8c2ea]">Participation (30d)</p>
                      <div className="mt-1 flex items-end justify-between gap-2">
                        <p className="text-2xl font-black text-white">{selectedParticipation}%</p>
                        <p className="text-xs text-[#c8daf9]">
                          {selectedResident.attendanceSnapshot.engaged30d}/{selectedResident.attendanceSnapshot.total30d} engaged
                        </p>
                      </div>
                      <GlowProgressBar
                        value={selectedParticipation}
                        tone={selectedParticipation >= 70 ? "emerald" : selectedParticipation >= 40 ? "sky" : "orange"}
                        className="mt-2"
                      />
                      <Badge className={cn("mt-2 text-[10px]", selectedParticipationState.tone)}>{selectedParticipationState.text}</Badge>
                    </div>

                    <div className="rounded-xl border border-[#3e5f92] bg-[#15315d] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a8c2ea]">Documentation Status</p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {selectedResident.assessmentFlags.overdueCount > 0 ? "Attention Needed" : "On Track"}
                      </p>
                      <p className="mt-1 text-xs text-[#c8daf9]">
                        Overdue: {selectedResident.assessmentFlags.overdueCount} • Due soon: {selectedResident.assessmentFlags.dueSoonCount}
                      </p>
                      <p className="mt-2 text-xs text-[#9eb9e4]">Next due: {formatDate(selectedResident.assessmentSchedule.nextDueDateIso)}</p>
                    </div>

                    <div className="rounded-xl border border-[#3e5f92] bg-[#15315d] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a8c2ea]">Admission Timeline</p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {admissionDaysAgo(selectedResident, now) == null ? "Unknown" : `${admissionDaysAgo(selectedResident, now)}d`}
                      </p>
                      <p className="mt-1 text-xs text-[#c8daf9]">Since admission date</p>
                      <p className="mt-2 text-xs text-[#9eb9e4]">Admission UDA due: {formatDate(selectedResident.assessmentSchedule.admission.dueDateIso)}</p>
                    </div>
                  </div>
                </header>

                <div className="mt-4 rounded-2xl border border-[#263f68] bg-[linear-gradient(180deg,#0f1b32_0%,#0a1427_100%)] p-3">
                  <div className="flex flex-wrap gap-2">
                    {PROFILE_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProfileTab(tab.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          profileTab === tab.id
                            ? "border-cyan-300/55 bg-cyan-500/17 text-cyan-100"
                            : "border-[#375888] bg-[#10203b] text-[#cbe0ff] hover:bg-[#163055]"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {profileTab === "overview" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Overview</h3>
                        <p className="mt-2 text-sm text-[#b2c8ec]">
                          {selectedResident.followUpFlag
                            ? "Follow-up has been flagged for this resident."
                            : "No manual follow-up flag is set right now."}
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9eb6df]">Last 1:1</p>
                            <p className="mt-1 text-sm font-semibold text-white">{formatDate(selectedResident.lastOneOnOneAt)}</p>
                          </div>
                          <div className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9eb6df]">1:1 Status</p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {isNeedsOneOnOne(selectedResident.lastOneOnOneAt, now, 30) ? "Due / Missing" : "Current"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9eb6df]">Care Plan Focuses</p>
                            <p className="mt-1 text-sm font-semibold text-white">{selectedResident.carePlanAreas.length}</p>
                          </div>
                          <div className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9eb6df]">Follow-Up Queue</p>
                            <p className="mt-1 text-sm font-semibold text-white">{selectedDueItems.filter((item) => isDueOrOverdue(item.level)).length} active items</p>
                          </div>
                        </div>
                      </article>

                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Immediate Next Actions</h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/progress-notes/new?residentId=${selectedResident.id}`}>Add Progress Note</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/one-to-one/new?residentId=${selectedResident.id}`}>Add 1:1 Note</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation?residentId=${selectedResident.id}`}>Open Documentation</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/residents/${selectedResident.id}/care-plan`}>Open Care Plan</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/attendance?residentId=${selectedResident.id}`}>View Attendance History</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]"
                            onClick={() => {
                              setEditingResident(selectedResident);
                              setAddEditOpen(true);
                            }}
                            disabled={!canEdit}
                          >
                            Edit Resident
                          </Button>
                        </div>
                      </article>
                    </div>
                  ) : null}

                  {profileTab === "preferences" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Interests & Preferences</h3>
                        {splitTextToChips(selectedResident.preferences).length === 0 ? (
                          <p className="mt-3 text-sm text-[#9eb7e0]">No documented preferences yet.</p>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {splitTextToChips(selectedResident.preferences).map((item) => (
                              <Badge key={item} className="border-cyan-300/45 bg-cyan-500/14 text-cyan-100">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9eb7e0]">Best Times / Social Style</p>
                          <p className="mt-1 text-sm text-[#d6e5ff]">
                            {selectedResident.bestTimesOfDay || "No preferred time of day documented yet."}
                          </p>
                        </div>
                      </article>

                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Barriers, Cautions, and Notes</h3>
                        <div className="mt-3 space-y-3">
                          <div className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9eb7e0]">Safety Notes</p>
                            <p className="mt-1 text-sm text-[#d6e5ff]">{selectedResident.safetyNotes || "No safety notes recorded."}</p>
                          </div>
                          <div className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9eb7e0]">Resident Notes</p>
                            <p className="mt-1 text-sm text-[#d6e5ff]">{selectedResident.notes || "No additional resident notes yet."}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedResident.tags.length > 0 ? (
                              selectedResident.tags.map((tag) => (
                                <Badge key={tag} className="border-violet-300/45 bg-violet-500/14 text-violet-100">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-[#9eb7e0]">No preference tags added.</p>
                            )}
                          </div>
                        </div>
                      </article>
                    </div>
                  ) : null}

                  {profileTab === "participation" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Participation Snapshot (Last 30 Days)</h3>
                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-[#a9c1e8]">
                              <span>Engaged</span>
                              <span>{selectedResident.attendanceSnapshot.engaged30d}</span>
                            </div>
                            <GlowProgressBar
                              value={
                                selectedResident.attendanceSnapshot.total30d > 0
                                  ? Math.round(
                                      (selectedResident.attendanceSnapshot.engaged30d /
                                        selectedResident.attendanceSnapshot.total30d) *
                                        100
                                    )
                                  : 0
                              }
                              tone="emerald"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-[#a9c1e8]">
                              <span>Refused</span>
                              <span>{selectedResident.attendanceSnapshot.refused30d}</span>
                            </div>
                            <GlowProgressBar
                              value={
                                selectedResident.attendanceSnapshot.total30d > 0
                                  ? Math.round(
                                      (selectedResident.attendanceSnapshot.refused30d /
                                        selectedResident.attendanceSnapshot.total30d) *
                                        100
                                    )
                                  : 0
                              }
                              tone="orange"
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-[#a9c1e8]">
                              <span>No Show</span>
                              <span>{selectedResident.attendanceSnapshot.noShow30d}</span>
                            </div>
                            <GlowProgressBar
                              value={
                                selectedResident.attendanceSnapshot.total30d > 0
                                  ? Math.round(
                                      (selectedResident.attendanceSnapshot.noShow30d /
                                        selectedResident.attendanceSnapshot.total30d) *
                                        100
                                    )
                                  : 0
                              }
                              tone="sky"
                            />
                          </div>
                        </div>
                      </article>

                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Participation Story</h3>
                        <div className="mt-3 space-y-3 text-sm text-[#c8dcfb]">
                          <p>
                            {selectedResident.attendanceSnapshot.total30d === 0
                              ? "No attendance logs in the last 30 days."
                              : `${selectedResident.attendanceSnapshot.engaged30d} of ${selectedResident.attendanceSnapshot.total30d} recent attendance entries were marked engaged.`}
                          </p>
                          <p>
                            {selectedResident.attendanceSnapshot.refused30d > 0
                              ? `${selectedResident.attendanceSnapshot.refused30d} refusals logged recently. Consider a targeted 1:1 follow-up and alternate offerings.`
                              : "No recent refusal trend detected in the current snapshot."}
                          </p>
                          <p>
                            {isNeedsOneOnOne(selectedResident.lastOneOnOneAt, now, 30)
                              ? "Monthly 1:1 is due based on current note cadence."
                              : "Resident has a recent 1:1 note on file."}
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button asChild variant="outline" className="border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/attendance?residentId=${selectedResident.id}`}>Open Attendance History</Link>
                          </Button>
                          <Button asChild variant="outline" className="border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/one-to-one/new?residentId=${selectedResident.id}`}>Create 1:1 Follow-Up</Link>
                          </Button>
                        </div>
                      </article>
                    </div>
                  ) : null}

                  {profileTab === "documentation" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Recent 1:1 Documentation</h3>
                        {selectedResident.recentNotes.length === 0 ? (
                          <p className="mt-3 text-sm text-[#9eb7e0]">No recent 1:1 notes on file for this resident.</p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {selectedResident.recentNotes.map((note) => (
                              <li key={note.id} className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                                <p className="text-[11px] font-semibold text-[#9eb8e0]">{formatDateTime(note.createdAt)}</p>
                                <p className="mt-1 line-clamp-3 text-sm text-[#d7e6ff]">{note.narrative || "No narrative entered."}</p>
                                <div className="mt-2">
                                  <Button asChild size="sm" variant="outline" className="h-7 border-[#3f6298] bg-[#10213f] px-2.5 text-[11px] text-[#d9e7ff] hover:bg-[#19335a]">
                                    <Link href={`/app/documentation/one-to-one/${note.id}`}>Open Note</Link>
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>

                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Documentation Shortcuts</h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation?residentId=${selectedResident.id}`}>Open Full Documentation History</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/progress-notes/new?residentId=${selectedResident.id}`}>Add Progress Note</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/one-to-one/new?residentId=${selectedResident.id}`}>Add 1:1 Note</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/uda?residentId=${selectedResident.id}`}>Open UDA Queue</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/documentation/mds?residentId=${selectedResident.id}`}>Open MDS Queue</Link>
                          </Button>
                          <Button asChild variant="outline" className="justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/residents/${selectedResident.id}`}>Open Resident Detail Page</Link>
                          </Button>
                        </div>
                      </article>
                    </div>
                  ) : null}

                  {profileTab === "care-plan" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Care Plan Snapshot</h3>
                        {selectedResident.carePlanAreas.length === 0 ? (
                          <p className="mt-3 text-sm text-[#9eb7e0]">No active care plan focus areas documented yet.</p>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedResident.carePlanAreas.map((area) => (
                              <Badge key={area} className="border-blue-300/45 bg-blue-500/14 text-blue-100">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="mt-4 text-sm text-[#c8dbf9]">
                          Next care-plan review: {formatDate(selectedResident.carePlanNextReviewAt)}
                        </p>
                        <div className="mt-4">
                          <Button asChild variant="outline" className="border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                            <Link href={`/app/residents/${selectedResident.id}/care-plan`}>Open Care Plan</Link>
                          </Button>
                        </div>
                      </article>

                      <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                        <h3 className="text-sm font-semibold text-white">Engagement + Plan Alignment</h3>
                        <ul className="mt-3 space-y-2 text-sm text-[#c8dbf9]">
                          <li className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            Participation level: {selectedParticipationState.text.toLowerCase()} over the last 30 days.
                          </li>
                          <li className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            {selectedResident.followUpFlag
                              ? "Manual follow-up flag is active; verify interventions and outreach timing."
                              : "No manual follow-up flag currently set."}
                          </li>
                          <li className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                            Recent 1:1 status: {isNeedsOneOnOne(selectedResident.lastOneOnOneAt, now, 30) ? "due" : "current"}.
                          </li>
                        </ul>
                      </article>
                    </div>
                  ) : null}

                  {profileTab === "due" ? (
                    <article className="rounded-2xl border border-[#2a436f] bg-[#0f1b32] p-4">
                      <h3 className="text-sm font-semibold text-white">Upcoming Due Items</h3>
                      <p className="mt-1 text-sm text-[#a8c0e6]">Admission-date timelines and note cadence are surfaced in one queue.</p>

                      {selectedDueItems.length === 0 ? (
                        <p className="mt-4 text-sm text-[#9eb7e0]">No due items for this resident right now.</p>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {selectedDueItems.map((item) => (
                            <li key={item.id} className="rounded-xl border border-[#35517f] bg-[#11203b] p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-white">{item.label}</p>
                                  <p className="mt-1 text-xs text-[#aac2e9]">
                                    Due: {formatDate(item.dueDateIso)} • {item.statusLabel}
                                  </p>
                                </div>
                                <Badge className={cn("text-[10px]", dueBadgeClass(item.level))}>{item.level.replaceAll("_", " ")}</Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button asChild size="sm" variant="outline" className="h-7 border-[#3f6298] bg-[#10213f] px-2.5 text-[11px] text-[#d9e7ff] hover:bg-[#19335a]">
                                  <Link href={item.actionHref}>{item.actionLabel}</Link>
                                </Button>

                                {item.assessmentKind ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-emerald-300/45 bg-emerald-500/14 px-2.5 text-[11px] text-emerald-100 hover:bg-emerald-500/22"
                                    onClick={() => void markAssessmentComplete(selectedResident.id, item.assessmentKind as AssessmentKind)}
                                    disabled={!canEdit}
                                  >
                                    Mark Complete
                                  </Button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ) : null}
                </div>
              </>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#223a61] bg-[linear-gradient(180deg,#10203a_0%,#0b1528_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ab4de]">Resident Quick Actions</p>
              {selectedResident ? (
                <div className="mt-3 grid gap-2">
                  <Button asChild variant="outline" className="justify-start border-[#375889] bg-[#112341] text-xs text-[#d4e5ff] hover:bg-[#1a3156]">
                    <Link href={`/app/documentation/progress-notes/new?residentId=${selectedResident.id}`}>Add Progress Note</Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-[#375889] bg-[#112341] text-xs text-[#d4e5ff] hover:bg-[#1a3156]">
                    <Link href={`/app/documentation/one-to-one/new?residentId=${selectedResident.id}`}>Add 1:1 Note</Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-[#375889] bg-[#112341] text-xs text-[#d4e5ff] hover:bg-[#1a3156]">
                    <Link href={`/app/residents/${selectedResident.id}/care-plan`}>Open Care Plan</Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-[#375889] bg-[#112341] text-xs text-[#d4e5ff] hover:bg-[#1a3156]">
                    <Link href={`/app/documentation?residentId=${selectedResident.id}`}>Open Documentation</Link>
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#9fb7de]">Select a resident to load contextual actions.</p>
              )}
            </section>

            <section className="rounded-2xl border border-[#233a61] bg-[linear-gradient(180deg,#0f1d33_0%,#0a1426_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#96aed8]">Due Queue</p>
              <div className="mt-3 space-y-2">
                {globalDueQueue.length === 0 ? (
                  <p className="text-sm text-[#9ab2db]">No due or overdue items in the current resident set.</p>
                ) : (
                  globalDueQueue.map((entry) => (
                    <div key={`${entry.residentId}-${entry.id}`} className="rounded-xl border border-[#35517f] bg-[#10213a] p-3">
                      <p className="text-xs font-semibold text-white">
                        {entry.residentName} • Room {entry.room}
                      </p>
                      <p className="mt-1 text-[11px] text-[#a8c0e6]">
                        {entry.label} • {entry.statusLabel}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge className={cn("text-[10px]", dueBadgeClass(entry.level))}>{entry.level.replaceAll("_", " ")}</Badge>
                        <Button asChild size="sm" variant="outline" className="h-7 border-[#3f6298] bg-[#10213f] px-2.5 text-[11px] text-[#d9e7ff] hover:bg-[#19335a]">
                          <Link href={`/app/residents/${entry.residentId}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#233a61] bg-[linear-gradient(180deg,#13253f_0%,#0d182b_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9ab4de]">New Admissions</p>
              <div className="mt-3 space-y-2">
                {recentAdmissions.length === 0 ? (
                  <p className="text-sm text-[#9ab2db]">No recent admissions in the current range.</p>
                ) : (
                  recentAdmissions.map((resident) => (
                    <Link
                      key={resident.id}
                      href={`/app/residents/${resident.id}`}
                      className="block rounded-xl border border-[#35517f] bg-[#10213a] p-3 transition hover:border-[#4b71aa]"
                    >
                      <p className="text-xs font-semibold text-white">
                        {getResidentName(resident)} • Room {resident.room}
                      </p>
                      <p className="mt-1 text-[11px] text-[#a8c0e6]">Admitted {formatDate(resident.admissionDate)}</p>
                      <p className="mt-1 text-[11px] text-[#9fb8de]">
                        Admission UDA: {formatDate(resident.assessmentSchedule.admission.dueDateIso)}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#253e64] bg-[linear-gradient(180deg,#10213b_0%,#0b162a_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9db5e0]">Workflow Shortcuts</p>
              <div className="mt-3 grid gap-2">
                {[
                  {
                    label: "Open Documentation Hub",
                    href: "/app/documentation",
                    icon: FileText
                  },
                  {
                    label: "Open Attendance Tracker",
                    href: "/app/attendance",
                    icon: CalendarDays
                  },
                  {
                    label: "Open Calendar",
                    href: "/app/calendar",
                    icon: CalendarClock
                  },
                  {
                    label: "Residents Due This Week",
                    href: "/app/residents?filter=DUE_SOON",
                    icon: AlertTriangle
                  },
                  {
                    label: "Residents Needing Follow-Up",
                    href: "/app/residents?filter=OVERDUE",
                    icon: ShieldAlert
                  },
                  {
                    label: "Export Current Resident View",
                    href: "#",
                    icon: Download,
                    onClick: exportVisibleResidents
                  }
                ].map((shortcut) => {
                  const Icon = shortcut.icon;

                  if (shortcut.onClick) {
                    return (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={shortcut.onClick}
                        className="flex items-center gap-2 rounded-xl border border-[#375888] bg-[#112341] px-3 py-2 text-left text-xs font-semibold text-[#d4e5ff] transition hover:-translate-y-px hover:bg-[#1a3156]"
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {shortcut.label}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={shortcut.label}
                      href={shortcut.href}
                      className="flex items-center gap-2 rounded-xl border border-[#375888] bg-[#112341] px-3 py-2 text-xs font-semibold text-[#d4e5ff] transition hover:-translate-y-px hover:bg-[#1a3156]"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {shortcut.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <ResidentFormModal
        open={addEditOpen}
        onOpenChange={(open) => {
          setAddEditOpen(open);
          if (!open) {
            setEditingResident(null);
          }
        }}
        initialResident={editingResident}
        units={initialUnits}
        onSave={upsertResident}
        canEdit={canEdit}
      />

      <ImportResidentsModal open={importOpen} onOpenChange={setImportOpen} onImport={importResidents} />
    </div>
  );
}
