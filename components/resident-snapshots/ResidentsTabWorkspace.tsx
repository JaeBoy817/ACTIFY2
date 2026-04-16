"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardPenLine, Plus, RefreshCcw, Sparkles, Users, UserSquare2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AddResidentDrawer } from "@/components/resident-snapshots/AddResidentDrawer";
import { ArchiveResidentModal } from "@/components/resident-snapshots/ArchiveResidentModal";
import {
  appendArchiveContext,
  buildAssistantPrompt,
  fromResidentRow,
  getSnapshotActions,
  getSnapshotFiltersForView,
  residentMatchesFilter,
  residentMatchesSearch,
  toDraftPayload,
  toSnapshotCollection,
  toRelativeDayLabel
} from "@/components/resident-snapshots/helpers";
import { MOCK_RESIDENT_SNAPSHOTS } from "@/components/resident-snapshots/mockSnapshots";
import { ResidentSnapshotPanel } from "@/components/resident-snapshots/ResidentSnapshotPanel";
import type {
  ArchiveReason,
  ResidentSnapshot,
  ResidentSnapshotFormValue,
  SnapshotFilterKey,
  SnapshotIntentAction,
  SnapshotViewKey
} from "@/components/resident-snapshots/types";
import type { ResidentListRow } from "@/lib/residents/types";
import { toResidentStatusLabel } from "@/lib/residents/types";
import {
  ActionButton,
  EmptyStateCard,
  EntityCard,
  FilterChips,
  ModalShell,
  PageHeader,
  PageSubheader,
  QuickActionMenu,
  SearchInput,
  SortDropdown,
  StatusBadge,
  StickyActionBar,
  SummaryStatCard,
  TagChip
} from "@/components/workspace/shared";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { key: "NAME", label: "Name A-Z" },
  { key: "ROOM", label: "Room Number" },
  { key: "RECENT", label: "Most Recently Added" },
  { key: "ADMISSION", label: "Admission Date" },
  { key: "BIRTHDAY", label: "Birthday" },
  { key: "LAST_ENGAGEMENT", label: "Last Engagement Date" },
  { key: "FOLLOW_UP", label: "Follow-Up Priority" }
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

type DisplayMode = "GRID" | "LIST";

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
  const firstTag = draft.tags[0] ?? "Snapshot";
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
    interests: draft.preferences ? draft.preferences.split("\n").slice(0, 2).map((line) => line.replace(/^.*:\s*/, "")) : [firstTag],
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
    dischargeReason: null
  };
}

function nextBirthdays(residents: ResidentSnapshot[]) {
  return residents
    .filter((resident) => resident.birthDate)
    .sort((a, b) => getBirthdayUpcomingScore(a.birthDate) - getBirthdayUpcomingScore(b.birthDate))
    .slice(0, 2)
    .map((resident) => resident.fullName);
}

