"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  CalendarClock,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  Filter,
  Plus,
  Search,
  Upload,
  UserPlus,
  UserRound
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
import { dueLevelTone, type AssessmentDueLevel } from "@/lib/residents/assessment-due";
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
type AssessmentKind = "QUARTERLY_UDA" | "ANNUAL_UDA" | "MDS";

const DUE_SOON_LEVELS: AssessmentDueLevel[] = ["DUE_TODAY", "DUE_SOON_7", "DUE_SOON_14", "DUE_SOON_30"];

function parseIsoDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateLabel(value: string | null) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "Not set";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatMetricDate(value: string | null) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
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

function duePillClass(level: AssessmentDueLevel) {
  if (level === "OVERDUE") {
    return "border-rose-400/40 bg-rose-500/16 text-rose-100";
  }
  if (level === "DUE_TODAY" || level === "DUE_SOON_7" || level === "DUE_SOON_14" || level === "DUE_SOON_30") {
    return "border-amber-300/45 bg-amber-500/16 text-amber-100";
  }
  if (level === "ON_TRACK") {
    return "border-emerald-300/45 bg-emerald-500/16 text-emerald-100";
  }
  if (level === "INACTIVE") {
    return "border-zinc-500/50 bg-zinc-500/20 text-zinc-200";
  }
  return "border-slate-500/45 bg-slate-600/20 text-slate-200";
}

function dueToneIconClass(level: AssessmentDueLevel) {
  const tone = dueLevelTone(level);
  if (tone === "danger") return "text-rose-300";
  if (tone === "warning") return "text-amber-300";
  if (tone === "success") return "text-emerald-300";
  return "text-zinc-300";
}

function nextDueDateMillis(resident: ResidentListRow) {
  const date = parseIsoDate(resident.assessmentSchedule.nextDueDateIso);
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function maxOverdueDays(resident: ResidentListRow) {
  return Math.max(
    resident.assessmentSchedule.quarterly.daysOverdue ?? 0,
    resident.assessmentSchedule.annual.daysOverdue ?? 0,
    resident.assessmentSchedule.mds.daysOverdue ?? 0
  );
}

function participationPercent(resident: ResidentListRow) {
  return resident.attendanceSnapshot.participationPercent30d ?? 0;
}

function matchesResidentFilter(resident: ResidentListRow, filter: ResidentFilterKey) {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") {
    return resident.status === "ACTIVE" || resident.status === "BED_BOUND";
  }
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

function matchesParticipation(resident: ResidentListRow, filter: ParticipationBand) {
  if (filter === "all") return true;
  const percent = resident.attendanceSnapshot.participationPercent30d ?? 0;
  if (filter === "high") return percent >= 70;
  if (filter === "moderate") return percent >= 40 && percent < 70;
  return percent < 40;
}

function sortResidents(rows: ResidentListRow[], sortBy: ResidentSortKey) {
  const cloned = [...rows];

  if (sortBy === "NAME") {
    return cloned.sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
      if (last !== 0) return last;
      return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
    });
  }

  if (sortBy === "ADMISSION_NEWEST") {
    return cloned.sort((a, b) => {
      const aDate = parseIsoDate(a.admissionDate)?.getTime() ?? 0;
      const bDate = parseIsoDate(b.admissionDate)?.getTime() ?? 0;
      return bDate - aDate;
    });
  }

  if (sortBy === "ADMISSION_OLDEST") {
    return cloned.sort((a, b) => {
      const aDate = parseIsoDate(a.admissionDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDate = parseIsoDate(b.admissionDate)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });
  }

  if (sortBy === "NEXT_DUE") {
    return cloned.sort((a, b) => nextDueDateMillis(a) - nextDueDateMillis(b));
  }

  if (sortBy === "MOST_OVERDUE") {
    return cloned.sort((a, b) => maxOverdueDays(b) - maxOverdueDays(a));
  }

  if (sortBy === "PARTICIPATION_HIGH") {
    return cloned.sort((a, b) => participationPercent(b) - participationPercent(a));
  }

  if (sortBy === "PARTICIPATION_LOW") {
    return cloned.sort((a, b) => participationPercent(a) - participationPercent(b));
  }

  if (sortBy === "NEEDS_1TO1") {
    return cloned.sort((a, b) => {
      const aScore = a.lastOneOnOneAt ? new Date(a.lastOneOnOneAt).getTime() : 0;
      const bScore = b.lastOneOnOneAt ? new Date(b.lastOneOnOneAt).getTime() : 0;
      return aScore - bScore;
    });
  }

  if (sortBy === "RECENTLY_SEEN") {
    return cloned.sort((a, b) => {
      const aScore = a.lastOneOnOneAt ? new Date(a.lastOneOnOneAt).getTime() : -1;
      const bScore = b.lastOneOnOneAt ? new Date(b.lastOneOnOneAt).getTime() : -1;
      return bScore - aScore;
    });
  }

  return cloned.sort(compareResidentsByRoom);
}

