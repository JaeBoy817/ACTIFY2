"use client";

import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";

export type AttendanceSessionFiltersState = {
  from: string;
  to: string;
  activity: string;
  location: string;
  hasNotes: "all" | "yes" | "no";
};

export function AttendanceFilters({
  value,
  onChange,
  locations,
  onApply,
  loading
}: {
  value: AttendanceSessionFiltersState;
  onChange: (next: AttendanceSessionFiltersState) => void;
  locations: string[];
  onApply: () => void;
  loading?: boolean;
}) {
  return (
    <section className="glass-panel rounded-2xl border-white/15 p-3">
      <div className="grid gap-3 lg:grid-cols-[170px_170px_minmax(0,1fr)_180px_140px]">
        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          From
          <input
            type="date"
            value={value.from}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          To
          <input
            type="date"
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          Activity
          <input
            value={value.activity}
            onChange={(event) => onChange({ ...value, activity: event.target.value })}
            placeholder="Search activity title"
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          Location
          <select
            value={value.location}
            onChange={(event) => onChange({ ...value, location: event.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          >
            <option value="all">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          Notes
          <select
            value={value.hasNotes}
            onChange={(event) => onChange({ ...value, hasNotes: event.target.value as "all" | "yes" | "no" })}
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">With notes</option>
            <option value="no">No notes</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" onClick={onApply} disabled={loading}>
          <Filter className="mr-1.5 h-4 w-4" />
          {loading ? "Loading..." : "Apply filters"}
        </Button>
      </div>
    </section>
  );
}