function isOneToOnePriority(resident: ResidentSnapshot) {
  const joined = [resident.participationStyle, resident.oneToOneStyle, resident.tags.join(" "), resident.supportNeeds.join(" ")]
    .join(" ")
    .toLowerCase();
  return joined.includes("1:1") || joined.includes("one-to-one") || joined.includes("bed-bound") || joined.includes("decline");
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
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const [followUpDraft, setFollowUpDraft] = useState({
    date: "",
    reason: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    note: "",
    nextStep: ""
  });

  const [isSavingResident, setIsSavingResident] = useState(false);
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const availableFilters = useMemo(() => getSnapshotFiltersForView(view), [view]);

  const visibleResidents = useMemo(() => {
    const viewScoped = residents.filter((resident) => (view === "ARCHIVED" ? isArchivedStatus(resident.status) : !isArchivedStatus(resident.status)));

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

  const stats = useMemo(() => {
    const active = residents.filter((resident) => !isArchivedStatus(resident.status));
    const newAdmissions = active.filter((resident) => {
      if (!resident.admissionDate) return false;
      const parsed = new Date(resident.admissionDate);
      if (Number.isNaN(parsed.getTime())) return false;
      const days = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 45;
    });

    const followUp = active.filter((resident) => resident.followUpRequired);
    const oneToOnePriority = active.filter(isOneToOnePriority);
    const birthdays = nextBirthdays(active);

    return {
      active: active.length,
      newAdmissions: newAdmissions.length,
      followUp: followUp.length,
      oneToOne: oneToOnePriority.length,
      birthdays: active.filter((resident) => resident.birthDate).length,
      birthdayPreview: birthdays
    };
  }, [residents]);

  useEffect(() => {
    const residentParam = searchParams.get("resident") || searchParams.get("residentId");
    const viewParam = searchParams.get("view");

    if (residentParam) {
      setSelectedResidentId(residentParam);
      setMobilePanelOpen(true);
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
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setIsRefreshing(false);
    }
  }

  function launchAssistant(action: SnapshotIntentAction, resident: ResidentSnapshot) {
    const prompt = buildAssistantPrompt(action, resident);
    router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
  }

  function toggleFilter(filter: SnapshotFilterKey) {
    setFilters((current) => (current.includes(filter) ? current.filter((entry) => entry !== filter) : [...current, filter]));
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
        setFeedback({ tone: "success", text: "Resident snapshot created." });
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
        setFeedback({ tone: "success", text: "Resident snapshot updated." });
      }

      setDrawerOpen(false);
      await refreshResidents();
    } catch (error) {
      if (isDemoSeed) {
        const local = toLocalSnapshot(form);
        setResidents((current) => [local, ...current]);
        setSelectedResidentId(local.id);
        setDrawerOpen(false);
        setFeedback({
          tone: "success",
          text: "Saved locally for demo mode. Connect API access to persist this resident."
        });
      } else {
        setFeedback({ tone: "error", text: getErrorMessage(error) });
      }
    } finally {
      setIsSavingResident(false);
    }
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
      setFeedback({ tone: "success", text: `${archived.fullName} moved to Discharged / Archived.` });
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
      setFeedback({ tone: "success", text: `${restored.fullName} restored to active snapshots.` });
      await refreshResidents();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setIsArchiveSubmitting(false);
    }
  }

  async function saveFollowUp() {
    if (!selectedResident) return;
    if (!followUpDraft.date.trim()) {
      setFeedback({ tone: "error", text: "Select a follow-up date before saving." });
      return;
    }

    try {
      const noteBlock = [
        selectedResident.sourceNotes ?? "",
        `Follow-Up Date: ${followUpDraft.date}`,
        `Follow-Up Priority: ${followUpDraft.priority}`,
        followUpDraft.reason ? `Follow-Up Reason: ${followUpDraft.reason}` : "",
        followUpDraft.note ? `Follow-Up Note: ${followUpDraft.note}` : "",
        followUpDraft.nextStep ? `Suggested Next Action: ${followUpDraft.nextStep}` : ""
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
                followUpDate: followUpDraft.date,
                followUpPriority: followUpDraft.priority,
                sourceNotes: noteBlock
              }
            : resident
        )
      );

      setFollowUpOpen(false);
      setFollowUpDraft({ date: "", reason: "", priority: "MEDIUM", note: "", nextStep: "" });
      setFeedback({ tone: "success", text: "Follow-up saved." });
      await refreshResidents();
    } catch (error) {
      setFeedback({ tone: "error", text: getErrorMessage(error) });
    }
  }

  const aiShortcutActions = [
    {
      id: "shortcut-1to1",
      label: "Residents needing 1:1 ideas",
      onClick: () => {
        setFilters(["PREFERS_1TO1"]);
      }
    },
    {
      id: "shortcut-follow-up",
      label: "Residents needing follow-up",
      onClick: () => {
        setFilters(["NEEDS_FOLLOW_UP"]);
      }
    },
    {
      id: "shortcut-birthday",
      label: "Residents with birthdays soon",
      onClick: () => {
        setSort("BIRTHDAY");
      }
    },
    {
      id: "shortcut-quiet",
      label: "Suggest activities for quiet residents",
      onClick: () => {
        setFilters(["QUIET_RESERVED"]);
      }
    },
    {
      id: "shortcut-social",
      label: "Suggest group fits for social residents",
      onClick: () => {
        setFilters(["SOCIAL"]);
      }
    }
  ];

  const selectedResidentsForBulk = residents.filter((resident) => selectedIds.includes(resident.id));

  return (
    <section className="space-y-4" aria-label="Residents workspace">
      <header className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-200/70">
        <PageHeader
          title="Residents"
        >
          <div className="flex flex-wrap items-center gap-2">
            <QuickActionMenu
              label="More Actions"
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
                  id: "archived",
                  label: "View Archived",
                  onClick: () => setView("ARCHIVED")
                },
                {
                  id: "bulk-follow-up",
                  label: "Bulk Follow-Up Actions",
                  onClick: () => setBulkMode(true)
                }
              ]}
            />
            <ActionButton tone="secondary" onClick={() => setFeedback({ tone: "success", text: "Import residents flow launched." })}>
              Import Residents
            </ActionButton>
            <ActionButton tone="secondary" onClick={() => router.push("/app?assistantPrompt=Help me prioritize resident follow-up planning for today.")}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Ask Actify About Residents
            </ActionButton>
            <ActionButton onClick={openCreateDrawer} disabled={!canEdit}>
              <Plus className="h-4 w-4" aria-hidden />
              Add Resident
            </ActionButton>
          </div>
        </PageHeader>
        <PageSubheader text="Quick resident preferences, participation style, and engagement support." />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryStatCard
            label="Active Residents"
            value={stats.active}
            context="Currently active snapshots"
            icon={Users}
            active={view === "ACTIVE"}
            onClick={() => {
              setView("ACTIVE");
              setFilters([]);
            }}
          />
          <SummaryStatCard
            label="New Admissions"
            value={stats.newAdmissions}
            context="Admitted in the last 45 days"
            icon={CalendarClock}
            onClick={() => {
              setView("ACTIVE");
              setFilters(["NEW_ADMISSIONS"]);
            }}
          />
          <SummaryStatCard
            label="Needs Follow-Up"
            value={stats.followUp}
            context="Flagged for check-in"
            icon={CheckCircle2}
            onClick={() => {
              setView("ACTIVE");
              setFilters(["NEEDS_FOLLOW_UP"]);
            }}
          />
          <SummaryStatCard
            label="1:1 Priority"
            value={stats.oneToOne}
            context="Best served with personalized visits"
            icon={UserSquare2}
            onClick={() => {
              setView("ACTIVE");
              setFilters(["PREFERS_1TO1"]);
            }}
          />
          <SummaryStatCard
            label="Upcoming Birthdays"
            value={stats.birthdays}
            context={stats.birthdayPreview.length ? stats.birthdayPreview.join(" • ") : "No upcoming birthdays"}
            icon={Sparkles}
            onClick={() => {
              setSort("BIRTHDAY");
            }}
          />
        </div>
      </header>

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

      <StickyActionBar>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-[260px] flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, room, interests, tags, or notes..."
            />
          </div>

          <SortDropdown options={SORT_OPTIONS.map((option) => ({ ...option }))} value={sort} onChange={setSort} />

          <ActionButton tone={displayMode === "GRID" ? "primary" : "secondary"} onClick={() => setDisplayMode("GRID")}>
            Grid View
          </ActionButton>
          <ActionButton tone={displayMode === "LIST" ? "primary" : "secondary"} onClick={() => setDisplayMode("LIST")}>
            Compact List
          </ActionButton>

          <ActionButton tone={bulkMode ? "primary" : "secondary"} onClick={() => setBulkMode((current) => !current)}>
            {bulkMode ? "Bulk: On" : "Bulk Select"}
          </ActionButton>

          <QuickActionMenu label="AI Shortcuts" actions={aiShortcutActions} />

          <ActionButton tone="secondary" onClick={() => void refreshResidents()}>
            <RefreshCcw className={cn("h-4 w-4", isRefreshing ? "animate-spin" : "")} aria-hidden />
            Refresh
          </ActionButton>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <ActionButton tone={view === "ACTIVE" ? "primary" : "secondary"} onClick={() => setView("ACTIVE")}>Active</ActionButton>
          <ActionButton tone={view === "ARCHIVED" ? "primary" : "secondary"} onClick={() => setView("ARCHIVED")}>Discharged / Archived</ActionButton>
          <FilterChips
            options={availableFilters.map((key) => ({ key, label: key.replaceAll("_", " ") }))}
            selected={filters}
            onToggle={toggleFilter}
          />
        </div>
      </StickyActionBar>

      {bulkMode && selectedIds.length > 0 ? (
        <StickyActionBar>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">{selectedIds.length} residents selected</p>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                tone="secondary"
                onClick={() => {
                  const prompt = `Help me prioritize these residents: ${selectedResidentsForBulk.map((resident) => resident.fullName).join(", ")}.`;
                  router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
                }}
              >
                Ask Actify About Selected
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => setFollowUpOpen(true)}>
                Add Follow-Up
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => setFeedback({ tone: "success", text: "Bulk tag flow opened." })}>
                Add Tag
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => setFeedback({ tone: "success", text: "Export ready for selected residents." })}>
                Export Selected
              </ActionButton>
              <ActionButton tone="secondary" onClick={() => setFeedback({ tone: "success", text: "Bulk archive flow started." })}>
                Archive Selected
              </ActionButton>
            </div>
          </div>
        </StickyActionBar>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
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
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleResidents.map((resident) => {
                const isSelected = selectedResident?.id === resident.id;
                return (
                  <EntityCard
                    key={resident.id}
                    selected={isSelected}
                    onClick={() => {
                      setSelectedResidentId(resident.id);
                      setMobilePanelOpen(true);
                    }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{resident.fullName}</h3>
                        <p className="text-sm text-slate-600">Room {resident.room}</p>
                      </div>
                      <StatusBadge
                        label={toResidentStatusLabel(resident.status)}
                        tone={resident.status === "ACTIVE" ? "success" : resident.status === "DISCHARGED" ? "warning" : "default"}
                      />
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {resident.admissionDate && (() => {
                        const admission = new Date(resident.admissionDate);
                        const days = (Date.now() - admission.getTime()) / (1000 * 60 * 60 * 24);
                        if (!Number.isFinite(days) || days > 45) return null;
                        return <StatusBadge label="New Admission" tone="warning" />;
                      })()}
                      {resident.followUpRequired ? <StatusBadge label="Needs Follow-Up" tone="danger" /> : null}
                      <TagChip label={resident.bestTimeOfDay || "Time not set"} />
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {resident.tags.slice(0, 5).map((tag) => (
                        <TagChip key={`${resident.id}-${tag}`} label={tag} />
                      ))}
                      {resident.tags.length > 5 ? <TagChip label={`+${resident.tags.length - 5} more`} /> : null}
                    </div>

                    <dl className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="font-semibold uppercase tracking-[0.12em] text-slate-500">Participation</dt>
                        <dd className="line-clamp-1 text-slate-700">{resident.quickSummary}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="font-semibold uppercase tracking-[0.12em] text-slate-500">Last engagement</dt>
                        <dd className="text-slate-700">{toRelativeDayLabel(resident.lastEngagementDate)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="font-semibold uppercase tracking-[0.12em] text-slate-500">Last activity</dt>
                        <dd className="line-clamp-1 text-slate-700">{resident.lastActivity || "Not logged"}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <ActionButton
                        tone="secondary"
                        onClick={() => launchAssistant(actions[0], resident)}
                      >
                        <Sparkles className="h-4 w-4" aria-hidden />
                        Ask Actify
                      </ActionButton>
                      <ActionButton tone="secondary" onClick={() => launchAssistant(actions[0], resident)}>
                        Suggest 1:1
                      </ActionButton>
                      <ActionButton tone="secondary" onClick={() => launchAssistant(actions[4], resident)}>
                        <ClipboardPenLine className="h-4 w-4" aria-hidden />
                        Draft Note
                      </ActionButton>
                      <ActionButton
                        tone="secondary"
                        onClick={() => {
                          setSelectedResidentId(resident.id);
                          setMobilePanelOpen(true);
                        }}
                      >
                        View Snapshot
                      </ActionButton>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {bulkMode ? (
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(resident.id)}
                            onChange={(event) => {
                              event.stopPropagation();
                              toggleSelect(resident.id);
                            }}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          Select
                        </label>
                      ) : (
                        <span className="text-xs text-slate-500">{resident.followUpDate ? `Follow-up ${resident.followUpDate}` : "No follow-up date"}</span>
                      )}

                      <QuickActionMenu
                        label="More"
                        actions={[
                          {
                            id: `edit-${resident.id}`,
                            label: "Edit Resident",
                            onClick: () => {
                              setSelectedResidentId(resident.id);
                              openEditDrawer();
                            }
                          },
                          {
                            id: `follow-${resident.id}`,
                            label: "Flag Follow-Up",
                            onClick: () => {
                              setSelectedResidentId(resident.id);
                              setFollowUpOpen(true);
                            }
                          },
                          {
                            id: `archive-${resident.id}`,
                            label: "Archive / Discharge",
                            onClick: () => {
                              setSelectedResidentId(resident.id);
                              setArchiveOpen(true);
                            }
                          },
                          {
                            id: `copy-${resident.id}`,
                            label: "Copy AI Prompt",
                            onClick: () => {
                              const prompt = buildAssistantPrompt(actions[0], resident);
                              navigator.clipboard.writeText(prompt).catch(() => undefined);
                              setFeedback({ tone: "success", text: "AI prompt copied to clipboard." });
                            }
                          }
                        ]}
                      />
                    </div>
                  </EntityCard>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleResidents.map((resident) => (
                <article
                  key={resident.id}
                  className={cn(
                    "rounded-2xl border bg-white p-3 shadow-sm",
                    selectedResident?.id === resident.id ? "border-teal-300 ring-1 ring-teal-100" : "border-slate-200"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => {
                        setSelectedResidentId(resident.id);
                        setMobilePanelOpen(true);
                      }}
                    >
                      <p className="font-semibold text-slate-900">{resident.fullName}</p>
                      <p className="text-xs text-slate-600">Room {resident.room}</p>
                    </button>
                    <StatusBadge
                      label={toResidentStatusLabel(resident.status)}
                      tone={resident.status === "ACTIVE" ? "success" : resident.status === "DISCHARGED" ? "warning" : "default"}
                    />
                    <TagChip label={resident.quickSummary} />
                    <span className="ml-auto text-xs text-slate-500">{toRelativeDayLabel(resident.lastEngagementDate)}</span>
                    <ActionButton tone="secondary" onClick={() => launchAssistant(actions[0], resident)}>
                      Ask Actify
                    </ActionButton>
                    <ActionButton tone="secondary" onClick={() => launchAssistant(actions[4], resident)}>
                      Draft Note
                    </ActionButton>
                    <QuickActionMenu
                      label="More"
                      actions={[
                        { id: `${resident.id}-snapshot`, label: "View Snapshot", onClick: () => setSelectedResidentId(resident.id) },
                        {
                          id: `${resident.id}-follow-up`,
                          label: "Set Follow-Up",
                          onClick: () => {
                            setSelectedResidentId(resident.id);
                            setFollowUpOpen(true);
                          }
                        }
                      ]}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {isDemoSeed ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Demo seed data is shown because no resident rows were found yet. Add a resident to start building live snapshots.
            </p>
          ) : null}
        </section>

        <section className="hidden lg:block" aria-label="Resident preview panel">
          {selectedResident ? (
            <div className="space-y-3">
              <ResidentSnapshotPanel
                resident={selectedResident}
                actions={actions}
                onAskActify={(action) => launchAssistant(action, selectedResident)}
                onEdit={openEditDrawer}
                onArchive={() => {
                  if (isArchivedStatus(selectedResident.status)) {
                    void handleRestoreResident();
                    return;
                  }
                  setArchiveOpen(true);
                }}
                archiveActionLabel={isArchivedStatus(selectedResident.status) ? "Restore Resident" : "Archive / Discharge"}
              />

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Follow-Up + Visit Status</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Needs follow-up:</span> {selectedResident.followUpRequired ? "Yes" : "No"}
                  </p>
                  <p>
                    <span className="font-semibold">Follow-up date:</span> {selectedResident.followUpDate || "Not set"}
                  </p>
                  <p>
                    <span className="font-semibold">Priority:</span> {selectedResident.followUpPriority || "Not set"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton tone="secondary" onClick={() => setFollowUpOpen(true)}>
                    Set Follow-Up Date
                  </ActionButton>
                  <ActionButton
                    tone="secondary"
                    onClick={() => {
                      setResidents((current) =>
                        current.map((resident) =>
                          resident.id === selectedResident.id
                            ? { ...resident, followUpRequired: false, followUpDate: null, followUpPriority: null }
                            : resident
                        )
                      );
                    }}
                  >
                    Mark Follow-Up Complete
                  </ActionButton>
                </div>
              </article>
            </div>
          ) : (
            <EmptyStateCard title="No snapshot selected" description="Select a resident card to preview details and AI shortcuts." />
          )}
        </section>
      </div>

      <div className={`fixed inset-0 z-40 bg-slate-950/30 p-3 lg:hidden ${mobilePanelOpen && selectedResident ? "block" : "hidden"}`}>
        {selectedResident ? (
          <ResidentSnapshotPanel
            resident={selectedResident}
            actions={actions}
            onAskActify={(action) => launchAssistant(action, selectedResident)}
            onEdit={openEditDrawer}
            onArchive={() => {
              if (isArchivedStatus(selectedResident.status)) {
                void handleRestoreResident();
                return;
              }
              setArchiveOpen(true);
            }}
            archiveActionLabel={isArchivedStatus(selectedResident.status) ? "Restore Resident" : "Archive / Discharge"}
            onClose={() => setMobilePanelOpen(false)}
          />
        ) : null}
      </div>

      <AddResidentDrawer
        open={drawerOpen}
        mode={drawerMode}
        resident={drawerMode === "edit" ? selectedResident : null}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveResident}
        isSaving={isSavingResident}
      />

      <ArchiveResidentModal
        open={archiveOpen}
        resident={selectedResident}
        onClose={() => setArchiveOpen(false)}
        onConfirm={handleArchiveConfirm}
        isSubmitting={isArchiveSubmitting}
      />

      <ModalShell open={followUpOpen} title="Set Follow-Up" onClose={() => setFollowUpOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Follow-Up Date</span>
            <input
              type="date"
              value={followUpDraft.date}
              onChange={(event) => setFollowUpDraft((current) => ({ ...current, date: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Priority</span>
            <select
              value={followUpDraft.priority}
              onChange={(event) =>
                setFollowUpDraft((current) => ({ ...current, priority: event.target.value as "LOW" | "MEDIUM" | "HIGH" }))
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reason</span>
            <input
              value={followUpDraft.reason}
              onChange={(event) => setFollowUpDraft((current) => ({ ...current, reason: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              placeholder="Repeated refusal, low recent participation, etc."
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Note</span>
            <textarea
              rows={3}
              value={followUpDraft.note}
              onChange={(event) => setFollowUpDraft((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              placeholder="Optional follow-up note"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Suggested next action</span>
            <input
              value={followUpDraft.nextStep}
              onChange={(event) => setFollowUpDraft((current) => ({ ...current, nextStep: event.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              placeholder="Schedule 1:1 music visit, etc."
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <ActionButton tone="secondary" onClick={() => setFollowUpOpen(false)}>
            Cancel
          </ActionButton>
          <ActionButton onClick={() => void saveFollowUp()}>Save Follow-Up</ActionButton>
          <ActionButton
            tone="secondary"
            onClick={() => {
              if (!selectedResident) return;
              const prompt = buildAssistantPrompt(actions[9], {
                ...selectedResident,
                followUpRequired: true,
                followUpDate: followUpDraft.date,
                followUpPriority: followUpDraft.priority
              });
              router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
              setFollowUpOpen(false);
            }}
          >
            Save and Ask Actify
          </ActionButton>
        </div>
      </ModalShell>
    </section>
  );
}
