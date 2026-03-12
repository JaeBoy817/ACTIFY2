"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, ArrowLeft, RotateCcw, Search, SlidersHorizontal, UserRound } from "lucide-react";

import { TopContentHeader } from "@/components/app/TopContentHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toResidentStatusLabel, type ResidentListRow } from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type ArchiveStatusFilter = "all" | "DISCHARGED" | "TRANSFERRED" | "DECEASED" | "OTHER";
type ArchiveSortKey = "NAME" | "ROOM" | "ADMISSION_NEWEST" | "ADMISSION_OLDEST" | "LAST_1TO1";

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

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function residentDisplayName(resident: ResidentListRow) {
  return `${resident.firstName} ${resident.lastName}`;
}

function sortArchivedResidents(rows: ResidentListRow[], sortBy: ArchiveSortKey) {
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

  if (sortBy === "LAST_1TO1") {
    return cloned.sort((a, b) => {
      const aDate = parseIsoDate(a.lastOneOnOneAt)?.getTime() ?? 0;
      const bDate = parseIsoDate(b.lastOneOnOneAt)?.getTime() ?? 0;
      return bDate - aDate;
    });
  }

  return cloned.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: "base" }));
}

function archivedStatusTone(status: ResidentListRow["status"]) {
  if (status === "DECEASED") return "border-zinc-500/45 bg-zinc-500/20 text-zinc-100";
  if (status === "TRANSFERRED") return "border-violet-300/45 bg-violet-500/16 text-violet-100";
  if (status === "OTHER") return "border-slate-400/45 bg-slate-500/18 text-slate-100";
  return "border-rose-300/45 bg-rose-500/16 text-rose-100";
}

