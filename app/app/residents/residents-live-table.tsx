"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BedDouble,
  CircleCheck,
  CircleHelp,
  DoorOpen,
  Hospital,
  PlaneTakeoff,
  Search,
  Skull,
  X,
  type LucideIcon
} from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatResidentStatusLabel, type ResidentStatusValue, residentStatusOptions } from "@/lib/resident-status";

const bulkStatusFormId = "resident-status-bulk-form";

type ResidentListItem = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  unitName: string | null;
  status: ResidentStatusValue;
  attendanceCount: number;
};

const residentStatusMeta: Record<
  ResidentStatusValue,
  { icon: LucideIcon; badgeClass: string; chipClass: string }
> = {
  ACTIVE: {
    icon: CircleCheck,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    chipClass: "border-emerald-200 bg-emerald-50/80 text-emerald-700"
  },
  BED_BOUND: {
    icon: BedDouble,
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    chipClass: "border-sky-200 bg-sky-50/80 text-sky-700"
  },
  DISCHARGED: {
    icon: DoorOpen,
    badgeClass: "border-zinc-300 bg-zinc-100 text-zinc-700",
    chipClass: "border-zinc-300 bg-zinc-100/80 text-zinc-700"
  },
  HOSPITALIZED: {
    icon: Hospital,
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    chipClass: "border-rose-200 bg-rose-50/80 text-rose-700"
  },
  ON_LEAVE: {
    icon: PlaneTakeoff,
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
    chipClass: "border-indigo-200 bg-indigo-50/80 text-indigo-700"
  },
  TRANSFERRED: {
    icon: ArrowRightLeft,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    chipClass: "border-amber-200 bg-amber-50/80 text-amber-700"
  },
  DECEASED: {
    icon: Skull,
    badgeClass: "border-slate-300 bg-slate-200 text-slate-700",
    chipClass: "border-slate-300 bg-slate-200/80 text-slate-700"
  },
  OTHER: {
    icon: CircleHelp,
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    chipClass: "border-violet-200 bg-violet-50/80 text-violet-700"
  }
};

