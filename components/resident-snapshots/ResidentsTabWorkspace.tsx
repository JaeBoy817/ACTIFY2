"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AddResidentDrawerSimple } from "@/components/resident-snapshots/AddResidentDrawerSimple";
import type { BulkResidentParticipationPayload, ResidentAttendanceWorkflowPayload } from "@/components/resident-snapshots/attendanceTypes";
import { ArchiveResidentModal } from "@/components/resident-snapshots/ArchiveResidentModal";
import { FollowUpModal, type FollowUpDraft } from "@/components/resident-snapshots/FollowUpModal";
import { ResidentCardListRow } from "@/components/resident-snapshots/ResidentCardListRow";
import { ResidentCardSimple } from "@/components/resident-snapshots/ResidentCardSimple";
import { ResidentDetailDrawer } from "@/components/resident-snapshots/ResidentDetailDrawer";
import { ResidentsBulkActionBar } from "@/components/resident-snapshots/ResidentsBulkActionBar";
import { ResidentsControlBar } from "@/components/resident-snapshots/ResidentsControlBar";
import { ResidentsPageHeader } from "@/components/resident-snapshots/ResidentsPageHeader";
import {
  appendArchiveContext,
  buildAssistantPrompt,
  fromResidentRow,
  getSnapshotActions,
  residentMatchesFilter,
  residentMatchesSearch,
  toDraftPayload,
  toSnapshotCollection
} from "@/components/resident-snapshots/helpers";
import { MOCK_RESIDENT_SNAPSHOTS } from "@/components/resident-snapshots/mockSnapshots";
import type {
  ArchiveReason,
  ResidentSnapshot,
  ResidentSnapshotFormValue,
  SnapshotFilterKey,
  SnapshotIntentAction,
  SnapshotViewKey
} from "@/components/resident-snapshots/types";
import type { ResidentListRow } from "@/lib/residents/types";
import { ActionButton, EmptyStateCard, QuickActionMenu } from "@/components/workspace/shared";
import { cn } from "@/lib/utils";
import { TrackAttendanceModal } from "@/components/resident-snapshots/TrackAttendanceModal";

type SortKey =
  | "NAME"
  | "ROOM"
  | "RECENT"
  | "ADMISSION"
  | "BIRTHDAY"
  | "LAST_ENGAGEMENT"
  | "FOLLOW_UP"
  | "PARTICIPATION_HIGH"
  | "PARTICIPATION_LOW"
  | "MOST_MISSED"
  | "RECENT_1TO1"
  | "MOST_RECENT_ATTENDANCE"
  | "MOST_1TO1_COMPLETIONS"
  | "MOST_REFUSALS";

type DisplayMode = "GRID" | "LIST";

const CORE_FILTERS: Array<{ key: SnapshotFilterKey; label: string }> = [
  { key: "ACTIVE", label: "Active" },
  { key: "NEEDS_FOLLOW_UP", label: "Needs Follow-Up" },
  { key: "PREFERS_1TO1", label: "Prefers 1:1" },
  { key: "BED_BOUND", label: "Bed-Bound" },
  { key: "ARCHIVED", label: "Archived" }
];

const MORE_FILTERS: Array<{ key: SnapshotFilterKey; label: string }> = [
  { key: "NEW_ADMISSIONS", label: "New Admission" },
  { key: "GROUP_FRIENDLY", label: "Group-Friendly" },
  { key: "NEEDS_ENCOURAGEMENT", label: "Needs Encouragement" },
  { key: "QUIET_LOW_STIM", label: "Quiet Setting" },
  { key: "HIGH_PARTICIPATION", label: "High Participation" },
  { key: "LOW_PARTICIPATION", label: "Low Participation" },
  { key: "SMALL_GROUP", label: "Small Group Preference" },
  { key: "MORNING", label: "Morning Preference" },
  { key: "AFTERNOON", label: "Afternoon Preference" },
  { key: "LOW_ENERGY", label: "Low Energy" },
  { key: "SENSORY_FRIENDLY", label: "Sensory-Friendly" },
  { key: "SOCIAL", label: "Social" },
  { key: "QUIET_RESERVED", label: "Quiet / Reserved" },
  { key: "MUSIC", label: "Music" },
  { key: "BINGO", label: "Bingo" },
  { key: "SPORTS", label: "Sports" },
  { key: "BIBLE_STUDY", label: "Bible Study" },
  { key: "CRAFTS", label: "Crafts" },
  { key: "NAIL_CARE", label: "Nail Care" },
  { key: "MOVIES_TV", label: "Movies / TV" },
  { key: "WORD_SEARCHES", label: "Word Searches" },
  { key: "PUZZLES", label: "Puzzles" },
  { key: "PARTICIPATION_BELOW_25", label: "Participation Below 25%" },
  { key: "PARTICIPATION_BELOW_50", label: "Participation Below 50%" },
  { key: "ATTENDANCE_IMPROVING", label: "Participation Improving" },
  { key: "FREQUENT_REFUSAL", label: "Frequent Refusals" },
  { key: "MISSED_RECENT_GROUP", label: "Missed Recent Activities" },
  { key: "MOSTLY_1TO1_PARTICIPATION", label: "Mostly 1:1 Participation" },
  { key: "NO_ATTENDANCE_THIS_MONTH", label: "No Attendance Logged This Month" },
  { key: "ONE_TO_ONE_PRIORITY", label: "1:1 Priority" },
  { key: "ATTENDANCE_BELOW_GOAL", label: "Attendance Below Goal" },
  { key: "INCONSISTENT_PARTICIPATION", label: "Inconsistent Participation" }
];