export function ResidentsArchiveWorkspace({
  initialResidents
}: {
  initialResidents: ResidentListRow[];
}) {
  const { toast } = useToast();
  const [residents, setResidents] = useState(initialResidents);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArchiveStatusFilter>("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState<ArchiveSortKey>("ADMISSION_NEWEST");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    residents.forEach((resident) => {
      if (resident.unitName) set.add(resident.unitName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [residents]);

  const filtered = useMemo(() => {
    const token = query.trim().toLowerCase();
    const rows = residents.filter((resident) => {
      if (statusFilter !== "all" && resident.status !== statusFilter) return false;
      if (unitFilter !== "all" && (resident.unitName ?? "") !== unitFilter) return false;

      if (!token) return true;
      const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
      const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
      const preferredName = (resident.preferredName ?? "").toLowerCase();
      const status = toResidentStatusLabel(resident.status).toLowerCase();
      const unit = (resident.unitName ?? "").toLowerCase();

      return (
        fullName.includes(token) ||
        reverseName.includes(token) ||
        preferredName.includes(token) ||
        status.includes(token) ||
        unit.includes(token) ||
        resident.room.toLowerCase().includes(token)
      );
    });

    return sortArchivedResidents(rows, sortBy);
  }, [query, residents, sortBy, statusFilter, unitFilter]);

  const summary = useMemo(() => {
    const discharged = residents.filter((resident) => resident.status === "DISCHARGED").length;
    const transferred = residents.filter((resident) => resident.status === "TRANSFERRED").length;
    const deceased = residents.filter((resident) => resident.status === "DECEASED").length;

    return {
      total: residents.length,
      discharged,
      transferred,
      deceased,
      visible: filtered.length
    };
  }, [filtered.length, residents]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count += 1;
    if (statusFilter !== "all") count += 1;
    if (unitFilter !== "all") count += 1;
    if (sortBy !== "ADMISSION_NEWEST") count += 1;
    return count;
  }, [query, sortBy, statusFilter, unitFilter]);

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setUnitFilter("all");
    setSortBy("ADMISSION_NEWEST");
  }

  async function restoreResident(residentId: string) {
    const previous = residents;
    setRestoringId(residentId);
    setResidents((current) => current.filter((resident) => resident.id !== residentId));

    try {
      const response = await fetch(`/api/residents/${encodeURIComponent(residentId)}/restore`, {
        method: "POST"
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not restore resident.");
      }
      toast({
        title: "Resident restored",
        description: "Resident moved back to active census."
      });
    } catch (error) {
      setResidents(previous);
      toast({
        title: "Could not restore resident",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[#1a2a48] bg-[#040814] px-3 pb-6 pt-4 md:px-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_520px_at_-8%_0%,rgba(56,189,248,0.16),transparent_62%),radial-gradient(980px_420px_at_95%_0%,rgba(139,92,246,0.2),transparent_62%),radial-gradient(800px_380px_at_45%_100%,rgba(59,130,246,0.12),transparent_72%)]" />

      <div className="relative z-10 space-y-4">
        <TopContentHeader
          eyebrow="Resident Command Center"
          title="Archived Residents"
          subtitle="Review archived profiles, search by resident or room, and restore residents back to active census."
          icon={Archive}
          accentGradientClasses="from-amber-300 via-orange-400 to-rose-500"
          actions={
            <Button asChild variant="outline" className="h-10 border-[#3b5d90] bg-[#122342] text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/residents">
                <ArrowLeft className="h-4 w-4" />
                Back to Residents
              </Link>
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-9 rounded-full border-[#3b5d90] bg-[#122342] px-4 text-xs text-[#d4e5ff] hover:bg-[#193055]">
              <Link href="/app/residents">Active Census</Link>
            </Button>
            <Badge className="border-[#3a5786] bg-[#11203c] text-xs text-[#c4d7f8]">
              {summary.total} archived resident{summary.total === 1 ? "" : "s"}
            </Badge>
          </div>
        </TopContentHeader>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Archived Total", value: summary.total, tone: "text-blue-100", icon: UserRound },
            { label: "Discharged", value: summary.discharged, tone: "text-rose-100", icon: Archive },
            { label: "Transferred", value: summary.transferred, tone: "text-violet-100", icon: Archive },
            { label: "Deceased", value: summary.deceased, tone: "text-zinc-200", icon: Archive },
            { label: "Showing", value: summary.visible, tone: "text-cyan-100", icon: Search }
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Search & Filters</p>
              <p className="text-sm text-[#c7d9f8]">Find archived residents quickly by name, room, status, or unit.</p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 ? (
                <Badge className="border-cyan-300/40 bg-cyan-500/16 text-cyan-100">
                  {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
                </Badge>
              ) : (
                <Badge className="border-[#3a5688] bg-[#11203a] text-[#c6d9fa]">Default view</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-9 border-[#395b90] bg-[#122342] text-xs text-[#d4e5ff] hover:bg-[#193055]"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <label className="relative flex h-10 items-center rounded-xl border border-[#35517f] bg-[#11203c] px-3 lg:col-span-6">
              <Search className="h-4 w-4 text-[#8ca5d2]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search archived residents by name, room, status, or unit"
                className="h-full border-none bg-transparent pl-2 text-sm text-[#dce8ff] placeholder:text-[#8ea7d4] focus-visible:ring-0"
              />
            </label>

            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ArchiveStatusFilter)}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DISCHARGED">Discharged</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                  <SelectItem value="DECEASED">Deceased</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
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
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as ArchiveSortKey)}>
                <SelectTrigger className="h-10 border-[#35517f] bg-[#11203c] text-[#dce8ff]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMISSION_NEWEST">Admission Date (Newest)</SelectItem>
                  <SelectItem value="ADMISSION_OLDEST">Admission Date (Oldest)</SelectItem>
                  <SelectItem value="NAME">Last Name (A-Z)</SelectItem>
                  <SelectItem value="ROOM">Room Number</SelectItem>
                  <SelectItem value="LAST_1TO1">Most Recent 1:1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#213457] bg-[linear-gradient(180deg,#0e192f_0%,#0a1324_100%)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Archived Directory</p>
              <p className="text-sm text-[#c6d8f8]">
                {filtered.length} resident{filtered.length === 1 ? "" : "s"} in view
              </p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#3a5688] bg-[#0d1a31] p-10 text-center">
              <p className="text-base font-semibold text-white">No archived residents match these filters.</p>
              <p className="mt-1 text-sm text-[#97afd8]">Try adjusting the search query or status filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((resident) => (
                <article
                  key={resident.id}
                  className="rounded-2xl border border-[#24395f] bg-[linear-gradient(180deg,#0f1b33_0%,#0b1427_100%)] p-3 shadow-[0_16px_34px_-24px_rgba(37,99,235,0.7)] transition hover:border-[#325284] hover:bg-[linear-gradient(180deg,#11203b_0%,#0d1830_100%)]"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-500/18 text-sm font-bold text-cyan-100">
                          {initials(resident.firstName, resident.lastName)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">{residentDisplayName(resident)}</p>
                            {resident.preferredName ? (
                              <Badge className="border-violet-400/30 bg-violet-500/16 text-[10px] text-violet-100">
                                “{resident.preferredName}”
                              </Badge>
                            ) : null}
                            <Badge className="border-[#3a5786] bg-[#11203c] text-[10px] text-[#c4d7f8]">Room {resident.room}</Badge>
                            <Badge className={cn("border text-[10px]", archivedStatusTone(resident.status))}>
                              {toResidentStatusLabel(resident.status)}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#9eb4da]">
                            <span>Admission: {formatDateLabel(resident.admissionDate)}</span>
                            <span className="text-[#607cad]">•</span>
                            <span>Last 1:1: {formatDateLabel(resident.lastOneOnOneAt)}</span>
                            <span className="text-[#607cad]">•</span>
                            <span>Unit: {resident.unitName ?? "Unassigned"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-[#2d456f] bg-[#0d182d] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa7d3]">Documentation Snapshot</p>
                      <div className="mt-2 space-y-1 text-[11px] text-[#cfe0ff]">
                        <p>Quarterly UDA: {formatDateLabel(resident.assessmentSchedule.quarterly.lastCompletedIso)}</p>
                        <p>Annual UDA: {formatDateLabel(resident.assessmentSchedule.annual.lastCompletedIso)}</p>
                        <p>MDS: {formatDateLabel(resident.assessmentSchedule.mds.lastCompletedIso)}</p>
                      </div>
                    </div>

                    <div className="flex min-w-[220px] flex-col justify-between gap-2">
                      <Button
                        type="button"
                        onClick={() => void restoreResident(resident.id)}
                        disabled={restoringId === resident.id}
                        className="h-9 border border-emerald-300/45 bg-emerald-500/18 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/28"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {restoringId === resident.id ? "Restoring..." : "Restore Resident"}
                      </Button>
                      <Button asChild variant="outline" className="h-9 border-[#395a8d] bg-[#122442] text-xs text-[#d9e6ff] hover:bg-[#183053]">
                        <Link href={`/app/residents/${resident.id}`}>Open Profile</Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
