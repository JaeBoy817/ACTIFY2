"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Flag,
  LayoutList,
  Loader2,
  Printer,
  Save,
  Search,
  Users
} from "lucide-react";

import { formatActifyDate, formatActifyDateTime, formatActifyTime } from "@/lib/datetime";
import type { QuickAttendanceStatus } from "@/lib/attendance-tracker/status";
import { addZonedDays, zonedDateKey, zonedDateStringToUtcStart } from "@/lib/timezone";
import type { AttendanceEntriesMap, AttendanceQuickResident, AttendanceSessionSummary } from "@/lib/attendance-tracker/types";
import { compareResidentsByRoom } from "@/lib/resident-status";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type AttendanceCommandCenterData = {
  dateKey: string;
  sessions: AttendanceSessionSummary[];
  selectedSessionId: string | null;
  residents: AttendanceQuickResident[];
  entriesByResidentId: AttendanceEntriesMap;
  historySessions: AttendanceSessionSummary[];
  historyLocations: string[];
  historyFrom: string;
  historyTo: string;
};

type AttendanceSaveMode = "draft" | "finalize";
type RosterMode = "all" | "scheduled" | "flagged" | "incomplete";
type SortMode = "room" | "name" | "status" | "flagged";
type StatusFilterValue = "all" | QuickAttendanceStatus;

type FollowUpSuggestion = {
  residentId: string;
  residentName: string;
  room: string;
  reason: string;
  hint: string;
  tone: "critical" | "attention" | "watch";
  href: string;
};

type StatusOption = {
  value: QuickAttendanceStatus;
  label: string;
  shortLabel: string;
  description: string;
  tone: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "PRESENT",
    label: "Attended",
    shortLabel: "Attended",
    description: "Resident attended the activity",
    tone: "border-emerald-300/45 bg-emerald-500/20 text-emerald-100"
  },
  {
    value: "REFUSED",
    label: "Refused",
    shortLabel: "Refused",
    description: "Resident declined participation",
    tone: "border-rose-300/45 bg-rose-500/20 text-rose-100"
  },
  {
    value: "ASLEEP",
    label: "Asleep",
    shortLabel: "Asleep",
    description: "Resident asleep during round",
    tone: "border-violet-300/45 bg-violet-500/20 text-violet-100"
  },
  {
    value: "OUT_OF_ROOM",
    label: "Out of Facility",
    shortLabel: "Out",
    description: "Resident away from unit/facility",
    tone: "border-sky-300/45 bg-sky-500/20 text-sky-100"
  },
  {
    value: "NOT_APPLICABLE",
    label: "In Room",
    shortLabel: "In Room",
    description: "Resident remained in room",
    tone: "border-amber-300/45 bg-amber-500/20 text-amber-100"
  },
  {
    value: "ONE_TO_ONE",
    label: "1:1 Offered",
    shortLabel: "1:1",
    description: "Resident received 1:1 engagement",
    tone: "border-indigo-300/45 bg-indigo-500/20 text-indigo-100"
  }
];

const STATUS_PRIORITY: Record<QuickAttendanceStatus, number> = {
  CLEAR: 99,
  REFUSED: 1,
  ASLEEP: 2,
  OUT_OF_ROOM: 3,
  NOT_APPLICABLE: 4,
  ONE_TO_ONE: 5,
  PRESENT: 6
};

const FOLLOW_UP_STATUS_SET = new Set<QuickAttendanceStatus>(["REFUSED", "ASLEEP", "OUT_OF_ROOM", "NOT_APPLICABLE"]);

function cloneEntries(entries: AttendanceEntriesMap): AttendanceEntriesMap {
  return JSON.parse(JSON.stringify(entries)) as AttendanceEntriesMap;
}

function residentName(resident: AttendanceQuickResident) {
  return `${resident.firstName} ${resident.lastName}`.trim();
}

function statusFromEntries(entriesByResidentId: AttendanceEntriesMap, residentId: string): QuickAttendanceStatus {
  return entriesByResidentId[residentId]?.status ?? "CLEAR";
}

function notesFromEntries(entriesByResidentId: AttendanceEntriesMap, residentId: string) {
  return entriesByResidentId[residentId]?.notes ?? null;
}

function statusLabel(status: QuickAttendanceStatus) {
  if (status === "CLEAR") return "Unmarked";
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Unmarked";
}

function statusTone(status: QuickAttendanceStatus) {
  if (status === "CLEAR") {
    return "border-[#324a72] bg-[#0f1d35] text-[#c4d5f4]";
  }
  return STATUS_OPTIONS.find((option) => option.value === status)?.tone ?? "border-[#324a72] bg-[#0f1d35] text-[#c4d5f4]";
}

function toCsvCell(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replaceAll("\"", "\"\"")}"`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateRangeLabel(from: string, to: string, timeZone: string) {
  const fromDate = zonedDateStringToUtcStart(from, timeZone);
  const toDate = zonedDateStringToUtcStart(to, timeZone);
  if (!fromDate || !toDate) {
    return "Last 30 days";
  }
  return `${formatActifyDate(fromDate, timeZone)} – ${formatActifyDate(toDate, timeZone)}`;
}

