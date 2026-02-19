"use client";

import Link from "next/link";
import { Archive, Plus, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResidentsHeader({
  search,
  onSearchChange,
  onOpenAddResident,
  onOpenImport,
  canEdit
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenAddResident: () => void;
  onOpenImport: () => void;
  canEdit: boolean;
}) {
  return (
    <section className="glass-panel rounded-2xl border-white/15 p-4 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl text-foreground">Residents</h1>
          <p className="mt-1 text-sm text-foreground/75">
            Keep census, preferences, and 1:1 follow-up context in one workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onOpenAddResident} disabled={!canEdit} className="shadow-lg shadow-actifyBlue/25">
            <Plus className="mr-1 h-4 w-4" />
            Add Resident
          </Button>
          <Button type="button" variant="outline" onClick={onOpenImport} disabled={!canEdit} className="bg-white/70 shadow-lg shadow-black/10">
            <Upload className="mr-1 h-4 w-4" />
            Import
          </Button>
          <Button asChild variant="outline" className="bg-white/70 shadow-lg shadow-black/10">
            <Link href="/residents/archive">
              <Archive className="mr-1 h-4 w-4" />
              Archive
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative mt-4 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search resident name, room, tag, or status"
          className="pl-9 shadow-lg shadow-black/10"
        />
      </div>
    </section>
  );
}