function isArchivedStatus(status: ResidentSnapshot["status"]) {
  return status === "DISCHARGED" || status === "TRANSFERRED" || status === "DECEASED";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && typeof data.error === "string" && data.error) || "Request failed.");
  }
  return data;
}

function compareNullableDate(a: string | null, b: string | null, direction: "asc" | "desc" = "asc") {
  const parsedA = a ? new Date(a).getTime() : Number.NaN;
  const parsedB = b ? new Date(b).getTime() : Number.NaN;
  const safeA = Number.isFinite(parsedA) ? parsedA : direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
  const safeB = Number.isFinite(parsedB) ? parsedB : direction === "asc" ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
  return direction === "asc" ? safeA - safeB : safeB - safeA;
}

function priorityValue(priority: ResidentSnapshot["followUpPriority"]) {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  if (priority === "LOW") return 2;
  return 3;
}

function getBirthdayUpcomingScore(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  const now = new Date();
  const currentYearBirthday = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  const nextBirthday = currentYearBirthday < now ? new Date(now.getFullYear() + 1, date.getMonth(), date.getDate()) : currentYearBirthday;
  return nextBirthday.getTime() - now.getTime();
}

function toLocalSnapshot(form: ResidentSnapshotFormValue): ResidentSnapshot {
  const draft = toDraftPayload(form);
  const [firstName = "Resident", ...rest] = form.fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || "Profile";

  return {
    id: `local-${crypto.randomUUID()}`,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    preferredName: form.preferredName || null,
    room: form.room,
    status: draft.status,
    admissionDate: draft.admissionDate ? `${draft.admissionDate}T00:00:00.000Z` : null,
    birthDate: draft.birthDate ? `${draft.birthDate}T00:00:00.000Z` : null,
    tags: draft.tags,
    interests: draft.preferences ? draft.preferences.split("\n").slice(0, 2).map((line) => line.replace(/^.*:\s*/, "")) : [],
    dislikes: [],
    favoriteActivities: [],
    favoriteTopics: [],
    favoriteMusic: [],
    favoriteMedia: [],
    independentActivities: [],
    participationStyle: form.participationStyle || "Snapshot created. Add engagement details when available.",
    bestTimeOfDay: form.bestTimeOfDay || "Not set",
    groupParticipationNotes: form.groupParticipationNotes,
    oneToOneStyle: form.oneToOneStyle,
    commonRefusals: form.commonRefusals,
    whatWorks: form.whatWorks,
    whatDoesNotWork: form.whatDoesNotWork,
    supportNeeds: form.supportNeeds,
    quickSummary: form.participationStyle || "Snapshot created",
    sourceNotes: draft.notes,
    sourcePreferences: draft.preferences,
    sourceSafetyNotes: draft.safetyNotes,
    lastEngagementDate: null,
    lastActivity: null,
    lastOneToOne: null,
    lastNoteDate: null,
    lastAiSuggestion: null,
    lastSuccessfulActivityType: null,
    followUpRequired: false,
    followUpDate: null,
    followUpPriority: null,
    dischargeDate: null,
    dischargeReason: null,
    totalActivitiesOffered: 0,
    totalActivitiesAttended: 0,
    participationPercentage: null,
    attendanceCount: 0,
    oneToOneCount: 0,
    refusalCount: 0,
    missedActivitiesCount: 0,
    totalTrackedOpportunitiesThisMonth: 0,
    attendedCountThisMonth: 0,
    oneToOneCompletedCountThisMonth: 0,
    refusalCountThisMonth: 0,
    missedCountThisMonth: 0,
    noAttendanceLoggedThisMonth: true,
    mostlyOneToOneParticipation: false,
    lastAttendanceDate: null,
    last30DayParticipation: null,
    last90DayParticipation: null,
    yearToDateParticipation: null,
    attendanceByActivityType: [],
    lastParticipationTrend: "flat"
  };
}

