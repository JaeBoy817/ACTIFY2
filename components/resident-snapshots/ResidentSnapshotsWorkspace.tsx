"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Plus, RefreshCcw, SearchX, Sparkles, UserRoundX, Users } from "lucide-react";

import { AddResidentDrawer } from "@/components/resident-snapshots/AddResidentDrawer";
import { ArchiveResidentModal } from "@/components/resident-snapshots/ArchiveResidentModal";
import { EmptyState } from "@/components/resident-snapshots/EmptyState";
import {
  appendArchiveContext,
  buildAssistantPrompt,
  fromResidentRow,
  getSnapshotActions,
  getSnapshotFiltersForView,
  residentMatchesFilter,
  residentMatchesSearch,
  toDraftPayload,
  toSnapshotCollection
} from "@/components/resident-snapshots/helpers";
import { MOCK_RESIDENT_SNAPSHOTS } from "@/components/resident-snapshots/mockSnapshots";
import { ResidentCard } from "@/components/resident-snapshots/ResidentCard";
import { ResidentFilterBar } from "@/components/resident-snapshots/ResidentFilterBar";
import { ResidentSearchInput } from "@/components/resident-snapshots/ResidentSearchInput";
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

function isArchivedStatus(status: ResidentSnapshot["status"]) {
  return status === "DISCHARGED" || status === "TRANSFERRED" || status === "DECEASED";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
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

function toLocalSnapshot(form: ResidentSnapshotFormValue): ResidentSnapshot {
  const draft = toDraftPayload(form);
  const firstTag = draft.tags[0] ?? "Snapshot";
  return {
    id: `local-${crypto.randomUUID()}`,
    firstName: draft.firstName,
    lastName: draft.lastName,
    fullName: `${draft.firstName} ${draft.lastName}`.trim(),
    preferredName: draft.preferredName,
    room: draft.room,
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
    dischargeDate: null,
    dischargeReason: null
  };
}

export function ResidentSnapshotsWorkspace({
  initialResidents,
  canEdit
}: {
  initialResidents: ResidentListRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSnapshots = useMemo(() => toSnapshotCollection(initialResidents), [initialResidents]);

  const [residents, setResidents] = useState<ResidentSnapshot[]>(
    initialSnapshots.length > 0 ? initialSnapshots : MOCK_RESIDENT_SNAPSHOTS
  );
  const [isDemoSeed, setIsDemoSeed] = useState(initialSnapshots.length === 0);

  const [view, setView] = useState<SnapshotViewKey>("ACTIVE");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<SnapshotFilterKey[]>([]);

  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const [isSavingResident, setIsSavingResident] = useState(false);
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const actions = useMemo(() => getSnapshotActions(), []);

  const visibleResidents = useMemo(() => {
    const viewScoped = residents.filter((resident) => (view === "ARCHIVED" ? isArchivedStatus(resident.status) : !isArchivedStatus(resident.status)));

    return viewScoped.filter((resident) => {
      if (!residentMatchesSearch(resident, search)) return false;
      if (filters.length === 0) return true;
      return filters.every((filter) => residentMatchesFilter(resident, filter));
    });
  }, [filters, residents, search, view]);

  const selectedResident = useMemo(() => {
    if (selectedResidentId) {
      const directMatch = residents.find((resident) => resident.id === selectedResidentId) ?? null;
      if (directMatch) return directMatch;
    }
    return visibleResidents[0] ?? null;
  }, [residents, selectedResidentId, visibleResidents]);

  const activeCount = useMemo(() => residents.filter((resident) => !isArchivedStatus(resident.status)).length, [residents]);
  const archivedCount = useMemo(() => residents.filter((resident) => isArchivedStatus(resident.status)).length, [residents]);
  const newAdmissionsCount = useMemo(
    () =>
      residents.filter((resident) => {
        if (!resident.admissionDate) return false;
        const parsed = new Date(resident.admissionDate);
        if (Number.isNaN(parsed.getTime())) return false;
        const days = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
        return days <= 45;
      }).length,
    [residents]
  );

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const residentParam = searchParams.get("resident") || searchParams.get("residentId");

    if (viewParam === "archived") {
      setView("ARCHIVED");
    }

    if (residentParam) {
      setSelectedResidentId(residentParam);
      setMobilePanelOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedResidentId && residents.some((resident) => resident.id === selectedResidentId)) {
      return;
    }
    const fallback = visibleResidents[0];
    setSelectedResidentId(fallback?.id ?? null);
  }, [residents, selectedResidentId, visibleResidents]);

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
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(draft)
        })) as { resident?: ResidentListRow };

        if (!payload.resident) {
          throw new Error("Resident could not be created.");
        }

        const created = fromResidentRow(payload.resident);
        setResidents((current) => [created, ...current.filter((item) => !item.id.startsWith("mock-"))]);
        setSelectedResidentId(created.id);
        setIsDemoSeed(false);
        setFeedback({ tone: "success", text: "Resident snapshot created." });
      } else {
        if (!selectedResident) {
          throw new Error("Select a resident to edit.");
        }

        const payload = (await fetchJson(`/api/residents/${selectedResident.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(draft)
        })) as { resident?: ResidentListRow };

        if (!payload.resident) {
          throw new Error("Resident could not be updated.");
        }

        const updated = fromResidentRow(payload.resident);
        setResidents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
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
    setFeedback(null);

    try {
      const archiveNotes = appendArchiveContext({
        existingNotes: selectedResident.sourceNotes,
        date: input.date,
        reason: input.reason,
        note: input.note
      });

      await fetchJson(`/api/residents/${selectedResident.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          notes: archiveNotes,
          tags: Array.from(new Set([...selectedResident.tags, `Archive: ${input.reason}`]))
        })
      });

      const payload = (await fetchJson(`/api/residents/${selectedResident.id}/archive`, {
        method: "POST"
      })) as { resident?: ResidentListRow };

      if (!payload.resident) {
        throw new Error("Resident could not be archived.");
      }

      const archived = fromResidentRow(payload.resident);
      archived.dischargeDate = input.date;
      archived.dischargeReason = input.reason;

      setResidents((current) => current.map((item) => (item.id === archived.id ? archived : item)));
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
    setFeedback(null);

    try {
      const payload = (await fetchJson(`/api/residents/${selectedResident.id}/restore`, {
        method: "POST"
      })) as { resident?: ResidentListRow };

      if (!payload.resident) {
        throw new Error("Resident could not be restored.");
      }

      const restored = fromResidentRow(payload.resident);
      setResidents((current) => current.map((item) => (item.id === restored.id ? restored : item)));
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

  function launchAssistant(action: SnapshotIntentAction, resident: ResidentSnapshot) {
    const prompt = buildAssistantPrompt(action, resident);
    router.push(`/app?assistantPrompt=${encodeURIComponent(prompt)}`);
  }

  function toggleFilter(filter: SnapshotFilterKey) {
    setFilters((current) => (current.includes(filter) ? current.filter((entry) => entry !== filter) : [...current, filter]));
  }

  const availableFilters = useMemo(() => getSnapshotFiltersForView(view), [view]);

  return (
    <>
      <section className="space-y-4" aria-label="Resident snapshots workspace">
        <header className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-200/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Residents</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Resident Snapshots</h1>
              <p className="mt-2 text-sm text-slate-600">
                Store resident preferences, engagement style, and quick context for smarter activity support.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void refreshResidents();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreateDrawer}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add Resident
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active Snapshots</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">New Admissions</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{newAdmissionsCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Archived</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{archivedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">AI-Ready Profiles</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{residents.filter((resident) => resident.interests.length > 0).length}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setView("ACTIVE");
                setFilters([]);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                view === "ACTIVE"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Active Residents
            </button>
            <button
              type="button"
              onClick={() => {
                setView("ARCHIVED");
                setFilters([]);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                view === "ARCHIVED"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Discharged / Archived
            </button>
          </div>
        </header>

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-2 text-sm ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.text}
          </div>
        ) : null}

        <ResidentSearchInput value={search} onChange={setSearch} />
        <ResidentFilterBar
          filters={filters}
          onToggleFilter={toggleFilter}
          onClearFilters={() => setFilters([])}
          availableFilters={availableFilters}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
          <section className="space-y-3" aria-label="Resident cards">
            {visibleResidents.length === 0 ? (
              residents.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No resident snapshots yet"
                  description="Add your first resident to start building smarter activity support."
                  action={
                    canEdit ? (
                      <button
                        type="button"
                        onClick={openCreateDrawer}
                        className="rounded-full border border-teal-200 bg-teal-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                      >
                        Add Resident
                      </button>
                    ) : undefined
                  }
                />
              ) : view === "ARCHIVED" ? (
                <EmptyState
                  icon={Archive}
                  title="No archived residents yet"
                  description="Archived snapshots will appear here after discharge/archive actions."
                />
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="No matches found"
                  description="Try a different name, room number, or tag."
                />
              )
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleResidents.map((resident) => (
                  <ResidentCard
                    key={resident.id}
                    resident={resident}
                    selected={selectedResident?.id === resident.id}
                    onSelect={() => {
                      setSelectedResidentId(resident.id);
                      setMobilePanelOpen(true);
                    }}
                    onAskActify={() => launchAssistant(actions[0], resident)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="hidden lg:block" aria-label="Snapshot detail panel">
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
              />
            ) : (
              <EmptyState
                icon={UserRoundX}
                title="No snapshot selected"
                description="Select a resident card to view preferences, participation style, and AI actions."
              />
            )}
          </section>
        </div>
      </section>

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

      {isDemoSeed ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Demo seed data is shown because no resident rows were found yet. Add a resident to start building live snapshots.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Ask Actify</p>
        <p className="mt-1">Get activity ideas and writing help based on this resident with one tap from any card or snapshot panel.</p>
        <button
          type="button"
          onClick={() => {
            if (!selectedResident) return;
            launchAssistant(actions[0], selectedResident);
          }}
          disabled={!selectedResident}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask Actify about selected resident
        </button>
      </div>
    </>
  );
}
