"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { ResidentFormModal } from "@/components/residents/ResidentFormModal";
import { ResidentsHeader } from "@/components/residents/ResidentsHeader";
import { ResidentInspector } from "@/components/residents/ResidentInspector";
import { ResidentList } from "@/components/residents/ResidentList";
import { StatCardsRow } from "@/components/residents/StatCardsRow";
import { ImportResidentsModal } from "@/components/residents/ImportResidentsModal";
import { Button } from "@/components/ui/button";
import { compareResidentsByRoom } from "@/lib/resident-status";
import {
  isNeedsOneOnOne,
  toResidentStatusLabel,
  type ResidentFilterKey,
  type ResidentListRow,
  type ResidentSortKey,
  type ResidentUpsertPayload
} from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";

function sortResidents(rows: ResidentListRow[], sortBy: ResidentSortKey) {
  const cloned = [...rows];
  if (sortBy === "NAME") {
    return cloned.sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" });
      if (last !== 0) return last;
      return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });
    });
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

function matchesFilter(resident: ResidentListRow, filter: ResidentFilterKey) {
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return resident.status === "ACTIVE";
  if (filter === "BED_BOUND") return resident.status === "BED_BOUND";
  if (filter === "HOSPITAL") return resident.status === "HOSPITALIZED";
  return true;
}

export function ResidentsWorkspace({
  initialResidents,
  canEdit
}: {
  initialResidents: ResidentListRow[];
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [residents, setResidents] = useState(initialResidents);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ResidentFilterKey>("ALL");
  const [sortBy, setSortBy] = useState<ResidentSortKey>("ROOM");
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(initialResidents[0]?.id ?? null);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<ResidentListRow | null>(null);
  const deferredSearch = useDeferredValue(search);

  const stats = useMemo(() => {
    const activeCount = residents.filter((resident) => resident.status === "ACTIVE").length;
    const bedBoundCount = residents.filter((resident) => resident.status === "BED_BOUND").length;
    const oneToOneDueCount = residents.filter((resident) => isNeedsOneOnOne(resident.lastOneOnOneAt)).length;
    const followUpsCount = residents.filter((resident) => resident.followUpFlag).length;

    return {
      activeCount,
      bedBoundCount,
      oneToOneDueCount,
      followUpsCount
    };
  }, [residents]);

  const visibleResidents = useMemo(() => {
    const token = deferredSearch.trim().toLowerCase();
    const filtered = residents.filter((resident) => {
      if (!matchesFilter(resident, filter)) return false;
      if (!token) return true;
      const name = `${resident.firstName} ${resident.lastName}`.toLowerCase();
      const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
      const tags = resident.tags.join(" ").toLowerCase();
      const status = toResidentStatusLabel(resident.status).toLowerCase();
      return (
        name.includes(token) ||
        reverseName.includes(token) ||
        resident.room.toLowerCase().includes(token) ||
        tags.includes(token) ||
        status.includes(token)
      );
    });

    return sortResidents(filtered, sortBy);
  }, [deferredSearch, filter, residents, sortBy]);

  const selectedResident = useMemo(
    () => residents.find((resident) => resident.id === selectedResidentId) ?? null,
    [residents, selectedResidentId]
  );

  useEffect(() => {
    if (visibleResidents.length === 0) {
      setSelectedResidentId(null);
      return;
    }
    if (!selectedResidentId || !visibleResidents.some((resident) => resident.id === selectedResidentId)) {
      setSelectedResidentId(visibleResidents[0].id);
    }
  }, [selectedResidentId, visibleResidents]);

  async function refreshResidents() {
    const response = await fetch("/api/residents", { cache: "no-store" });
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
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not save resident.");
    const nextResident = body.resident as ResidentListRow;

    setResidents((previous) => {
      const without = previous.filter((resident) => resident.id !== nextResident.id);
      if (nextResident.status === "DISCHARGED") {
        return without;
      }
      return [...without, nextResident];
    });
    setSelectedResidentId(nextResident.status === "DISCHARGED" ? null : nextResident.id);
  }

  async function updateResidentPartial(residentId: string, patch: { preferences?: string; safetyNotes?: string; followUpFlag?: boolean }) {
    const response = await fetch(`/api/residents/${encodeURIComponent(residentId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? "Could not update resident.");
    const nextResident = body.resident as ResidentListRow;
    setResidents((previous) => previous.map((resident) => (resident.id === nextResident.id ? nextResident : resident)));
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

  function handleOpenAdd() {
    setEditingResident(null);
    setAddEditOpen(true);
  }

  return (
    <div className="space-y-4">
      <ResidentsHeader
        search={search}
        onSearchChange={setSearch}
        onOpenAddResident={handleOpenAdd}
        onOpenImport={() => setImportOpen(true)}
        canEdit={canEdit}
      />

      <StatCardsRow
        activeCount={stats.activeCount}
        bedBoundCount={stats.bedBoundCount}
        oneToOneDueCount={stats.oneToOneDueCount}
        followUpsCount={stats.followUpsCount}
        activeFilter={filter}
        onFilterSelect={setFilter}
      />

      {residents.length === 0 ? (
        <section className="glass-panel rounded-2xl border-white/15 p-8 text-center shadow-xl shadow-black/10">
          <h2 className="font-[var(--font-display)] text-2xl text-foreground">No residents yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first resident to start tracking care context, one-on-ones, and follow-ups.
          </p>
          <Button type="button" onClick={handleOpenAdd} className="mt-4 shadow-lg shadow-actifyBlue/25">
            Add Resident
          </Button>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ResidentList
            residents={visibleResidents}
            selectedResidentId={selectedResidentId}
            filter={filter}
            sortBy={sortBy}
            onSelectResident={setSelectedResidentId}
            onFilterChange={setFilter}
            onSortChange={setSortBy}
          />
          <ResidentInspector
            resident={selectedResident}
            canEdit={canEdit}
            onOpenEditResident={(resident) => {
              setEditingResident(resident);
              setAddEditOpen(true);
            }}
            onUpdateResident={updateResidentPartial}
          />
        </div>
      )}

      <ResidentFormModal
        open={addEditOpen}
        onOpenChange={(open) => {
          setAddEditOpen(open);
          if (!open) {
            setEditingResident(null);
          }
        }}
        initialResident={editingResident}
        onSave={upsertResident}
        canEdit={canEdit}
      />

      <ImportResidentsModal open={importOpen} onOpenChange={setImportOpen} onImport={importResidents} />
    </div>
  );
}