export function AttendanceCommandCenter({
  initialData,
  canEdit,
  timeZone
}: {
  initialData: AttendanceCommandCenterData;
  canEdit: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [dateKey, setDateKey] = useState(initialData.dateKey);
  const [sessions, setSessions] = useState(initialData.sessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialData.selectedSessionId ?? initialData.sessions[0]?.id ?? null
  );
  const [residents, setResidents] = useState(initialData.residents);
  const [entriesByResidentId, setEntriesByResidentId] = useState<AttendanceEntriesMap>(cloneEntries(initialData.entriesByResidentId));
  const [baselineEntriesByResidentId, setBaselineEntriesByResidentId] = useState<AttendanceEntriesMap>(
    cloneEntries(initialData.entriesByResidentId)
  );

  const [historySessions, setHistorySessions] = useState(initialData.historySessions);
  const [historyLocations, setHistoryLocations] = useState(initialData.historyLocations);
  const [historyFrom] = useState(initialData.historyFrom);
  const [historyTo] = useState(initialData.historyTo);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyLocationFilter, setHistoryLocationFilter] = useState("all");

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [rosterMode, setRosterMode] = useState<RosterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("room");

  const [selectedResidentIds, setSelectedResidentIds] = useState<Set<string>>(new Set());
  const [activeParticipation, setActiveParticipation] = useState<Set<string>>(new Set());
  const [focusedResidentId, setFocusedResidentId] = useState<string | null>(initialData.residents[0]?.id ?? null);

  const [loadingQuickTake, setLoadingQuickTake] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saveMode, setSaveMode] = useState<AttendanceSaveMode | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [finalizedSessionIds, setFinalizedSessionIds] = useState<Set<string>>(new Set());

  const selectedSession = useMemo(() => {
    return sessions.find((session) => session.id === selectedSessionId) ?? null;
  }, [selectedSessionId, sessions]);

  const unitOptions = useMemo(() => {
    return Array.from(new Set(residents.map((resident) => resident.unitName).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [residents]);

  const markedCount = useMemo(() => {
    return residents.reduce((total, resident) => {
      return statusFromEntries(entriesByResidentId, resident.id) === "CLEAR" ? total : total + 1;
    }, 0);
  }, [entriesByResidentId, residents]);

  const statusCounts = useMemo(() => {
    return residents.reduce(
      (counts, resident) => {
        const status = statusFromEntries(entriesByResidentId, resident.id);
        counts[status] += 1;
        return counts;
      },
      {
        CLEAR: 0,
        PRESENT: 0,
        REFUSED: 0,
        ASLEEP: 0,
        OUT_OF_ROOM: 0,
        ONE_TO_ONE: 0,
        NOT_APPLICABLE: 0
      } as Record<QuickAttendanceStatus, number>
    );
  }, [entriesByResidentId, residents]);

  const attendedCount = statusCounts.PRESENT + statusCounts.ONE_TO_ONE;
  const notPresentCount = statusCounts.REFUSED + statusCounts.ASLEEP + statusCounts.OUT_OF_ROOM + statusCounts.NOT_APPLICABLE;
  const participationRate = residents.length > 0 ? Math.round((attendedCount / residents.length) * 100) : 0;
  const activeParticipationCount = Array.from(activeParticipation).filter((residentId) => {
    const status = statusFromEntries(entriesByResidentId, residentId);
    return status !== "CLEAR";
  }).length;
  const unmarkedCount = Math.max(0, residents.length - markedCount);

  const hasUnsavedChanges = useMemo(() => {
    return residents.some((resident) => {
      const currentStatus = statusFromEntries(entriesByResidentId, resident.id);
      const baselineStatus = statusFromEntries(baselineEntriesByResidentId, resident.id);
      const currentNotes = notesFromEntries(entriesByResidentId, resident.id) ?? null;
      const baselineNotes = notesFromEntries(baselineEntriesByResidentId, resident.id) ?? null;
      return currentStatus !== baselineStatus || currentNotes !== baselineNotes;
    });
  }, [baselineEntriesByResidentId, entriesByResidentId, residents]);

  const visibleResidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = residents.filter((resident) => {
      const status = statusFromEntries(entriesByResidentId, resident.id);
      const isFlagged = FOLLOW_UP_STATUS_SET.has(status);

      if (unitFilter !== "all" && resident.unitName !== unitFilter) {
        return false;
      }

      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }

      if (rosterMode === "scheduled" && status === "CLEAR") {
        return false;
      }

      if (rosterMode === "flagged" && !isFlagged) {
        return false;
      }

      if (rosterMode === "incomplete" && status !== "CLEAR") {
        return false;
      }

      if (!query) return true;

      const searchable = `${resident.firstName} ${resident.lastName} ${resident.room} ${resident.unitName ?? ""}`.toLowerCase();
      return searchable.includes(query);
    });

    const next = [...filtered];

    next.sort((a, b) => {
      const aStatus = statusFromEntries(entriesByResidentId, a.id);
      const bStatus = statusFromEntries(entriesByResidentId, b.id);

      if (sortMode === "name") {
        const byLast = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
        if (byLast !== 0) return byLast;
        return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
      }

      if (sortMode === "status") {
        const statusDiff = STATUS_PRIORITY[aStatus] - STATUS_PRIORITY[bStatus];
        if (statusDiff !== 0) return statusDiff;
        return compareResidentsByRoom(a, b);
      }

      if (sortMode === "flagged") {
        const aFlag = FOLLOW_UP_STATUS_SET.has(aStatus) ? 0 : 1;
        const bFlag = FOLLOW_UP_STATUS_SET.has(bStatus) ? 0 : 1;
        if (aFlag !== bFlag) return aFlag - bFlag;
        return compareResidentsByRoom(a, b);
      }

      return compareResidentsByRoom(a, b);
    });

    return next;
  }, [entriesByResidentId, residents, rosterMode, search, sortMode, statusFilter, unitFilter]);

  const visibleResidentIds = useMemo(() => new Set(visibleResidents.map((resident) => resident.id)), [visibleResidents]);

  const allVisibleSelected = useMemo(() => {
    if (visibleResidents.length === 0) return false;
    return visibleResidents.every((resident) => selectedResidentIds.has(resident.id));
  }, [selectedResidentIds, visibleResidents]);

  const followUpSuggestions = useMemo(() => {
    const suggestions: FollowUpSuggestion[] = [];

    for (const resident of residents) {
      const status = statusFromEntries(entriesByResidentId, resident.id);
      const name = residentName(resident);

      if (status === "REFUSED") {
        suggestions.push({
          residentId: resident.id,
          residentName: name,
          room: resident.room,
          reason: "Refused participation",
          hint: "Add a progress note and try a preference-based follow-up later today.",
          tone: "critical",
          href: `/app/documentation/progress-notes/new?residentId=${resident.id}`
        });
      } else if (status === "ASLEEP") {
        suggestions.push({
          residentId: resident.id,
          residentName: name,
          room: resident.room,
          reason: "Asleep during activity",
          hint: "Consider a 1:1 attempt during the resident’s preferred time window.",
          tone: "attention",
          href: `/app/documentation/one-to-one/new?residentId=${resident.id}`
        });
      } else if (status === "OUT_OF_ROOM") {
        suggestions.push({
          residentId: resident.id,
          residentName: name,
          room: resident.room,
          reason: "Out of facility",
          hint: "Recheck participation on next available group and document outreach.",
          tone: "watch",
          href: `/app/residents/${resident.id}`
        });
      } else if (status === "NOT_APPLICABLE") {
        suggestions.push({
          residentId: resident.id,
          residentName: name,
          room: resident.room,
          reason: "In room during group",
          hint: "Offer room-based engagement and create a short follow-up note.",
          tone: "attention",
          href: `/app/documentation/one-to-one/new?residentId=${resident.id}`
        });
      }
    }

    if (suggestions.length === 0 && selectedSession) {
      return [
        {
          residentId: "",
          residentName: "No urgent follow-up",
          room: "",
          reason: "Current attendance does not show urgent flags",
          hint: "Use Quick Create to add a progress note for notable engagement updates.",
          tone: "watch" as const,
          href: "/app/documentation"
        }
      ];
    }

    return suggestions.slice(0, 7);
  }, [entriesByResidentId, residents, selectedSession]);

  const historyList = useMemo(() => {
    return historySessions
      .filter((session) => {
        if (historyLocationFilter !== "all" && session.location !== historyLocationFilter) return false;
        if (!historyQuery.trim()) return true;
        const q = historyQuery.trim().toLowerCase();
        return `${session.title} ${session.location}`.toLowerCase().includes(q);
      })
      .slice(0, 12);
  }, [historyLocationFilter, historyQuery, historySessions]);

  const summaryCards = useMemo(() => {
    return [
      {
        key: "total",
        label: "Total Roster",
        value: String(residents.length),
        helpText: selectedSession ? "Residents available for this session" : "Select an activity to begin",
        icon: Users,
        accent: "from-cyan-500/25 to-blue-600/15",
        border: "border-cyan-300/35"
      },
      {
        key: "attended",
        label: "Marked Present / Attended",
        value: String(attendedCount),
        helpText: `${statusCounts.PRESENT} attended • ${statusCounts.ONE_TO_ONE} 1:1 offered`,
        icon: CalendarCheck2,
        accent: "from-emerald-500/25 to-teal-600/15",
        border: "border-emerald-300/35"
      },
      {
        key: "not-present",
        label: "Refusals / Not Present",
        value: String(notPresentCount),
        helpText: `${statusCounts.REFUSED} refused • ${statusCounts.ASLEEP + statusCounts.OUT_OF_ROOM + statusCounts.NOT_APPLICABLE} unavailable`,
        icon: Flag,
        accent: "from-amber-500/25 to-orange-600/15",
        border: "border-amber-300/35"
      },
      {
        key: "rate",
        label: "Participation Rate",
        value: `${participationRate}%`,
        helpText: `${markedCount} of ${residents.length} residents marked`,
        icon: Activity,
        accent: "from-violet-500/25 to-indigo-600/15",
        border: "border-violet-300/35"
      },
      {
        key: "active",
        label: "Active Participation",
        value: String(activeParticipationCount),
        helpText: "Optional enhancement flag",
        icon: CheckCircle2,
        accent: "from-fuchsia-500/25 to-purple-600/15",
        border: "border-fuchsia-300/35"
      }
    ];
  }, [activeParticipationCount, attendedCount, markedCount, notPresentCount, participationRate, residents.length, selectedSession, statusCounts]);

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

  const loadQuickTake = useCallback(
    async (nextDateKey: string, nextSessionId?: string | null) => {
      setLoadingQuickTake(true);
      try {
        const url = new URL("/api/attendance/quick-take", window.location.origin);
        url.searchParams.set("date", nextDateKey);
        if (nextSessionId) {
          url.searchParams.set("sessionId", nextSessionId);
        }

        const response = await authorizedFetch(url.toString(), {
          method: "GET",
          cache: "no-store"
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body?.error ?? "Could not load attendance.");
        }

        const payload = body as {
          dateKey: string;
          sessions: AttendanceSessionSummary[];
          selectedSessionId: string | null;
          residents: AttendanceQuickResident[];
          entriesByResidentId: AttendanceEntriesMap;
        };

        setDateKey(payload.dateKey);
        setSessions(payload.sessions);
        setSelectedSessionId(payload.selectedSessionId ?? payload.sessions[0]?.id ?? null);
        setResidents(payload.residents);
        const nextEntries = cloneEntries(payload.entriesByResidentId);
        setEntriesByResidentId(nextEntries);
        setBaselineEntriesByResidentId(nextEntries);
        setSelectedResidentIds(new Set());
        setActiveParticipation(new Set());
        setFocusedResidentId(payload.residents[0]?.id ?? null);
      } catch (error) {
        toast({
          title: "Could not load attendance",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      } finally {
        setLoadingQuickTake(false);
      }
    },
    [authorizedFetch, toast]
  );

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const url = new URL("/api/attendance/sessions", window.location.origin);
      url.searchParams.set("from", historyFrom);
      url.searchParams.set("to", historyTo);
      if (historyQuery.trim()) {
        url.searchParams.set("activity", historyQuery.trim());
      }
      if (historyLocationFilter !== "all") {
        url.searchParams.set("location", historyLocationFilter);
      }

      const response = await authorizedFetch(url.toString(), {
        method: "GET",
        cache: "no-store"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not load attendance history.");
      }

      setHistorySessions((body.sessions as AttendanceSessionSummary[]) ?? []);
      setHistoryLocations((body.locations as string[]) ?? []);
    } catch (error) {
      toast({
        title: "Could not refresh history",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingHistory(false);
    }
  }, [authorizedFetch, historyFrom, historyLocationFilter, historyQuery, historyTo, toast]);

  const saveAttendance = useCallback(
    async (mode: AttendanceSaveMode) => {
      if (!selectedSessionId) {
        toast({
          title: "Select an activity first",
          description: "Choose a scheduled activity before saving attendance.",
          variant: "destructive"
        });
        return;
      }

      if (!canEdit) {
        toast({
          title: "Read-only access",
          description: "You do not have permission to save attendance.",
          variant: "destructive"
        });
        return;
      }

      setSaveMode(mode);
      try {
        const payload = {
          sessionId: selectedSessionId,
          entries: residents.map((resident) => ({
            residentId: resident.id,
            status: statusFromEntries(entriesByResidentId, resident.id),
            notes: notesFromEntries(entriesByResidentId, resident.id)
          }))
        };

        const response = await authorizedFetch("/api/attendance/quick-take", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const body = await response.json();
        if (!response.ok) {
          throw new Error(body?.error ?? "Could not save attendance.");
        }

        if (mode === "finalize") {
          setFinalizedSessionIds((previous) => {
            const next = new Set(previous);
            next.add(selectedSessionId);
            return next;
          });
        }

        setLastSavedAt(new Date());

        const refreshedEntries = cloneEntries(entriesByResidentId);
        setBaselineEntriesByResidentId(refreshedEntries);

        toast({
          title: mode === "draft" ? "Draft saved" : "Attendance finalized",
          description:
            mode === "draft"
              ? "Attendance draft was saved and can be edited any time."
              : "Attendance was finalized for this activity."
        });

        void loadQuickTake(dateKey, selectedSessionId);
      } catch (error) {
        toast({
          title: "Save failed",
          description: error instanceof Error ? error.message : "Try again.",
          variant: "destructive"
        });
      } finally {
        setSaveMode(null);
      }
    },
    [authorizedFetch, canEdit, dateKey, entriesByResidentId, loadQuickTake, residents, selectedSessionId, toast]
  );

  const toggleResidentSelection = useCallback((residentId: string) => {
    setSelectedResidentIds((previous) => {
      const next = new Set(previous);
      if (next.has(residentId)) {
        next.delete(residentId);
      } else {
        next.add(residentId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedResidentIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        visibleResidents.forEach((resident) => next.delete(resident.id));
      } else {
        visibleResidents.forEach((resident) => next.add(resident.id));
      }
      return next;
    });
  }, [allVisibleSelected, visibleResidents]);

  const setResidentStatus = useCallback((residentId: string, status: QuickAttendanceStatus) => {
    setEntriesByResidentId((previous) => {
      return {
        ...previous,
        [residentId]: {
          status,
          notes: previous[residentId]?.notes ?? null
        }
      };
    });
  }, []);

  const setResidentNotes = useCallback((residentId: string, notes: string | null) => {
    setEntriesByResidentId((previous) => ({
      ...previous,
      [residentId]: {
        status: previous[residentId]?.status ?? "CLEAR",
        notes
      }
    }));
  }, []);

  const applyBulkStatus = useCallback(
    (status: QuickAttendanceStatus) => {
      if (selectedResidentIds.size === 0) return;

      setEntriesByResidentId((previous) => {
        const next = { ...previous };
        selectedResidentIds.forEach((residentId) => {
          if (!visibleResidentIds.has(residentId)) return;
          next[residentId] = {
            status,
            notes: previous[residentId]?.notes ?? null
          };
        });
        return next;
      });
    },
    [selectedResidentIds, visibleResidentIds]
  );

  const clearSelectedStatuses = useCallback(() => {
    if (selectedResidentIds.size === 0) return;

    setEntriesByResidentId((previous) => {
      const next = { ...previous };
      selectedResidentIds.forEach((residentId) => {
        if (!visibleResidentIds.has(residentId)) return;
        next[residentId] = {
          status: "CLEAR",
          notes: previous[residentId]?.notes ?? null
        };
      });
      return next;
    });
  }, [selectedResidentIds, visibleResidentIds]);

  const toggleActiveParticipation = useCallback((residentId: string) => {
    setActiveParticipation((previous) => {
      const next = new Set(previous);
      if (next.has(residentId)) {
        next.delete(residentId);
      } else {
        next.add(residentId);
      }
      return next;
    });
  }, []);

  const editResidentNote = useCallback(
    (resident: AttendanceQuickResident) => {
      const existing = notesFromEntries(entriesByResidentId, resident.id) ?? "";
      const response = window.prompt(`Update attendance note for ${residentName(resident)} (${resident.room})`, existing);
      if (response === null) {
        return;
      }

      const trimmed = response.trim();
      setResidentNotes(resident.id, trimmed.length ? trimmed : null);
    },
    [entriesByResidentId, setResidentNotes]
  );

  const openHistorySession = useCallback(
    async (session: AttendanceSessionSummary) => {
      await loadQuickTake(session.dateKey, session.id);
      toast({
        title: "Session loaded",
        description: `${session.title} is now active in the roster.`
      });
    },
    [loadQuickTake, toast]
  );

  const goToDate = useCallback(
    async (nextDate: string) => {
      await loadQuickTake(nextDate, null);
    },
    [loadQuickTake]
  );

  const shiftDate = useCallback(
    async (delta: number) => {
      const baseDate = zonedDateStringToUtcStart(dateKey, timeZone) ?? new Date();
      const nextDate = zonedDateKey(addZonedDays(baseDate, timeZone, delta), timeZone);
      await goToDate(nextDate);
    },
    [dateKey, goToDate, timeZone]
  );

  const exportRosterCsv = useCallback(() => {
    if (!selectedSession) {
      toast({
        title: "No activity selected",
        description: "Select an activity first to export attendance.",
        variant: "destructive"
      });
      return;
    }

    const rows: string[] = [];
    rows.push(`Activity,${toCsvCell(selectedSession.title)}`);
    rows.push(`Date,${toCsvCell(formatActifyDate(new Date(selectedSession.startAt), timeZone))}`);
    rows.push(`Time,${toCsvCell(`${formatActifyTime(new Date(selectedSession.startAt), timeZone)} - ${formatActifyTime(new Date(selectedSession.endAt), timeZone)}`)}`);
    rows.push(`Location,${toCsvCell(selectedSession.location)}`);
    rows.push(`Generated At,${toCsvCell(formatActifyDateTime(new Date(), timeZone))}`);
    rows.push("");
    rows.push("Resident,Room,Unit,Status,Participated Actively,Note");

    for (const resident of residents) {
      const status = statusFromEntries(entriesByResidentId, resident.id);
      rows.push(
        [
          toCsvCell(residentName(resident)),
          toCsvCell(resident.room),
          toCsvCell(resident.unitName ?? ""),
          toCsvCell(statusLabel(status)),
          toCsvCell(activeParticipation.has(resident.id) ? "Yes" : "No"),
          toCsvCell(notesFromEntries(entriesByResidentId, resident.id) ?? "")
        ].join(",")
      );
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `attendance-${selectedSession.dateKey}-${selectedSession.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }, [activeParticipation, entriesByResidentId, residents, selectedSession, timeZone, toast]);

  const printRoster = useCallback(() => {
    if (!selectedSession) {
      toast({
        title: "No activity selected",
        description: "Select an activity before printing.",
        variant: "destructive"
      });
      return;
    }

    const summaryRows = [
      `Total roster: ${residents.length}`,
      `Attended: ${attendedCount}`,
      `Not present: ${notPresentCount}`,
      `Participation rate: ${participationRate}%`
    ];

    const tableRows = residents
      .map((resident) => {
        const status = statusFromEntries(entriesByResidentId, resident.id);
        const note = notesFromEntries(entriesByResidentId, resident.id) ?? "";

        return `<tr>
          <td>${escapeHtml(residentName(resident))}</td>
          <td>${escapeHtml(resident.room)}</td>
          <td>${escapeHtml(resident.unitName ?? "")}</td>
          <td>${escapeHtml(statusLabel(status))}</td>
          <td>${activeParticipation.has(resident.id) ? "Yes" : "No"}</td>
          <td>${escapeHtml(note)}</td>
        </tr>`;
      })
      .join("");

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
    if (!printWindow) {
      toast({
        title: "Print blocked",
        description: "Allow pop-ups to print attendance roster.",
        variant: "destructive"
      });
      return;
    }

    printWindow.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Attendance Roster</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; margin: 24px; }
  h1 { margin: 0 0 6px; font-size: 22px; }
  p { margin: 0 0 4px; }
  .muted { color: #4b5563; }
  .summary { margin: 14px 0; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
  th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
</style>
</head>
<body>
  <h1>${escapeHtml(selectedSession.title)}</h1>
  <p class="muted">${escapeHtml(formatActifyDate(new Date(selectedSession.startAt), timeZone))} · ${escapeHtml(formatActifyTime(new Date(selectedSession.startAt), timeZone))} - ${escapeHtml(formatActifyTime(new Date(selectedSession.endAt), timeZone))}</p>
  <p class="muted">${escapeHtml(selectedSession.location)}</p>
  <p class="muted">Printed ${escapeHtml(formatActifyDateTime(new Date(), timeZone))}</p>
  <div class="summary">${summaryRows.map((row) => `<p>${escapeHtml(row)}</p>`).join("")}</div>
  <table>
    <thead>
      <tr>
        <th>Resident</th>
        <th>Room</th>
        <th>Unit</th>
        <th>Status</th>
        <th>Active Participation</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [activeParticipation, attendedCount, entriesByResidentId, notPresentCount, participationRate, residents, selectedSession, timeZone, toast]);

  useEffect(() => {
    const query = new URLSearchParams();
    query.set("date", dateKey);
    if (selectedSessionId) {
      query.set("sessionId", selectedSessionId);
    }
    router.replace(`/app/attendance?${query.toString()}`, { scroll: false });
  }, [dateKey, router, selectedSessionId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!focusedResidentId) return;
      if (event.target instanceof HTMLElement) {
        const tagName = event.target.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select") {
          return;
        }
      }

      const keyMap: Record<string, QuickAttendanceStatus> = {
        "1": "PRESENT",
        "2": "REFUSED",
        "3": "ASLEEP",
        "4": "OUT_OF_ROOM",
        "5": "NOT_APPLICABLE",
        "6": "ONE_TO_ONE",
        "0": "CLEAR"
      };

      const nextStatus = keyMap[event.key];
      if (!nextStatus) return;

      event.preventDefault();
      setResidentStatus(focusedResidentId, nextStatus);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [focusedResidentId, setResidentStatus]);

  const selectedSessionCompletion = selectedSession?.completionPercent ?? 0;
  const lastSavedLabel = lastSavedAt ? formatActifyDateTime(lastSavedAt, timeZone) : "Not saved yet";

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#050b18] p-3 md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1180px_520px_at_-8%_0%,rgba(56,189,248,0.16),transparent_62%),radial-gradient(860px_420px_at_95%_0%,rgba(139,92,246,0.22),transparent_62%),radial-gradient(740px_360px_at_40%_100%,rgba(59,130,246,0.14),transparent_72%)]" />

      <div className="relative z-10 space-y-4">
        <section className="rounded-2xl border border-[#2a3e64] bg-[#091327]/95 p-4 shadow-[0_24px_60px_-38px_rgba(37,99,235,0.6)] md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#93acd7]">Attendance Tracker</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Attendance Command Center</h1>
              <p className="mt-2 text-sm text-[#9cb3d9]">Take attendance without slowing down the activity. Mark statuses fast, review follow-ups, and publish clean records.</p>
              <p className="mt-2 text-xs text-[#7f95bc]">{formatActifyDate(zonedDateStringToUtcStart(dateKey, timeZone) ?? new Date(), timeZone)} · {selectedSession ? "Activity selected" : "No activity selected"}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void saveAttendance("draft")}
                disabled={!canEdit || !selectedSessionId || saveMode !== null}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                  "border-[#416191] bg-[#122747] text-[#dce8ff] hover:border-[#5a82bc] hover:bg-[#173153]",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {saveMode === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => void saveAttendance("finalize")}
                disabled={!canEdit || !selectedSessionId || saveMode !== null}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                  "border-emerald-300/45 bg-emerald-500/20 text-emerald-100 hover:border-emerald-200/60 hover:bg-emerald-500/30",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {saveMode === "finalize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Finalize
              </button>
              <button
                type="button"
                onClick={printRoster}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3f5f8f] bg-[#112340] px-3 text-sm font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={exportRosterCsv}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3f5f8f] bg-[#112340] px-3 text-sm font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#283c60] bg-[#081222]/95 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_180px_1fr_180px_1fr_auto]">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Activity</span>
              <select
                value={selectedSessionId ?? ""}
                onChange={(event) => {
                  const nextSessionId = event.target.value || null;
                  if (!nextSessionId) {
                    setSelectedSessionId(null);
                    setEntriesByResidentId({});
                    setBaselineEntriesByResidentId({});
                    return;
                  }
                  void loadQuickTake(dateKey, nextSessionId);
                }}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm font-medium text-[#dbe8ff] outline-none transition focus-visible:border-[#6da2ff]"
              >
                {sessions.length === 0 ? <option value="">No activities for this date</option> : null}
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title} · {formatActifyTime(new Date(session.startAt), timeZone)} · {session.location}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Date</span>
              <div className="flex h-11 items-center overflow-hidden rounded-xl border border-[#39557f] bg-[#0f1d35]">
                <button
                  type="button"
                  onClick={() => void shiftDate(-1)}
                  className="inline-flex h-full w-10 items-center justify-center text-[#d6e5ff] transition hover:bg-[#183154]"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={dateKey}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    if (!nextDate) return;
                    void goToDate(nextDate);
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-[#dbe8ff] outline-none"
                />
                <button
                  type="button"
                  onClick={() => void shiftDate(1)}
                  className="inline-flex h-full w-10 items-center justify-center text-[#d6e5ff] transition hover:bg-[#183154]"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Search Resident</span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-[#39557f] bg-[#0f1d35] px-3">
                <Search className="h-4 w-4 text-[#9eb7df]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, room, unit"
                  className="w-full bg-transparent text-sm text-[#dbe8ff] outline-none placeholder:text-[#7f97bf]"
                />
              </div>
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">Status Filter</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilterValue)}
                className="h-11 w-full rounded-xl border border-[#39557f] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
              >
                <option value="all">All statuses</option>
                <option value="CLEAR">Unmarked</option>
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#90a8d4]">View</span>
              <div className="flex h-11 items-center rounded-xl border border-[#39557f] bg-[#0f1d35] p-1">
                {([
                  ["all", "All"],
                  ["scheduled", "Marked"],
                  ["flagged", "Flagged"],
                  ["incomplete", "Unmarked"]
                ] as Array<[RosterMode, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRosterMode(value)}
                    className={cn(
                      "inline-flex h-full items-center rounded-lg px-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition",
                      rosterMode === value
                        ? "bg-[#1a355c] text-[#e8f0ff]"
                        : "text-[#9eb5da] hover:text-[#e2ecff]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void goToDate(zonedDateKey(new Date(), timeZone))}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setUnitFilter("all");
                setStatusFilter("all");
                setRosterMode("all");
                setSortMode("room");
                setSearch("");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
            >
              <LayoutList className="h-3.5 w-3.5" />
              Clear Filters
            </button>
            <span className="rounded-full border border-[#2f456e] bg-[#0f1d35] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9fb6db]">
              {visibleResidents.length} visible of {residents.length}
            </span>
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-[#9fb6db]">
              Sort
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-8 rounded-lg border border-[#35527b] bg-[#0f1d35] px-2 text-xs text-[#dbe8ff]"
              >
                <option value="room">Room</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="flagged">Flagged First</option>
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.key}
                className={cn(
                  "rounded-2xl border bg-[#0a162b]/95 p-4",
                  "bg-gradient-to-br",
                  card.accent,
                  card.border
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b3c7ea]">{card.label}</p>
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                <p className="mt-1 text-xs text-[#d0def8]">{card.helpText}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-[#2b3f62] bg-[#081224]/95 p-4">
              {selectedSession ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#92aad4]">Selected Activity</p>
                      <h2 className="mt-1 text-xl font-bold text-white">{selectedSession.title}</h2>
                      <p className="mt-1 text-sm text-[#9ab1d8]">
                        {formatActifyDate(new Date(selectedSession.startAt), timeZone)} · {formatActifyTime(new Date(selectedSession.startAt), timeZone)} - {formatActifyTime(new Date(selectedSession.endAt), timeZone)}
                      </p>
                      <p className="text-sm text-[#9ab1d8]">{selectedSession.location}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold", selectedSessionCompletion >= 100 ? "border-emerald-300/45 bg-emerald-500/20 text-emerald-100" : "border-amber-300/45 bg-amber-500/20 text-amber-100")}>
                        <Clock3 className="h-3.5 w-3.5" />
                        {selectedSessionCompletion.toFixed(0)}% marked
                      </span>
                      {finalizedSessionIds.has(selectedSession.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/45 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Finalized
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/app/calendar?view=day&date=${selectedSession.dateKey}`}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Open in Calendar
                    </Link>
                    <Link
                      href={`/app/calendar/${selectedSession.id}/attendance`}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Checklist View
                    </Link>
                    <button
                      type="button"
                      onClick={() => void loadQuickTake(dateKey, selectedSession.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
                    >
                      <Circle className="h-3.5 w-3.5" />
                      Clear Draft
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-5 text-sm text-[#a9bfdf]">
                  <p className="text-base font-semibold text-[#dce8ff]">No activity selected</p>
                  <p className="mt-1">Select a date and activity to begin attendance. If no activity is scheduled, add one from Calendar.</p>
                  <Link
                    href={`/app/calendar?view=day&date=${dateKey}`}
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 py-1.5 text-xs font-semibold text-[#dbe8ff] transition hover:border-[#5a82bc]"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Open Calendar
                  </Link>
                </div>
              )}
            </article>

            {selectedResidentIds.size > 0 ? (
              <article className="sticky top-3 z-20 rounded-2xl border border-[#3a567f] bg-[#10213c]/95 p-3 backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#d9e6ff]">Bulk actions for {selectedResidentIds.size} selected resident{selectedResidentIds.size === 1 ? "" : "s"}</p>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus("PRESENT")}
                    className="rounded-full border border-emerald-300/45 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100"
                  >
                    Mark Attended
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus("REFUSED")}
                    className="rounded-full border border-rose-300/45 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100"
                  >
                    Mark Refused
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus("NOT_APPLICABLE")}
                    className="rounded-full border border-amber-300/45 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100"
                  >
                    Mark In Room
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus("ASLEEP")}
                    className="rounded-full border border-violet-300/45 bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-100"
                  >
                    Mark Asleep
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus("OUT_OF_ROOM")}
                    className="rounded-full border border-sky-300/45 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-100"
                  >
                    Mark Out
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulkStatus("ONE_TO_ONE")}
                    className="rounded-full border border-indigo-300/45 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100"
                  >
                    Add 1:1 Offered
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedStatuses}
                    className="rounded-full border border-[#486a9a] bg-[#112544] px-3 py-1 text-xs font-semibold text-[#dce8ff]"
                  >
                    Clear Selected
                  </button>
                </div>
              </article>
            ) : null}

            <article className="overflow-hidden rounded-2xl border border-[#2a3f63] bg-[#081224]/95">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#243751] px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Resident Roster</h3>
                  <p className="text-xs text-[#95add5]">One-tap status marking. Keyboard shortcuts: 1-6 and 0 to clear on focused row.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-[#3b5a85] bg-[#0f1e37] px-3 py-1 text-xs font-semibold text-[#cfe0ff]">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-3.5 w-3.5 rounded border-[#486a9a] bg-[#09182d]"
                    />
                    Select all visible
                  </label>
                  <span className="rounded-full border border-[#385176] bg-[#0f1d35] px-3 py-1 text-xs font-semibold text-[#9eb6dc]">
                    {visibleResidents.length} residents
                  </span>
                </div>
              </div>

              {loadingQuickTake ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-xl border border-[#263a5b] bg-[#0f1d35]" />
                  ))}
                </div>
              ) : visibleResidents.length === 0 ? (
                <div className="p-6 text-sm text-[#a9bfdf]">
                  <p className="text-base font-semibold text-[#dce8ff]">No residents matched the current filters.</p>
                  <p className="mt-1">Try clearing filters or switching to a different roster mode.</p>
                </div>
              ) : (
                <div className="max-h-[780px] overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {visibleResidents.map((resident) => {
                      const status = statusFromEntries(entriesByResidentId, resident.id);
                      const note = notesFromEntries(entriesByResidentId, resident.id);
                      const isSelected = selectedResidentIds.has(resident.id);
                      const isFocused = focusedResidentId === resident.id;
                      const isActive = activeParticipation.has(resident.id);

                      return (
                        <article
                          key={resident.id}
                          className={cn(
                            "rounded-xl border px-3 py-3 transition",
                            isFocused
                              ? "border-[#5f86bf] bg-[#122443]"
                              : "border-[#243751] bg-[#0d1a31] hover:border-[#395782]"
                          )}
                          onClick={() => setFocusedResidentId(resident.id)}
                        >
                          <div className="flex flex-wrap items-start gap-3">
                            <label className="mt-1 inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleResidentSelection(resident.id)}
                                className="h-4 w-4 rounded border-[#486a9a] bg-[#09182d]"
                                aria-label={`Select ${residentName(resident)}`}
                              />
                            </label>

                            <div className="min-w-[220px] flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">{residentName(resident)}</p>
                                <span className="rounded-full border border-[#3b5984] bg-[#0f203b] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bfd3f4]">
                                  Room {resident.room}
                                </span>
                                {resident.unitName ? (
                                  <span className="rounded-full border border-[#3b5984] bg-[#0f203b] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bfd3f4]">
                                    {resident.unitName}
                                  </span>
                                ) : null}
                                {FOLLOW_UP_STATUS_SET.has(status) ? (
                                  <span className="rounded-full border border-rose-300/45 bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-100">
                                    Follow-up
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {STATUS_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setResidentStatus(resident.id, option.value)}
                                    className={cn(
                                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.11em] uppercase transition",
                                      status === option.value
                                        ? option.tone
                                        : "border-[#324a72] bg-[#10213b] text-[#b8ccec] hover:border-[#5c83bc]"
                                    )}
                                    title={option.description}
                                  >
                                    {option.shortLabel}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setResidentStatus(resident.id, "CLEAR")}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.11em] uppercase transition",
                                    status === "CLEAR"
                                      ? "border-[#6f89b1] bg-[#294368] text-[#eef4ff]"
                                      : "border-[#324a72] bg-[#10213b] text-[#b8ccec] hover:border-[#5c83bc]"
                                  )}
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleActiveParticipation(resident.id)}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.11em] uppercase transition",
                                    isActive
                                      ? "border-fuchsia-300/45 bg-fuchsia-500/20 text-fuchsia-100"
                                      : "border-[#324a72] bg-[#10213b] text-[#b8ccec] hover:border-[#5c83bc]"
                                  )}
                                >
                                  Active
                                </button>
                              </div>
                            </div>

                            <div className="min-w-[220px] space-y-2 text-xs text-[#b7caea]">
                              <p className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 font-semibold", statusTone(status))}>{statusLabel(status)}</p>
                              <div className="space-y-1">
                                <p className="text-[11px] uppercase tracking-[0.12em] text-[#8fa9d3]">Notes / flags</p>
                                {note ? <p className="line-clamp-2 text-xs text-[#d3e0f8]">{note}</p> : <p className="text-xs text-[#8ca4cc]">No note added.</p>}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => editResidentNote(resident)}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dce8ff]"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Note
                                </button>
                                <Link
                                  href={`/app/documentation/one-to-one/new?residentId=${resident.id}`}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dce8ff]"
                                >
                                  1:1 Note
                                </Link>
                                <Link
                                  href={`/app/residents/${resident.id}`}
                                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2 text-[11px] font-semibold text-[#dce8ff]"
                                >
                                  Open Resident
                                </Link>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>
          </div>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Attendance Summary</h3>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  ["Total roster", residents.length],
                  ["Attended", statusCounts.PRESENT],
                  ["Refused", statusCounts.REFUSED],
                  ["Asleep", statusCounts.ASLEEP],
                  ["Out of facility", statusCounts.OUT_OF_ROOM],
                  ["In room", statusCounts.NOT_APPLICABLE],
                  ["1:1 offered", statusCounts.ONE_TO_ONE],
                  ["Active participation", activeParticipationCount]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-[#243753] bg-[#0e1d36] px-3 py-2 text-[#d7e4fd]">
                    <span className="text-xs uppercase tracking-[0.1em] text-[#9ab3d8]">{label}</span>
                    <span className="text-sm font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-[#2d466d] bg-[#0f1f39] p-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-[#9db5dd]">
                  <span>Participation rate</span>
                  <span>{participationRate}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#132744]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
                    style={{ width: `${Math.min(100, participationRate)}%` }}
                  />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Completion Status</h3>
              <div className="mt-3 space-y-2 text-sm text-[#d7e4fd]">
                <p className="flex items-center justify-between rounded-lg border border-[#243753] bg-[#0e1d36] px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.1em] text-[#9ab3d8]">Marked</span>
                  <span className="font-semibold text-white">{markedCount}</span>
                </p>
                <p className="flex items-center justify-between rounded-lg border border-[#243753] bg-[#0e1d36] px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.1em] text-[#9ab3d8]">Still unmarked</span>
                  <span className="font-semibold text-white">{unmarkedCount}</span>
                </p>
                <p className="flex items-center justify-between rounded-lg border border-[#243753] bg-[#0e1d36] px-3 py-2">
                  <span className="text-xs uppercase tracking-[0.1em] text-[#9ab3d8]">Unsaved changes</span>
                  <span className={cn("font-semibold", hasUnsavedChanges ? "text-amber-200" : "text-emerald-200")}>{hasUnsavedChanges ? "Yes" : "No"}</span>
                </p>
              </div>
              <div className="mt-3 rounded-xl border border-[#243753] bg-[#0e1d36] px-3 py-2 text-xs text-[#9ab3d8]">
                Last save: {lastSavedLabel}
              </div>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => void saveAttendance("draft")}
                  disabled={!canEdit || !selectedSessionId || saveMode !== null}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#3f5f8f] bg-[#112340] text-sm font-semibold text-[#dbe8ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveMode === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => void saveAttendance("finalize")}
                  disabled={!canEdit || !selectedSessionId || saveMode !== null}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300/45 bg-emerald-500/20 text-sm font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saveMode === "finalize" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Finalize
                </button>
                <button
                  type="button"
                  onClick={printRoster}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#3f5f8f] bg-[#112340] text-sm font-semibold text-[#dbe8ff]"
                >
                  <Printer className="h-4 w-4" />
                  Print Roster
                </button>
                <button
                  type="button"
                  onClick={exportRosterCsv}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#3f5f8f] bg-[#112340] text-sm font-semibold text-[#dbe8ff]"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Follow-Up Suggestions</h3>
              <div className="mt-3 space-y-2">
                {followUpSuggestions.map((item, index) => (
                  <div key={`${item.residentId}-${index}`} className="rounded-xl border border-[#263a59] bg-[#0e1d36] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{item.residentName}</p>
                      {item.room ? (
                        <span className="rounded-full border border-[#3e5b84] bg-[#11223e] px-2 py-0.5 text-[11px] font-semibold text-[#c4d7f7]">
                          {item.room}
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold uppercase tracking-[0.1em]",
                        item.tone === "critical"
                          ? "text-rose-200"
                          : item.tone === "attention"
                            ? "text-amber-200"
                            : "text-blue-200"
                      )}
                    >
                      {item.reason}
                    </p>
                    <p className="mt-1 text-xs text-[#b3c7e8]">{item.hint}</p>
                    <Link href={item.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                      Open action
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a7bce1]">Quick Actions</h3>
              <div className="mt-3 grid gap-2">
                <Link href="/app/calendar" className="inline-flex h-9 items-center justify-between rounded-lg border border-[#35527b] bg-[#0f1d35] px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#dbe8ff]">
                  Open Calendar
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link href="/app/documentation/progress-notes/new" className="inline-flex h-9 items-center justify-between rounded-lg border border-[#35527b] bg-[#0f1d35] px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#dbe8ff]">
                  Add Progress Note
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link href="/app/documentation/one-to-one/new" className="inline-flex h-9 items-center justify-between rounded-lg border border-[#35527b] bg-[#0f1d35] px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#dbe8ff]">
                  Add 1:1 Note
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <Link href="/app/documentation" className="inline-flex h-9 items-center justify-between rounded-lg border border-[#35527b] bg-[#0f1d35] px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#dbe8ff]">
                  Open Documentation
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Recent Attendance Sessions</h3>
                <p className="text-xs text-[#95add5]">Reopen prior sessions or validate completion trends.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loadingHistory}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[#3f5f8f] bg-[#112340] px-3 text-xs font-semibold text-[#dbe8ff] disabled:opacity-60"
              >
                {loadingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck2 className="h-3.5 w-3.5" />}
                Refresh
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Search sessions</span>
                <input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Activity title or location"
                  className="h-10 w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Location</span>
                <select
                  value={historyLocationFilter}
                  onChange={(event) => setHistoryLocationFilter(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-sm text-[#dbe8ff] outline-none"
                >
                  <option value="all">All locations</option>
                  {historyLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#90a8d4]">Window</span>
                <p className="inline-flex h-10 w-full items-center rounded-xl border border-[#35527b] bg-[#0f1d35] px-3 text-xs text-[#c8d9f8]">
                  {formatDateRangeLabel(historyFrom, historyTo, timeZone)}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {historyList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#385176] bg-[#0e1d35] p-4 text-sm text-[#a9bfdf]">
                  <p className="text-base font-semibold text-[#dce8ff]">No recent sessions found</p>
                  <p className="mt-1">Adjust the history filters or date range to load prior attendance sessions.</p>
                </div>
              ) : (
                historyList.map((session) => (
                  <div key={session.id} className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{session.title}</p>
                        <p className="text-xs text-[#9ab3d8]">{formatActifyDateTime(new Date(session.startAt), timeZone)} · {session.location}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#35527b] bg-[#10213e] px-2 py-0.5 text-[11px] font-semibold text-[#cfe0ff]">
                          {session.completionPercent.toFixed(0)}% complete
                        </span>
                        <button
                          type="button"
                          onClick={() => void openHistorySession(session)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#3f5f8f] bg-[#112340] px-2.5 text-xs font-semibold text-[#dbe8ff]"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#b3c7e8]">
                      <span>Present {session.counts.present}</span>
                      <span>Refused {session.counts.refused}</span>
                      <span>Asleep {session.counts.asleep}</span>
                      <span>Out {session.counts.outOfRoom}</span>
                      <span>1:1 {session.counts.oneToOne}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#2a3f62] bg-[#091427]/95 p-4">
            <h3 className="text-base font-semibold text-white">Attendance Insights</h3>
            <p className="text-xs text-[#95add5]">Current-session completion and integration pathways.</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#8fa9d3]">Unmarked Residents</p>
                <p className="mt-1 text-2xl font-black text-white">{unmarkedCount}</p>
                <p className="text-xs text-[#b3c7e8]">Residents still needing a status for this session.</p>
              </div>
              <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#8fa9d3]">Flagged Follow-Ups</p>
                <p className="mt-1 text-2xl font-black text-white">{followUpSuggestions.filter((item) => item.residentId).length}</p>
                <p className="text-xs text-[#b3c7e8]">Residents with refusal/in-room/asleep signals.</p>
              </div>
              <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#8fa9d3]">Calendar Link</p>
                <p className="mt-1 text-sm text-[#d7e4fd]">Attendance is connected to daily schedule events.</p>
                <Link href={`/app/calendar?view=day&date=${dateKey}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                  Open day schedule
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="rounded-xl border border-[#243753] bg-[#0e1d36] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#8fa9d3]">Documentation Link</p>
                <p className="mt-1 text-sm text-[#d7e4fd]">Launch progress and 1:1 notes directly from attendance outcomes.</p>
                <Link href="/app/documentation" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100">
                  Open documentation hub
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