export function ResidentsLiveTable({
  residents,
  allowCreate,
  saveAllResidentStatuses,
  deleteResident
}: {
  residents: ResidentListItem[];
  allowCreate: boolean;
  saveAllResidentStatuses: (formData: FormData) => void | Promise<void>;
  deleteResident: (formData: FormData) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ResidentStatusValue>>({});

  useEffect(() => {
    setStatusDrafts(Object.fromEntries(residents.map((resident) => [resident.id, resident.status])));
  }, [residents]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredResidents = useMemo(() => {
    if (!normalizedQuery) return residents;

    return residents.filter((resident) => {
      const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
      const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
      const statusLabel = formatResidentStatusLabel(resident.status).toLowerCase();
      return (
        fullName.includes(normalizedQuery) ||
        reverseName.includes(normalizedQuery) ||
        resident.room.toLowerCase().includes(normalizedQuery) ||
        (resident.unitName ?? "").toLowerCase().includes(normalizedQuery) ||
        statusLabel.includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, residents]);

  const currentResidents = useMemo(
    () => filteredResidents.filter((resident) => resident.status !== "DISCHARGED"),
    [filteredResidents]
  );
  const dischargedResidents = useMemo(
    () => filteredResidents.filter((resident) => resident.status === "DISCHARGED"),
    [filteredResidents]
  );

  const changedCount = useMemo(() => {
    return residents.reduce((count, resident) => {
      const nextStatus = statusDrafts[resident.id] ?? resident.status;
      return nextStatus !== resident.status ? count + 1 : count;
    }, 0);
  }, [residents, statusDrafts]);

  const statusCounts = useMemo(() => {
    return residentStatusOptions.map((status) => ({
      status,
      count: residents.filter((resident) => (statusDrafts[resident.id] ?? resident.status) === status).length
    }));
  }, [residents, statusDrafts]);

  const totalAttendanceMarks = useMemo(
    () => residents.reduce((sum, resident) => sum + resident.attendanceCount, 0),
    [residents]
  );

  return (
    <div className="space-y-4">
      <GlassPanel variant="warm" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Residents</h1>
            <p className="mt-1 text-sm text-foreground/75">
              Sorted by room for faster rounding. Search updates live as you type.
            </p>
          </div>
          <Badge variant="outline" className="bg-white/70 text-xs">
            Showing {filteredResidents.length} of {residents.length}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard variant="dense" className="p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Current Residents</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{residents.filter((resident) => resident.status !== "DISCHARGED").length}</p>
          </GlassCard>
          <GlassCard variant="dense" className="p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Discharged</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{residents.filter((resident) => resident.status === "DISCHARGED").length}</p>
          </GlassCard>
          <GlassCard variant="dense" className="p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Attendance History</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalAttendanceMarks}</p>
          </GlassCard>
          <GlassCard variant="dense" className="p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/65">Pending Status Changes</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{changedCount}</p>
          </GlassCard>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusCounts.map(({ status, count }) => {
            const meta = residentStatusMeta[status];
            return (
              <Badge key={status} className={`border ${meta.chipClass}`}>
                {formatResidentStatusLabel(status)}: {count}
              </Badge>
            );
          })}
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by resident name, room, unit, or status"
            className="h-11 border-white/70 bg-white/90 pl-9 pr-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/55 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </GlassPanel>

      <form id={bulkStatusFormId} action={saveAllResidentStatuses} className="space-y-4">
        {residents.map((resident) => (
          <div key={`status-hidden-${resident.id}`}>
            <input type="hidden" name="residentIds" value={resident.id} />
            <input type="hidden" name={`status_${resident.id}`} value={statusDrafts[resident.id] ?? resident.status} />
          </div>
        ))}

        {allowCreate ? (
          <GlassCard variant="dense" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-foreground/75">
                Update statuses in the table, then save once.
              </p>
              <GlassButton type="submit" size="sm" disabled={changedCount === 0}>
                Save all status changes
              </GlassButton>
            </div>
          </GlassCard>
        ) : null}
      </form>

      <GlassCard variant="dense" className="overflow-hidden p-0">
        <div className="border-b border-white/60 bg-white/75 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Current Residents</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Update status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentResidents.map((resident) => {
                const status = statusDrafts[resident.id] ?? resident.status;
                const meta = residentStatusMeta[status];
                const StatusIcon = meta.icon;

                return (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">{resident.firstName} {resident.lastName}</TableCell>
                    <TableCell>{resident.room}</TableCell>
                    <TableCell>{resident.unitName ?? "-"}</TableCell>
                    <TableCell>{resident.attendanceCount}</TableCell>
                    <TableCell>
                      <Badge className={`w-fit gap-1 border ${meta.badgeClass}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {formatResidentStatusLabel(status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {allowCreate ? (
                        <select
                          value={status}
                          onChange={(event) => {
                            const nextStatus = event.target.value as ResidentStatusValue;
                            setStatusDrafts((previous) => ({
                              ...previous,
                              [resident.id]: nextStatus
                            }));
                          }}
                          className="h-9 rounded-md border border-white/70 bg-white/90 px-2 text-xs"
                        >
                          {residentStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {formatResidentStatusLabel(option)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Read-only</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/app/residents/${resident.id}`}>Open</Link>
                        </Button>
                        {allowCreate ? (
                          <form action={deleteResident}>
                            <input type="hidden" name="residentId" value={resident.id} />
                            <Button type="submit" size="sm" variant="destructive">Delete</Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {currentResidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    No current residents match your search.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      <details className="rounded-2xl border border-white/60 bg-white/70">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
          Discharged Residents ({dischargedResidents.length})
        </summary>
        <div className="border-t border-white/60 p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Update status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dischargedResidents.map((resident) => {
                  const status = statusDrafts[resident.id] ?? resident.status;
                  const meta = residentStatusMeta[status];
                  const StatusIcon = meta.icon;

                  return (
                    <TableRow key={`discharged-${resident.id}`}>
                      <TableCell className="font-medium">{resident.firstName} {resident.lastName}</TableCell>
                      <TableCell>{resident.room}</TableCell>
                      <TableCell>{resident.unitName ?? "-"}</TableCell>
                      <TableCell>{resident.attendanceCount}</TableCell>
                      <TableCell>
                        <Badge className={`w-fit gap-1 border ${meta.badgeClass}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {formatResidentStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {allowCreate ? (
                          <select
                            value={status}
                            onChange={(event) => {
                              const nextStatus = event.target.value as ResidentStatusValue;
                              setStatusDrafts((previous) => ({
                                ...previous,
                                [resident.id]: nextStatus
                              }));
                            }}
                            className="h-9 rounded-md border border-white/70 bg-white/90 px-2 text-xs"
                          >
                            {residentStatusOptions.map((option) => (
                              <option key={option} value={option}>
                                {formatResidentStatusLabel(option)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">Read-only</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/app/residents/${resident.id}`}>Open</Link>
                          </Button>
                          {allowCreate ? (
                            <form action={deleteResident}>
                              <input type="hidden" name="residentId" value={resident.id} />
                              <Button type="submit" size="sm" variant="destructive">Delete</Button>
                            </form>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {dischargedResidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      No discharged residents match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </details>

      {allowCreate ? (
        <div className="flex justify-end">
          <GlassButton type="submit" form={bulkStatusFormId} disabled={changedCount === 0}>
            Save all status changes
          </GlassButton>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/70 bg-white/70 px-4 py-3 text-xs text-foreground/65">
          Read-only role: status updates and delete are disabled.
        </div>
      )}
    </div>
  );
}
