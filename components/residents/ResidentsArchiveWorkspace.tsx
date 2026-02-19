"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toResidentStatusLabel, type ResidentListRow } from "@/lib/residents/types";
import { useToast } from "@/lib/use-toast";

export function ResidentsArchiveWorkspace({
  initialResidents
}: {
  initialResidents: ResidentListRow[];
}) {
  const { toast } = useToast();
  const [residents, setResidents] = useState(initialResidents);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const token = query.trim().toLowerCase();
    if (!token) return residents;
    return residents.filter((resident) => {
      const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
      const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
      return fullName.includes(token) || reverseName.includes(token) || resident.room.toLowerCase().includes(token);
    });
  }, [query, residents]);

  async function restoreResident(residentId: string) {
    const previous = residents;
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
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl border-white/15 p-4 shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">Archived Residents</h1>
            <p className="mt-1 text-sm text-foreground/75">
              Review discharged profiles and restore residents when needed.
            </p>
          </div>
          <Button asChild variant="outline" className="bg-white/70 shadow-lg shadow-black/10">
            <Link href="/residents">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Residents
            </Link>
          </Button>
        </div>

        <div className="relative mt-4 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search archived residents"
            className="pl-9 shadow-lg shadow-black/10"
          />
        </div>
      </section>

      <section className="glass-panel rounded-2xl border-white/15 p-4 shadow-xl shadow-black/10">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/35 bg-white/45 p-8 text-center text-sm text-muted-foreground">
            No archived residents found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/20 bg-white/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last 1:1</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">
                      {resident.firstName} {resident.lastName}
                    </TableCell>
                    <TableCell>{resident.room}</TableCell>
                    <TableCell>{toResidentStatusLabel(resident.status)}</TableCell>
                    <TableCell>{resident.lastOneOnOneAt ? new Date(resident.lastOneOnOneAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white/70 shadow-lg shadow-black/10"
                        onClick={() => restoreResident(resident.id)}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