function getResidentDisplayName(resident: ResidentListRow) {
  return `${resident.firstName} ${resident.lastName}`;
}

function toCsvField(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  if (!text.includes(",") && !text.includes("\"") && !text.includes("\n")) {
    return text;
  }
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function ResidentDirectoryRow({
  resident,
  canEdit,
  onOpenEdit,
  onMarkAssessment
}: {
  resident: ResidentListRow;
  canEdit: boolean;
  onOpenEdit: (resident: ResidentListRow) => void;
  onMarkAssessment: (residentId: string, kind: AssessmentKind) => Promise<void>;
}) {
  const participation = resident.attendanceSnapshot.participationPercent30d ?? 0;
  const needsOneToOne = isNeedsOneOnOne(resident.lastOneOnOneAt, new Date(), 30);

  return (
    <article className="rounded-2xl border border-[#24395f] bg-[linear-gradient(180deg,#0f1b33_0%,#0b1427_100%)] p-3 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.7)] transition hover:border-[#325284] hover:bg-[linear-gradient(180deg,#11203b_0%,#0d1830_100%)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-500/18 text-sm font-bold text-cyan-100">
              {resident.firstName[0]}
              {resident.lastName[0]}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{getResidentDisplayName(resident)}</p>
                {resident.preferredName ? (
                  <Badge className="border-violet-400/30 bg-violet-500/16 text-[10px] text-violet-100">“{resident.preferredName}”</Badge>
                ) : null}
                <Badge className="border-[#3a5786] bg-[#11203c] text-[10px] text-[#c4d7f8]">Room {resident.room}</Badge>
                <Badge className="border-[#3a5786] bg-[#11203c] text-[10px] text-[#c4d7f8]">{toResidentStatusLabel(resident.status)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#9eb4da]">
                <span>Admission: {formatDateLabel(resident.admissionDate)}</span>
                <span className="text-[#607cad]">•</span>
                <span>Length of Stay: {formatLengthOfStay(resident.assessmentSchedule.lengthOfStayDays)}</span>
                <span className="text-[#607cad]">•</span>
                <span>Unit: {resident.unitName ?? "Unassigned"}</span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-[#304972] bg-[#0d1830] px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8fa7d3]">Quarterly UDA</p>
                  <p className="mt-1 text-[11px] text-[#d6e4ff]">{formatMetricDate(resident.assessmentSchedule.quarterly.dueDateIso)}</p>
                  <Badge className={cn("mt-1 border text-[10px]", duePillClass(resident.assessmentSchedule.quarterly.level))}>
                    {resident.assessmentSchedule.quarterly.label}
                  </Badge>
                </div>
                <div className="rounded-xl border border-[#304972] bg-[#0d1830] px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8fa7d3]">Annual UDA</p>
                  <p className="mt-1 text-[11px] text-[#d6e4ff]">{formatMetricDate(resident.assessmentSchedule.annual.dueDateIso)}</p>
                  <Badge className={cn("mt-1 border text-[10px]", duePillClass(resident.assessmentSchedule.annual.level))}>
                    {resident.assessmentSchedule.annual.label}
                  </Badge>
                </div>
                <div className="rounded-xl border border-[#304972] bg-[#0d1830] px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8fa7d3]">MDS</p>
                  <p className="mt-1 text-[11px] text-[#d6e4ff]">{formatMetricDate(resident.assessmentSchedule.mds.dueDateIso)}</p>
                  <Badge className={cn("mt-1 border text-[10px]", duePillClass(resident.assessmentSchedule.mds.level))}>
                    {resident.assessmentSchedule.mds.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-[#2d456f] bg-[#0d182d] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Participation Snapshot</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-2xl font-black text-white">{participation}%</p>
            <p className="text-[11px] text-[#9fb5da]">
              {resident.attendanceSnapshot.engaged30d}/{resident.attendanceSnapshot.total30d || 0} engaged (30d)
            </p>
          </div>
          <GlowProgressBar value={participation} tone={participation >= 70 ? "emerald" : participation >= 40 ? "sky" : "orange"} className="mt-2" />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {resident.followUpFlag ? <Badge className="border-amber-300/40 bg-amber-500/16 text-[10px] text-amber-100">Follow-up flagged</Badge> : null}
            {resident.assessmentFlags.overdueCount > 0 ? (
              <Badge className="border-rose-300/40 bg-rose-500/16 text-[10px] text-rose-100">Overdue {resident.assessmentFlags.overdueCount}</Badge>
            ) : null}
            {resident.assessmentFlags.dueSoonCount > 0 ? (
              <Badge className="border-blue-300/40 bg-blue-500/16 text-[10px] text-blue-100">Due soon {resident.assessmentFlags.dueSoonCount}</Badge>
            ) : null}
            {needsOneToOne ? <Badge className="border-violet-300/40 bg-violet-500/16 text-[10px] text-violet-100">1:1 Needed</Badge> : null}
          </div>
        </div>

        <div className="flex min-w-[220px] flex-col justify-between gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="outline" className="h-8 justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
              <Link href={`/app/residents/${resident.id}`}>Open Profile</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
              <Link href={`/app/documentation/progress-notes/new?residentId=${resident.id}`}>Progress Note</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
              <Link href={`/app/documentation/one-to-one/new?residentId=${resident.id}`}>1:1 Note</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 justify-start border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
              <Link href={`/app/documentation?residentId=${resident.id}`}>Documentation</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-[#314d79] bg-[#0e1b35] p-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Mark Assessment Complete</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-full border border-amber-300/45 bg-amber-500/16 px-2.5 py-1 text-[10px] font-semibold text-amber-100 transition hover:-translate-y-px"
                onClick={() => void onMarkAssessment(resident.id, "QUARTERLY_UDA")}
                disabled={!canEdit}
              >
                Quarterly
              </button>
              <button
                type="button"
                className="rounded-full border border-blue-300/45 bg-blue-500/16 px-2.5 py-1 text-[10px] font-semibold text-blue-100 transition hover:-translate-y-px"
                onClick={() => void onMarkAssessment(resident.id, "ANNUAL_UDA")}
                disabled={!canEdit}
              >
                Annual
              </button>
              <button
                type="button"
                className="rounded-full border border-emerald-300/45 bg-emerald-500/16 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 transition hover:-translate-y-px"
                onClick={() => void onMarkAssessment(resident.id, "MDS")}
                disabled={!canEdit}
              >
                MDS
              </button>
              <button
                type="button"
                className="rounded-full border border-[#3f6298] bg-[#10223f] px-2.5 py-1 text-[10px] font-semibold text-[#cde0ff] transition hover:-translate-y-px"
                onClick={() => onOpenEdit(resident)}
                disabled={!canEdit}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
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
  const [residents, setResidents] = useState(initialResidents);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ResidentFilterKey>("ACTIVE");
  const [sortBy, setSortBy] = useState<ResidentSortKey>("ROOM");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [admissionMonthFilter, setAdmissionMonthFilter] = useState<string>("all");
  const [participationFilter, setParticipationFilter] = useState<ParticipationBand>("all");
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<ResidentListRow | null>(null);
  const [isMarking, startMarkingTransition] = useTransition();
  const [quickFilterOpen, setQuickFilterOpen] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const scrollParentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editResidentId = params.get("edit");
    if (!editResidentId) return;
    const match = residents.find((resident) => resident.id === editResidentId);
    if (!match) return;
    setEditingResident(match);
    setAddEditOpen(true);
    params.delete("edit");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [residents]);

  const activeResidents = useMemo(
    () => residents.filter((resident) => resident.status !== "DISCHARGED" && resident.status !== "DECEASED"),
    [residents]
  );

  const monthOptions = useMemo(() => {
    const monthSet = new Set<string>();

    residents.forEach((resident) => {
      const date = parseIsoDate(resident.admissionDate);
      if (!date) return;
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthSet.add(month);
    });

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [residents]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (filter !== "ACTIVE") count += 1;
    if (unitFilter !== "all") count += 1;
    if (admissionMonthFilter !== "all") count += 1;
    if (participationFilter !== "all") count += 1;
    if (sortBy !== "ROOM") count += 1;
    return count;
  }, [admissionMonthFilter, filter, participationFilter, search, sortBy, unitFilter]);

  function clearFilters() {
    setSearch("");
    setFilter("ACTIVE");
    setUnitFilter("all");
    setAdmissionMonthFilter("all");
    setParticipationFilter("all");
    setSortBy("ROOM");
  }

  function toggleQuickFilter(value: ResidentFilterKey) {
    setFilter((current) => {
      if (current === value) return "ACTIVE";
      return value;
    });
  }

  const visibleResidents = useMemo(() => {
    const token = deferredSearch.trim().toLowerCase();

    const filtered = residents.filter((resident) => {
      if (!matchesResidentFilter(resident, filter)) return false;
      if (unitFilter !== "all" && resident.unitId !== unitFilter) return false;
      if (admissionMonthFilter !== "all") {
        const admission = parseIsoDate(resident.admissionDate);
        const month = admission ? `${admission.getFullYear()}-${String(admission.getMonth() + 1).padStart(2, "0")}` : null;
        if (!month || month !== admissionMonthFilter) return false;
      }
      if (!matchesParticipation(resident, participationFilter)) return false;

      if (!token) return true;
      const name = `${resident.firstName} ${resident.lastName}`.toLowerCase();
      const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
      const preferredName = (resident.preferredName ?? "").toLowerCase();
      const status = toResidentStatusLabel(resident.status).toLowerCase();
      const unit = (resident.unitName ?? "").toLowerCase();
      const admission = formatDateLabel(resident.admissionDate).toLowerCase();

      return (
        name.includes(token) ||
        reverseName.includes(token) ||
        preferredName.includes(token) ||
        status.includes(token) ||
        unit.includes(token) ||
        admission.includes(token) ||
        resident.room.toLowerCase().includes(token)
      );
    });

    return sortResidents(filtered, sortBy);
  }, [admissionMonthFilter, deferredSearch, filter, participationFilter, residents, sortBy, unitFilter]);

  const rowVirtualizer = useVirtualizer({
    count: visibleResidents.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 210,
    overscan: 10
  });

  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalResidents = residents.length;
    const activeCensus = residents.filter((resident) => resident.status === "ACTIVE" || resident.status === "BED_BOUND").length;
    const archivedCount = residents.filter(
      (resident) => resident.status === "DISCHARGED" || resident.status === "DECEASED" || resident.status === "TRANSFERRED"
    ).length;
    const newAdmissionsThisMonth = residents.filter((resident) => {
      const admission = parseIsoDate(resident.admissionDate);
      return admission ? admission >= monthStart : false;
    }).length;

    const assessmentsDueThisWeek = activeResidents.filter((resident) => {
      const due = parseIsoDate(resident.assessmentSchedule.nextDueDateIso);
      if (!due) return false;
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;

    const overdueAssessments = activeResidents.filter((resident) => resident.assessmentFlags.overdueCount > 0).length;
    const documentationCurrent = activeResidents.filter((resident) => resident.assessmentFlags.overdueCount === 0).length;

    const due7 = activeResidents.filter((resident) => {
      const statuses = [resident.assessmentSchedule.quarterly, resident.assessmentSchedule.annual, resident.assessmentSchedule.mds];
      return statuses.some((status) => status.daysUntil != null && status.daysUntil >= 0 && status.daysUntil <= 7);
    }).length;

    const due14 = activeResidents.filter((resident) => {
      const statuses = [resident.assessmentSchedule.quarterly, resident.assessmentSchedule.annual, resident.assessmentSchedule.mds];
      return statuses.some((status) => status.daysUntil != null && status.daysUntil >= 0 && status.daysUntil <= 14);
    }).length;

    const due30 = activeResidents.filter((resident) => {
      const statuses = [resident.assessmentSchedule.quarterly, resident.assessmentSchedule.annual, resident.assessmentSchedule.mds];
      return statuses.some((status) => status.daysUntil != null && status.daysUntil >= 0 && status.daysUntil <= 30);
    }).length;

    const assessmentHealth = {
      quarterly:
        activeResidents.length === 0
          ? 100
          : Math.round(
              (activeResidents.filter((resident) => resident.assessmentSchedule.quarterly.level !== "OVERDUE").length /
                activeResidents.length) *
                100
            ),
      annual:
        activeResidents.length === 0
          ? 100
          : Math.round(
              (activeResidents.filter((resident) => resident.assessmentSchedule.annual.level !== "OVERDUE").length /
                activeResidents.length) *
                100
            ),
      mds:
        activeResidents.length === 0
          ? 100
          : Math.round(
              (activeResidents.filter((resident) => resident.assessmentSchedule.mds.level !== "OVERDUE").length /
                activeResidents.length) *
                100
            )
    };

    return {
      totalResidents,
      activeCensus,
      newAdmissionsThisMonth,
      assessmentsDueThisWeek,
      overdueAssessments,
      archivedCount,
      documentationCurrent,
      documentationCurrentPercent:
        activeResidents.length === 0 ? 100 : Math.round((documentationCurrent / activeResidents.length) * 100),
      due7,
      due14,
      due30,
      assessmentHealth
    };
  }, [activeResidents, residents]);

  const upcomingEntries = useMemo(() => {
    const rows: Array<{
      residentId: string;
      residentName: string;
      room: string;
      type: string;
      dueDateIso: string;
      daysUntil: number;
      level: AssessmentDueLevel;
    }> = [];

    for (const resident of residents) {
      const pairs = [
        { type: "Quarterly UDA", status: resident.assessmentSchedule.quarterly },
        { type: "Annual UDA", status: resident.assessmentSchedule.annual },
        { type: "MDS", status: resident.assessmentSchedule.mds }
      ];

      for (const pair of pairs) {
        if (!pair.status.dueDateIso || pair.status.daysUntil == null) continue;
        if (pair.status.daysUntil < 0 || pair.status.daysUntil > 30) continue;
        rows.push({
          residentId: resident.id,
          residentName: getResidentDisplayName(resident),
          room: resident.room,
          type: pair.type,
          dueDateIso: pair.status.dueDateIso,
          daysUntil: pair.status.daysUntil,
          level: pair.status.level
        });
      }
    }

    return rows.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 28);
  }, [residents]);

  const overdueEntries = useMemo(() => {
    const rows: Array<{
      residentId: string;
      residentName: string;
      room: string;
      type: string;
      dueDateIso: string;
      daysOverdue: number;
    }> = [];

    for (const resident of residents) {
      const pairs = [
        { type: "Quarterly UDA", status: resident.assessmentSchedule.quarterly },
        { type: "Annual UDA", status: resident.assessmentSchedule.annual },
        { type: "MDS", status: resident.assessmentSchedule.mds }
      ];

      for (const pair of pairs) {
        if (!pair.status.dueDateIso || pair.status.daysOverdue == null || pair.status.daysOverdue <= 0) continue;
        rows.push({
          residentId: resident.id,
          residentName: getResidentDisplayName(resident),
          room: resident.room,
          type: pair.type,
          dueDateIso: pair.status.dueDateIso,
          daysOverdue: pair.status.daysOverdue
        });
      }
    }

    return rows.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 18);
  }, [residents]);

  const recentAdmissions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);

    return residents
      .filter((resident) => {
        const admission = parseIsoDate(resident.admissionDate);
        return admission ? admission >= cutoff : false;
      })
      .sort((a, b) => {
        const aDate = parseIsoDate(a.admissionDate)?.getTime() ?? 0;
        const bDate = parseIsoDate(b.admissionDate)?.getTime() ?? 0;
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [residents]);

  async function refreshResidents() {
    const response = await fetch("/api/residents?includeAll=true", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not refresh residents.");
    setResidents(body.residents as ResidentListRow[]);
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
    if (!response.ok) throw new Error(body?.error ?? "Could not save resident.");

    const nextResident = body?.resident as ResidentListRow | undefined;
    if (nextResident?.id) {
      setResidents((previous) => {
        const without = previous.filter((resident) => resident.id !== nextResident.id);
        return [...without, nextResident];
      });
      return;
    }

    await refreshResidents();
  }

  async function importResidents(rows: Array<{ firstName: string; lastName: string; room: string; status: string; notes?: string }>) {
    const response = await fetch("/api/residents/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not import residents.");
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
          description: `${kind === "MDS" ? "MDS" : kind === "ANNUAL_UDA" ? "Annual UDA" : "Quarterly UDA"} marked complete.`
        });
      } catch (error) {
        toast({
          title: "Could not update assessment",
          description: error instanceof Error ? error.message : "Try again.",
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
      "Admission Date",
      "Quarterly Due",
      "Annual Due",
      "MDS Due",
      "Participation % (30d)",
      "Overdue Count"
    ];

    const lines = [headers.join(",")];

    visibleResidents.forEach((resident) => {
      lines.push(
        [
          resident.firstName,
          resident.lastName,
          resident.preferredName,
          resident.room,
          formatResidentStatusLabel(resident.status),
          formatDateLabel(resident.admissionDate),
          formatDateLabel(resident.assessmentSchedule.quarterly.dueDateIso),
          formatDateLabel(resident.assessmentSchedule.annual.dueDateIso),
          formatDateLabel(resident.assessmentSchedule.mds.dueDateIso),
          resident.attendanceSnapshot.participationPercent30d ?? 0,
          resident.assessmentFlags.overdueCount
        ]
          .map((value) => toCsvField(value))
          .join(",")
      );
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    link.download = `actify-residents-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function openAddResident() {
    setEditingResident(null);
    setAddEditOpen(true);
  }

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.18),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.24),transparent_62%),radial-gradient(800px_380px_at_45%_100%,rgba(59,130,246,0.14),transparent_72%)]" />

      <div className="relative z-10 space-y-4">
        <TopContentHeader
          eyebrow="Resident Command Center"
          title="Residents"
          subtitle="Manage resident profiles, participation, documentation, and assessment due dates from one workspace."
          icon={UserRound}
          accentGradientClasses="from-cyan-300 via-blue-400 to-indigo-500"
          actions={
            <>
              <Button
                type="button"
                onClick={openAddResident}
                disabled={!canEdit}
                className="h-10 rounded-full border border-cyan-300/50 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30"
              >
                <UserPlus className="h-4 w-4" />
                Add Resident
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]"
                onClick={() => setImportOpen(true)}
                disabled={!canEdit}
              >
                <Upload className="h-4 w-4" />
                Import Residents
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]"
                onClick={exportVisibleResidents}
              >
                <Download className="h-4 w-4" />
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
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Resident
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/residents/archive">Archived Residents</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/documentation/uda">Quarterly UDA Queue</Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/documentation/mds">MDS Queue</Link>
            </Button>
          </div>
        </TopContentHeader>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Total Residents", value: summary.totalResidents, icon: UserRound, tone: "text-cyan-100" },
            { label: "Active Census", value: summary.activeCensus, icon: CircleAlert, tone: "text-emerald-100" },
            { label: "New Admissions", value: summary.newAdmissionsThisMonth, icon: UserPlus, tone: "text-blue-100" },
            { label: "Due This Week", value: summary.assessmentsDueThisWeek, icon: Clock3, tone: "text-amber-100" },
            { label: "Overdue", value: summary.overdueAssessments, icon: AlertTriangle, tone: "text-rose-100" },
            { label: "Archived", value: summary.archivedCount, icon: FileText, tone: "text-zinc-200" }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className="rounded-2xl border border-[#24395f] bg-[linear-gradient(180deg,#0f1b33_0%,#0b1427_100%)] p-3 shadow-[0_14px_30px_-24px_rgba(37,99,235,0.7)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92a9d4]">{item.label}</p>
                  <Icon className={cn("h-4 w-4", item.tone)} />
                </div>
                <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[#213457] bg-[linear-gradient(180deg,#0f1a2f_0%,#0b1426_100%)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Resident Search & Filters</p>
              <p className="text-sm text-[#c7d9f8]">Search by resident, room, status, unit, admission month, and participation.</p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 ? (
                <Badge className="border-cyan-300/40 bg-cyan-500/16 text-cyan-100">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</Badge>
              ) : (
                <Badge className="border-[#3a5688] bg-[#11203a] text-[#c6d9fa]">Default view</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-9 border-[#395b90] bg-[#122342] text-xs text-[#d4e5ff] hover:bg-[#193055]"
                onClick={() => setQuickFilterOpen((current) => !current)}
              >
                <Filter className="mr-1 h-3.5 w-3.5" />
                Quick Filters
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 border-[#395b90] bg-[#122342] text-xs text-[#d4e5ff] hover:bg-[#193055]"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                Reset
              </Button>
            </div>
          </div>

          {quickFilterOpen ? (
            <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-[#2c4674] bg-[#0d1a31] p-2.5">
              {[
                { value: "ACTIVE", label: "Active" },
                { value: "OVERDUE", label: "Overdue" },
                { value: "DUE_SOON", label: "Due Soon" },
                { value: "QUARTERLY_DUE", label: "Quarterly Due" },
                { value: "ANNUAL_DUE", label: "Annual Due" },
                { value: "MDS_DUE", label: "MDS Due" },
                { value: "DISCHARGED", label: "Discharged" }
              ].map((quick) => (
                <button
                  key={quick.value}
                  type="button"
                  onClick={() => toggleQuickFilter(quick.value as ResidentFilterKey)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    filter === quick.value
                      ? "border-cyan-300/55 bg-cyan-500/18 text-cyan-100"
                      : "border-[#375888] bg-[#10203b] text-[#cce0ff] hover:bg-[#163055]"
                  )}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-12">
            <label className="group relative flex h-11 items-center rounded-xl border border-[#2f456e] bg-[#0f1a30] px-3 transition focus-within:border-[#4c6ea7] focus-within:bg-[#13203a] lg:col-span-4">
              <Search className="h-4 w-4 shrink-0 text-[#9bb3db]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search residents by name, room, status, or admission date"
                className="h-full flex-1 border-none bg-transparent px-2 text-sm text-[#dce8ff] placeholder:text-[#9fb4da] focus-visible:ring-0"
              />
              <span className="ml-2 hidden rounded-md border border-[#35537f] bg-[#10213f] px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#c5d6f4] lg:inline-flex">
                LIVE
              </span>
            </label>

            <div className="lg:col-span-2">
              <Select value={filter} onValueChange={(value) => setFilter(value as ResidentFilterKey)}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <Filter className="mr-1 h-4 w-4 text-[#9ab1da]" />
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
                  <CalendarClock className="mr-1 h-4 w-4 text-[#9ab1da]" />
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
                  <ArrowDownWideNarrow className="mr-1 h-4 w-4 text-[#9ab1da]" />
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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#223a5f] bg-[linear-gradient(180deg,#10203c_0%,#0b1528_100%)] p-4 shadow-[0_18px_38px_-28px_rgba(56,189,248,0.7)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#95aed9]">Residents Overview</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{summary.activeCensus} Active Residents</h2>
                  <p className="mt-1 text-sm text-[#acc1e4]">{summary.newAdmissionsThisMonth} admitted this month • {summary.documentationCurrentPercent}% documentation current</p>
                </div>
                <Badge className="border-emerald-300/40 bg-emerald-500/16 text-emerald-100">
                  {summary.documentationCurrent}/{activeResidents.length || 0} up to date
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[#34527f] bg-[#11203a] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#95aed9]">Due windows</p>
                  <p className="mt-1 text-sm text-[#d8e6ff]">7d: {summary.due7} • 14d: {summary.due14} • 30d: {summary.due30}</p>
                </div>
                <div className="rounded-xl border border-[#34527f] bg-[#11203a] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#95aed9]">Overdue Residents</p>
                  <p className="mt-1 text-2xl font-black text-rose-100">{summary.overdueAssessments}</p>
                </div>
                <div className="rounded-xl border border-[#34527f] bg-[#11203a] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#95aed9]">New Admissions</p>
                  <p className="mt-1 text-2xl font-black text-blue-100">{summary.newAdmissionsThisMonth}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-[#9db5df]">
                    <span>Quarterly UDA Health</span>
                    <span>{summary.assessmentHealth.quarterly}%</span>
                  </div>
                  <GlowProgressBar value={summary.assessmentHealth.quarterly} tone="orange" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-[#9db5df]">
                    <span>Annual UDA Health</span>
                    <span>{summary.assessmentHealth.annual}%</span>
                  </div>
                  <GlowProgressBar value={summary.assessmentHealth.annual} tone="sky" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-[#9db5df]">
                    <span>MDS Tracking Health</span>
                    <span>{summary.assessmentHealth.mds}%</span>
                  </div>
                  <GlowProgressBar value={summary.assessmentHealth.mds} tone="emerald" />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#213457] bg-[linear-gradient(180deg,#0e192f_0%,#0a1324_100%)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Resident Directory</p>
                  <p className="text-sm text-[#c6d8f8]">{visibleResidents.length} resident{visibleResidents.length === 1 ? "" : "s"} in view</p>
                </div>
                {isMarking ? <Badge className="border-blue-300/40 bg-blue-500/16 text-blue-100">Updating…</Badge> : null}
              </div>

              {visibleResidents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#3a5688] bg-[#0d1a31] p-10 text-center">
                  <p className="text-base font-semibold text-white">No residents match these filters.</p>
                  <p className="mt-1 text-sm text-[#97afd8]">Try adjusting status, due-date filters, or search terms.</p>
                </div>
              ) : (
                <div ref={scrollParentRef} className="max-h-[74vh] overflow-y-auto pr-1">
                  <div
                    className="relative"
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const resident = visibleResidents[virtualRow.index];
                      if (!resident) return null;
                      return (
                        <div
                          key={resident.id}
                          className="absolute left-0 top-0 w-full pb-3"
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <ResidentDirectoryRow
                            resident={resident}
                            canEdit={canEdit}
                            onOpenEdit={(row) => {
                              setEditingResident(row);
                              setAddEditOpen(true);
                            }}
                            onMarkAssessment={markAssessmentComplete}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#233a61] bg-[linear-gradient(180deg,#0f1c33_0%,#0a1426_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#96aed8]">Upcoming Due</p>
              <div className="mt-3 space-y-3">
                {upcomingEntries.length === 0 ? (
                  <p className="text-sm text-[#9ab2db]">No due dates in the next 30 days.</p>
                ) : (
                  [
                    { label: "Due in 7 days", minDays: 0, maxDays: 7 },
                    { label: "Due in 14 days", minDays: 8, maxDays: 14 },
                    { label: "Due in 30 days", minDays: 15, maxDays: 30 }
                  ].map((bucket) => {
                    const bucketItems = upcomingEntries
                      .filter((entry) => entry.daysUntil >= bucket.minDays && entry.daysUntil <= bucket.maxDays)
                      .slice(0, 6);
                    if (bucketItems.length === 0) return null;
                    return (
                      <div key={bucket.label} className="rounded-xl border border-[#2e4672] bg-[#0e1930] p-3">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8ea7d3]">{bucket.label}</p>
                        <ul className="space-y-2">
                          {bucketItems.map((entry) => (
                            <li key={`${entry.residentId}-${entry.type}`}>
                              <Link href={`/app/residents/${entry.residentId}`} className="block rounded-lg border border-[#334e7b] bg-[#10203a] p-2 transition hover:border-[#4b71aa]">
                                <p className="text-xs font-semibold text-white">{entry.residentName} • Room {entry.room}</p>
                                <p className="mt-1 text-[11px] text-[#a4bbe1]">{entry.type} • {formatDateLabel(entry.dueDateIso)}</p>
                                <p className={cn("mt-1 text-[10px] font-semibold", dueToneIconClass(entry.level))}>
                                  Due in {entry.daysUntil} day{entry.daysUntil === 1 ? "" : "s"}
                                </p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#25345a] bg-[linear-gradient(180deg,#171321_0%,#100d18_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d8abbd]">Overdue</p>
              <div className="mt-3 space-y-2">
                {overdueEntries.length === 0 ? (
                  <p className="text-sm text-[#c89ab0]">No overdue assessments.</p>
                ) : (
                  overdueEntries.map((entry) => (
                    <Link
                      key={`${entry.residentId}-${entry.type}`}
                      href={`/app/residents/${entry.residentId}`}
                      className="block rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 transition hover:border-rose-400/50"
                    >
                      <p className="text-xs font-semibold text-rose-100">{entry.residentName} • Room {entry.room}</p>
                      <p className="mt-1 text-[11px] text-rose-200">{entry.type} • due {formatDateLabel(entry.dueDateIso)}</p>
                      <p className="mt-1 text-[10px] font-semibold text-rose-100">Overdue by {entry.daysOverdue} day{entry.daysOverdue === 1 ? "" : "s"}</p>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#253a60] bg-[linear-gradient(180deg,#12253f_0%,#0c172c_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98b2dd]">New Admissions</p>
              <div className="mt-3 space-y-2">
                {recentAdmissions.length === 0 ? (
                  <p className="text-sm text-[#9cb4de]">No recent admissions yet.</p>
                ) : (
                  recentAdmissions.map((resident) => {
                    const admission = parseIsoDate(resident.admissionDate);
                    const daysSince = admission
                      ? Math.max(0, Math.floor((Date.now() - admission.getTime()) / (1000 * 60 * 60 * 24)))
                      : null;

                    return (
                      <Link
                        key={resident.id}
                        href={`/app/residents/${resident.id}`}
                        className="block rounded-lg border border-[#35517f] bg-[#10203a] p-2 transition hover:border-[#4b71aa]"
                      >
                        <p className="text-xs font-semibold text-white">{getResidentDisplayName(resident)} • Room {resident.room}</p>
                        <p className="mt-1 text-[11px] text-[#a5bce2]">Admitted {formatDateLabel(resident.admissionDate)}</p>
                        <p className="mt-1 text-[10px] text-[#c9ddff]">
                          {daysSince == null ? "Admission date missing" : `${daysSince} day${daysSince === 1 ? "" : "s"} since admission`}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#273e64] bg-[linear-gradient(180deg,#10213b_0%,#0b162a_100%)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9db5e0]">Smart Shortcuts</p>
              <div className="mt-3 grid gap-2">
                {[
                  { label: "Add Resident", href: "#", onClick: openAddResident },
                  { label: "Residents Due This Week", href: "/app/residents?filter=DUE_SOON" },
                  { label: "Quarterly UDA Queue", href: "/app/documentation/uda" },
                  { label: "Annual UDA Queue", href: "/app/documentation/uda" },
                  { label: "MDS Queue", href: "/app/documentation/mds" },
                  { label: "Documentation Due", href: "/app/documentation" },
                  { label: "Residents Needing 1:1", href: "/app/documentation/one-to-one" },
                  { label: "Export Compliance Report", href: "#", onClick: exportVisibleResidents }
                ].map((shortcut) => {
                  if (shortcut.onClick) {
                    return (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={shortcut.onClick}
                        className="rounded-xl border border-[#375888] bg-[#112341] px-3 py-2 text-left text-xs font-semibold text-[#d4e5ff] transition hover:-translate-y-px hover:bg-[#1a3156]"
                      >
                        {shortcut.label}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={shortcut.label}
                      href={shortcut.href}
                      className="rounded-xl border border-[#375888] bg-[#112341] px-3 py-2 text-xs font-semibold text-[#d4e5ff] transition hover:-translate-y-px hover:bg-[#1a3156]"
                    >
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
          if (!open) setEditingResident(null);
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