export function ResidentsTabWorkspace({ initialResidents, canEdit }: { initialResidents: ResidentListRow[]; canEdit: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSnapshots = useMemo(() => toSnapshotCollection(initialResidents), [initialResidents]);
  const actions = useMemo(() => getSnapshotActions(), []);

  const [residents, setResidents] = useState<ResidentSnapshot[]>(
    initialSnapshots.length > 0 ? initialSnapshots : MOCK_RESIDENT_SNAPSHOTS
  );
  const [isDemoSeed, setIsDemoSeed] = useState(initialSnapshots.length === 0);

  const [view, setView] = useState<SnapshotViewKey>("ACTIVE");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SnapshotFilterKey[]>([]);
  const [sort, setSort] = useState<SortKey>("NAME");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("GRID");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [trackAttendanceOpen, setTrackAttendanceOpen] = useState(false);
  const [trackResidentId, setTrackResidentId] = useState<string | null>(null);
  const [attendanceRefreshToken, setAttendanceRefreshToken] = useState(0);

  const [isSavingResident, setIsSavingResident] = useState(false);
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingParticipation, setIsLoadingParticipation] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const visibleResidents = useMemo(() => {
    const viewScoped = residents.filter((resident) =>
      view === "ARCHIVED" ? isArchivedStatus(resident.status) : !isArchivedStatus(resident.status)
    );

    const filtered = viewScoped.filter((resident) => {
      if (!residentMatchesSearch(resident, search)) return false;
      if (filters.length === 0) return true;
      return filters.every((filter) => residentMatchesFilter(resident, filter));
    });

    return filtered.slice().sort((a, b) => {
      switch (sort) {
        case "ROOM":
          return a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" });
        case "RECENT":
          return compareNullableDate(a.admissionDate, b.admissionDate, "desc");
        case "ADMISSION":
          return compareNullableDate(a.admissionDate, b.admissionDate, "asc");
        case "BIRTHDAY":
          return getBirthdayUpcomingScore(a.birthDate) - getBirthdayUpcomingScore(b.birthDate);
        case "LAST_ENGAGEMENT":
          return compareNullableDate(a.lastEngagementDate, b.lastEngagementDate, "desc");
        case "FOLLOW_UP":
          return priorityValue(a.followUpPriority) - priorityValue(b.followUpPriority);
        case "PARTICIPATION_HIGH":
          return (b.participationPercentage ?? b.last30DayParticipation ?? 0) - (a.participationPercentage ?? a.last30DayParticipation ?? 0);
        case "PARTICIPATION_LOW":
          return (a.participationPercentage ?? a.last30DayParticipation ?? 0) - (b.participationPercentage ?? b.last30DayParticipation ?? 0);
        case "MOST_MISSED":
          return (b.missedCountThisMonth ?? b.missedActivitiesCount ?? 0) - (a.missedCountThisMonth ?? a.missedActivitiesCount ?? 0);
        case "RECENT_1TO1":
          return compareNullableDate(a.lastOneToOne, b.lastOneToOne, "desc");
        case "MOST_RECENT_ATTENDANCE":
          return compareNullableDate(a.lastAttendanceDate ?? null, b.lastAttendanceDate ?? null, "desc");
        case "MOST_1TO1_COMPLETIONS":
          return (b.oneToOneCompletedCountThisMonth ?? b.oneToOneCount ?? 0) - (a.oneToOneCompletedCountThisMonth ?? a.oneToOneCount ?? 0);
        case "MOST_REFUSALS":
          return (b.refusalCountThisMonth ?? b.refusalCount ?? 0) - (a.refusalCountThisMonth ?? a.refusalCount ?? 0);
        case "NAME":
        default:
          return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
      }
    });
  }, [filters, residents, search, sort, view]);

  const selectedResident = useMemo(() => {
    if (selectedResidentId) {
      const directMatch = residents.find((resident) => resident.id === selectedResidentId) ?? null;
      if (directMatch) return directMatch;
    }
    return visibleResidents[0] ?? null;
  }, [residents, selectedResidentId, visibleResidents]);

  const trackedResident = useMemo(() => {
    if (trackResidentId) {
      return residents.find((resident) => resident.id === trackResidentId) ?? null;
    }
    return selectedResident;
  }, [residents, selectedResident, trackResidentId]);

  useEffect(() => {
    const residentParam = searchParams.get("resident") || searchParams.get("residentId");
    const viewParam = searchParams.get("view");

    if (residentParam) {
      setSelectedResidentId(residentParam);
      setDetailOpen(true);
    }

    if (viewParam === "archived") {
      setView("ARCHIVED");
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedResidentId && residents.some((resident) => resident.id === selectedResidentId)) return;
    setSelectedResidentId(visibleResidents[0]?.id ?? null);
  }, [residents, selectedResidentId, visibleResidents]);

  useEffect(() => {
    if (!bulkMode) {
      setSelectedIds([]);
    }
  }, [bulkMode]);

  const residentIdSignature = useMemo(
    () =>
      residents
        .map((resident) => resident.id)
        .sort((a, b) => a.localeCompare(b))
        .join("|"),
    [residents]
  );

  async function refreshResidents() {
    setIsRefreshing(true);
    try {
      const payload = (await fetchJson("/api/residents?includeAll=true")) as { residents?: ResidentListRow[] };
      const next = Array.isArray(payload.residents) ? toSnapshotCollection(payload.residents) : [];
      if (next.length > 0) {
        setResidents(next);
        setIsDemoSeed(false);
      } else if (!isDemoSeed) {
        setResidents(MOCK_RESIDENT_SNAPSHOTS);
        setIsDemoSeed(true);
      }
      await refreshParticipationSummaries();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setIsRefreshing(false);
    }
  }

  function getAction(id: string) {
    return actions.find((action) => action.id === id) ?? actions[0];
  }

  const applyParticipationSummaries = useCallback((payload: BulkResidentParticipationPayload) => {
    const summaryMap = new Map(payload.summaries.map((summary) => [summary.residentId, summary]));
    setResidents((current) =>
      current.map((resident) => {
        const summary = summaryMap.get(resident.id);
        if (!summary) {
          return {
            ...resident,
            totalTrackedOpportunitiesThisMonth: 0,
            attendedCountThisMonth: 0,
            oneToOneCompletedCountThisMonth: 0,
            refusalCountThisMonth: 0,
            missedCountThisMonth: 0,
            totalActivitiesOffered: 0,
            totalActivitiesAttended: 0,
            participationPercentage: null,
            attendanceCount: 0,
            oneToOneCount: 0,
            refusalCount: 0,
            missedActivitiesCount: 0,
            noAttendanceLoggedThisMonth: true,
            mostlyOneToOneParticipation: false,
            lastAttendanceDate: null,
            lastParticipationTrend: "flat"
          };
        }

        return {
          ...resident,
          totalTrackedOpportunitiesThisMonth: summary.totalTrackedOpportunities,
          attendedCountThisMonth: summary.attendedCount,
          oneToOneCompletedCountThisMonth: summary.oneToOneCompletedCount,
          refusalCountThisMonth: summary.refusalCount,
          missedCountThisMonth: summary.missedCount,
          totalActivitiesOffered: summary.totalTrackedOpportunities,
          totalActivitiesAttended: summary.participatedCount,
          participationPercentage: summary.participationPercentage,
          attendanceCount: summary.attendedCount,
          oneToOneCount: summary.oneToOneCompletedCount,
          refusalCount: summary.refusalCount,
          missedActivitiesCount: summary.missedCount,
          noAttendanceLoggedThisMonth: summary.totalTrackedOpportunities === 0,
          mostlyOneToOneParticipation:
            summary.oneToOneCompletedCount > 0 && summary.oneToOneCompletedCount > summary.attendedCount,
          lastAttendanceDate: summary.lastTrackedAt,
          lastParticipationTrend: summary.trend
        };
      })
    );
  }, []);

  const refreshParticipationSummaries = useCallback(async () => {
    setIsLoadingParticipation(true);
    try {
      const payload = (await fetchJson(
        "/api/attendance/residents/participation?timeframe=THIS_MONTH"
      )) as BulkResidentParticipationPayload;
      if (payload.ok) {
        applyParticipationSummaries(payload);
      }
    } catch {
      // Keep resident cards usable even if attendance summary is temporarily unavailable.
    } finally {
      setIsLoadingParticipation(false);
    }
  }, [applyParticipationSummaries]);

  useEffect(() => {
    if (!residentIdSignature) return;
    void refreshParticipationSummaries();
  }, [refreshParticipationSummaries, residentIdSignature]);

  function launchAssistant(action: SnapshotIntentAction, resident: ResidentSnapshot) {
    const prompt = buildAssistantPrompt(action, resident);
    router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
  }

  function toggleFilter(filter: SnapshotFilterKey) {
    if (filter === "ACTIVE") {
      setView("ACTIVE");
      return;
    }
    if (filter === "ARCHIVED") {
      setView("ARCHIVED");
      return;
    }

    setFilters((current) =>
      current.includes(filter) ? current.filter((entry) => entry !== filter) : [...current, filter]
    );
  }

  function clearMoreFilters() {
    setFilters((current) => current.filter((entry) => !MORE_FILTERS.some((option) => option.key === entry)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function openCreateDrawer() {
    setDrawerMode("create");
    setDrawerOpen(true);
  }

  function openEditDrawer() {
    if (!selectedResident) return;
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  function openTrackAttendance(residentId: string) {
    setTrackResidentId(residentId);
    setSelectedResidentId(residentId);
    setTrackAttendanceOpen(true);
  }

  function handleAttendanceSaved(payload: ResidentAttendanceWorkflowPayload) {
    setResidents((current) =>
      current.map((resident) =>
        resident.id === payload.resident.id
          ? {
              ...resident,
              totalTrackedOpportunitiesThisMonth: payload.summary.totalTrackedOpportunities,
              attendedCountThisMonth: payload.summary.attendedCount,
              oneToOneCompletedCountThisMonth: payload.summary.oneToOneCompletedCount,
              refusalCountThisMonth: payload.summary.refusalCount,
              missedCountThisMonth: payload.summary.missedCount,
              totalActivitiesOffered: payload.summary.totalTrackedOpportunities,
              totalActivitiesAttended: payload.summary.participatedCount,
              participationPercentage: payload.summary.participationPercentage,
              attendanceCount: payload.summary.attendedCount,
              oneToOneCount: payload.summary.oneToOneCompletedCount,
              refusalCount: payload.summary.refusalCount,
              missedActivitiesCount: payload.summary.missedCount,
              noAttendanceLoggedThisMonth: payload.summary.totalTrackedOpportunities === 0,
              mostlyOneToOneParticipation:
                payload.summary.oneToOneCompletedCount > 0 &&
                payload.summary.oneToOneCompletedCount > payload.summary.attendedCount,
              lastAttendanceDate: payload.summary.lastTrackedAt,
              lastParticipationTrend: payload.summary.trend,
              lastActivity: payload.records[0]?.activityTitle ?? resident.lastActivity,
              lastEngagementDate: payload.summary.lastTrackedAt ?? resident.lastEngagementDate
            }
          : resident
      )
    );
    setAttendanceRefreshToken((current) => current + 1);
    setFeedback({ tone: "success", text: "Attendance updated." });
    void refreshParticipationSummaries();
  }

  async function handleSaveResident(form: ResidentSnapshotFormValue) {
    setIsSavingResident(true);
    setFeedback(null);

    try {
      const draft = toDraftPayload(form);
      if (drawerMode === "create") {
        const payload = (await fetchJson("/api/residents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft)
        })) as { resident?: ResidentListRow };

        if (!payload.resident) throw new Error("Resident could not be created.");

        const created = fromResidentRow(payload.resident);
        setResidents((current) => [created, ...current.filter((item) => !item.id.startsWith("mock-"))]);
        setSelectedResidentId(created.id);
        setFeedback({ tone: "success", text: "Resident saved." });
        setIsDemoSeed(false);
      } else {
        if (!selectedResident) throw new Error("Select a resident to edit.");

        const payload = (await fetchJson(`/api/residents/${selectedResident.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft)
        })) as { resident?: ResidentListRow };

        if (!payload.resident) throw new Error("Resident could not be updated.");

        const updated = fromResidentRow(payload.resident);
        setResidents((current) => current.map((resident) => (resident.id === updated.id ? updated : resident)));
        setSelectedResidentId(updated.id);
        setFeedback({ tone: "success", text: "Resident updated." });
      }

      setDrawerOpen(false);
      await refreshResidents();
    } catch (error) {
      if (isDemoSeed) {
        const local = toLocalSnapshot(form);
        setResidents((current) => [local, ...current]);
        setSelectedResidentId(local.id);
        setDrawerOpen(false);
        setFeedback({ tone: "success", text: "Saved locally for demo mode." });
      } else {
        setFeedback({ tone: "error", text: getErrorMessage(error) });
      }
    } finally {
      setIsSavingResident(false);
    }
  }

  async function handleSaveAndAskActify(form: ResidentSnapshotFormValue) {
    await handleSaveResident(form);
    const target = selectedResident ?? toLocalSnapshot(form);
    launchAssistant(getAction("idea-1to1"), target);
  }

  async function handleArchiveConfirm(input: { date: string; reason: ArchiveReason; note: string }) {
    if (!selectedResident) return;
    setIsArchiveSubmitting(true);

    try {
      const archiveNotes = appendArchiveContext({
        existingNotes: selectedResident.sourceNotes,
        date: input.date,
        reason: input.reason,
        note: input.note
      });

      await fetchJson(`/api/residents/${selectedResident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: archiveNotes,
          tags: Array.from(new Set([...selectedResident.tags, `Archive: ${input.reason}`]))
        })
      });

      const payload = (await fetchJson(`/api/residents/${selectedResident.id}/archive`, {
        method: "POST"
      })) as { resident?: ResidentListRow };

      if (!payload.resident) throw new Error("Resident could not be archived.");

      const archived = fromResidentRow(payload.resident);
      archived.dischargeDate = input.date;
      archived.dischargeReason = input.reason;

      setResidents((current) => current.map((resident) => (resident.id === archived.id ? archived : resident)));
      setSelectedResidentId(archived.id);
      setView("ARCHIVED");
      setArchiveOpen(false);
      setFeedback({ tone: "success", text: `${archived.fullName} archived.` });
      await refreshResidents();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setIsArchiveSubmitting(false);
    }
  }

  async function handleRestoreResident() {
    if (!selectedResident) return;
    setIsArchiveSubmitting(true);

    try {
      const payload = (await fetchJson(`/api/residents/${selectedResident.id}/restore`, {
        method: "POST"
      })) as { resident?: ResidentListRow };

      if (!payload.resident) throw new Error("Resident could not be restored.");

      const restored = fromResidentRow(payload.resident);
      setResidents((current) => current.map((resident) => (resident.id === restored.id ? restored : resident)));
      setSelectedResidentId(restored.id);
      setView("ACTIVE");
      setFeedback({ tone: "success", text: `${restored.fullName} restored.` });
      await refreshResidents();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setIsArchiveSubmitting(false);
    }
  }

  async function saveFollowUp(draft: FollowUpDraft, askActifyAfterSave: boolean) {
    if (!selectedResident) return;
    if (!draft.date.trim()) {
      setFeedback({ tone: "error", text: "Select a follow-up date before saving." });
      return;
    }

    try {
      const noteBlock = [
        selectedResident.sourceNotes ?? "",
        `Follow-Up Date: ${draft.date}`,
        `Follow-Up Priority: ${draft.priority}`,
        draft.reason ? `Follow-Up Reason: ${draft.reason}` : "",
        draft.note ? `Follow-Up Note: ${draft.note}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      await fetchJson(`/api/residents/${selectedResident.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          notes: noteBlock,
          followUpFlag: true
        })
      });

      setResidents((current) =>
        current.map((resident) =>
          resident.id === selectedResident.id
            ? {
                ...resident,
                followUpRequired: true,
                followUpDate: draft.date,
                followUpPriority: draft.priority,
                sourceNotes: noteBlock
              }
            : resident
        )
      );

      setFollowUpOpen(false);
      setFeedback({ tone: "success", text: "Follow-up saved." });
      await refreshResidents();

      if (askActifyAfterSave) {
        const action = getAction("follow-up");
        launchAssistant(action, {
          ...selectedResident,
          followUpRequired: true,
          followUpDate: draft.date,
          followUpPriority: draft.priority
        });
      }
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    }
  }

  const selectedResidentsForBulk = residents.filter((resident) => selectedIds.includes(resident.id));

  return (
    <section className="space-y-4" aria-label="Residents workspace">
      <ResidentsPageHeader
        onAddResident={openCreateDrawer}
        onViewArchived={() => setView("ARCHIVED")}
        moreMenu={
          <QuickActionMenu
            label="More"
            actions={[
              {
                id: "import",
                label: "Import CSV",
                onClick: () => setFeedback({ tone: "success", text: "Import flow is available in resident tools." })
              },
              {
                id: "export",
                label: "Export Resident Snapshots",
                onClick: () => setFeedback({ tone: "success", text: "Resident snapshot export prepared." })
              },
              {
                id: "refresh",
                label: isRefreshing ? "Refreshing..." : "Refresh Residents",
                onClick: () => {
                  void refreshResidents();
                }
              }
            ]}
          />
        }
      />

      {feedback ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-2 text-sm",
            feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {feedback.text}
        </div>
      ) : null}

      <ResidentsControlBar
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        activeFilters={[...(view === "ACTIVE" ? (["ACTIVE"] as SnapshotFilterKey[]) : (["ARCHIVED"] as SnapshotFilterKey[])), ...filters]}
        onToggleFilter={toggleFilter}
        coreFilters={CORE_FILTERS}
        moreFilters={MORE_FILTERS}
        onClearMoreFilters={clearMoreFilters}
        viewMode={displayMode}
        onViewMode={setDisplayMode}
        onToggleBulkMode={() => setBulkMode((current) => !current)}
        bulkMode={bulkMode}
      />

      {bulkMode && selectedIds.length > 0 ? (
        <ResidentsBulkActionBar
          count={selectedIds.length}
          onAddTag={() => setFeedback({ tone: "success", text: "Bulk tag flow opened." })}
          onAddFollowUp={() => setFollowUpOpen(true)}
          onAskActify={() => {
            const prompt = `Help me prioritize these residents: ${selectedResidentsForBulk.map((resident) => resident.fullName).join(", ")}.`;
            router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
          }}
          onArchive={() => setFeedback({ tone: "success", text: "Bulk archive flow started." })}
          onExportSummaries={() => setFeedback({ tone: "success", text: "Resident summary export prepared." })}
          onExportParticipation={() => setFeedback({ tone: "success", text: "Participation snapshot export prepared." })}
        />
      ) : null}

      <section className="space-y-3" aria-label="Resident cards">
        {visibleResidents.length === 0 ? (
          residents.length === 0 ? (
            <EmptyStateCard
              title="No residents yet"
              description="No residents yet. Add your first resident to start building smarter activity support."
              action={
                canEdit ? (
                  <ActionButton onClick={openCreateDrawer}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add Resident
                  </ActionButton>
                ) : undefined
              }
            />
          ) : view === "ARCHIVED" ? (
            <EmptyStateCard title="No archived residents yet" description="No archived residents yet." />
          ) : (
            <EmptyStateCard title="No matches found" description="No residents match that search. Try a different name, room number, or tag." />
          )
        ) : displayMode === "GRID" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleResidents.map((resident) => (
              <ResidentCardSimple
                key={resident.id}
                resident={resident}
                selected={selectedResident?.id === resident.id}
                onSelect={() => {
                  setSelectedResidentId(resident.id);
                }}
                onAskActify={() => launchAssistant(getAction("idea-1to1"), resident)}
                onTrackAttendance={() => openTrackAttendance(resident.id)}
                onViewDetails={() => {
                  setSelectedResidentId(resident.id);
                  setDetailOpen(true);
                }}
                moreActions={[
                  {
                    id: `edit-${resident.id}`,
                    label: "Edit Resident",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      openEditDrawer();
                    }
                  },
                  {
                    id: `follow-up-${resident.id}`,
                    label: "Add Follow-Up",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      setFollowUpOpen(true);
                    }
                  },
                  {
                    id: `track-${resident.id}`,
                    label: "Track Attendance",
                    onClick: () => openTrackAttendance(resident.id)
                  },
                  {
                    id: `draft-note-${resident.id}`,
                    label: "Draft Note",
                    onClick: () => launchAssistant(getAction("note-progress"), resident)
                  },
                  {
                    id: `archive-${resident.id}`,
                    label: isArchivedStatus(resident.status) ? "Restore Resident" : "Archive / Discharge",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      if (isArchivedStatus(resident.status)) {
                        void handleRestoreResident();
                        return;
                      }
                      setArchiveOpen(true);
                    }
                  },
                  {
                    id: `analytics-${resident.id}`,
                    label: "View Engagement Analytics",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      setDetailOpen(true);
                    }
                  }
                ]}
                showCheckbox={bulkMode}
                checked={selectedIds.includes(resident.id)}
                onToggleChecked={() => toggleSelect(resident.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleResidents.map((resident) => (
              <ResidentCardListRow
                key={resident.id}
                resident={resident}
                selected={selectedResident?.id === resident.id}
                onSelect={() => {
                  setSelectedResidentId(resident.id);
                }}
                onAskActify={() => launchAssistant(getAction("idea-1to1"), resident)}
                onTrackAttendance={() => openTrackAttendance(resident.id)}
                onViewDetails={() => {
                  setSelectedResidentId(resident.id);
                  setDetailOpen(true);
                }}
                moreActions={[
                  {
                    id: `edit-list-${resident.id}`,
                    label: "Edit Resident",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      openEditDrawer();
                    }
                  },
                  {
                    id: `follow-up-list-${resident.id}`,
                    label: "Add Follow-Up",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      setFollowUpOpen(true);
                    }
                  },
                  {
                    id: `track-list-${resident.id}`,
                    label: "Track Attendance",
                    onClick: () => openTrackAttendance(resident.id)
                  },
                  {
                    id: `archive-list-${resident.id}`,
                    label: isArchivedStatus(resident.status) ? "Restore Resident" : "Archive / Discharge",
                    onClick: () => {
                      setSelectedResidentId(resident.id);
                      if (isArchivedStatus(resident.status)) {
                        void handleRestoreResident();
                        return;
                      }
                      setArchiveOpen(true);
                    }
                  }
                ]}
                showCheckbox={bulkMode}
                checked={selectedIds.includes(resident.id)}
                onToggleChecked={() => toggleSelect(resident.id)}
              />
            ))}
          </div>
        )}

        {isDemoSeed ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Demo seed data is shown because no resident rows were found yet. Add a resident to start building live snapshots.
          </p>
        ) : null}
      </section>

      <ResidentDetailDrawer
        open={detailOpen}
        resident={selectedResident}
        actions={actions}
        onClose={() => setDetailOpen(false)}
        onAskActify={(action) => {
          if (!selectedResident) return;
          launchAssistant(action, selectedResident);
        }}
        onEdit={openEditDrawer}
        onArchive={() => {
          if (!selectedResident) return;
          if (isArchivedStatus(selectedResident.status)) {
            void handleRestoreResident();
            return;
          }
          setArchiveOpen(true);
        }}
        onAddFollowUp={() => setFollowUpOpen(true)}
        onTrackAttendance={() => {
          if (!selectedResident) return;
          openTrackAttendance(selectedResident.id);
        }}
        attendanceRefreshToken={attendanceRefreshToken}
      />

      <AddResidentDrawerSimple
        open={drawerOpen}
        mode={drawerMode}
        resident={drawerMode === "edit" ? selectedResident : null}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveResident}
        onSaveAndAskActify={handleSaveAndAskActify}
        isSaving={isSavingResident}
      />

      <ArchiveResidentModal
        open={archiveOpen}
        resident={selectedResident}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchiveConfirm}
        isSubmitting={isArchiveSubmitting}
      />

      <FollowUpModal
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        onSave={(draft) => {
          void saveFollowUp(draft, false);
        }}
        onSaveAndAskActify={(draft) => {
          void saveFollowUp(draft, true);
        }}
        initialValue={{
          date: selectedResident?.followUpDate ?? "",
          priority: selectedResident?.followUpPriority ?? "MEDIUM",
          reason: "",
          note: ""
        }}
      />

      <TrackAttendanceModal
        open={trackAttendanceOpen}
        resident={trackedResident}
        onClose={() => {
          setTrackAttendanceOpen(false);
          setTrackResidentId(null);
        }}
        onSaved={handleAttendanceSaved}
        onSaveAndAskActify={() => {
          if (!trackedResident) return;
          launchAssistant(getAction("analytics-participation-boost"), trackedResident);
        }}
      />

      <button
        type="button"
        onClick={() => {
          void refreshResidents();
        }}
        className="fixed bottom-5 right-5 inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
      >
        <RefreshCcw className={cn("h-4 w-4", isRefreshing ? "animate-spin" : "")} aria-hidden />
        {isLoadingParticipation ? "Refreshing Metrics..." : "Refresh"}
      </button>
    </section>
  );
}
