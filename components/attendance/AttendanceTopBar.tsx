"use client";

import { CheckCircle2, CalendarDays, RotateCcw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AttendanceSessionSummary } from "@/lib/attendance-tracker/types";

export function AttendanceTopBar({
  dateKey,
  onDateChange,
  activityQuery,
  onActivityQueryChange,
  sessions,
  selectedSessionId,
  onSessionChange,
  unitFilter,
  onUnitFilterChange,
  unitOptions,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  disabled,
  onSave,
  onClear,
  saveLabel
}: {
  dateKey: string;
  onDateChange: (value: string) => void;
  activityQuery: string;
  onActivityQueryChange: (value: string) => void;
  sessions: AttendanceSessionSummary[];
  selectedSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  unitFilter: string;
  onUnitFilterChange: (value: string) => void;
  unitOptions: string[];
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  locationOptions: string[];
  disabled?: boolean;
  onSave: () => void;
  onClear: () => void;
  saveLabel?: string;
}) {
  return (
    <section className="sticky top-4 z-20 rounded-2xl border border-white/35 bg-white/70 p-3 shadow-lg shadow-black/10 backdrop-blur-md">
      <div className="grid gap-3 xl:grid-cols-[170px_1fr_170px_170px_auto]">
        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          <span className="mb-1 inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
            Date
          </span>
          <input
            type="date"
            value={dateKey}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
            Activity Search
            <input
              value={activityQuery}
              onChange={(event) => onActivityQueryChange(event.target.value)}
              placeholder="Type activity title"
              className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
            Activity Session
            <select
              value={selectedSessionId ?? ""}
              onChange={(event) => onSessionChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
            >
              {sessions.length === 0 ? <option value="">No sessions for date</option> : null}
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {new Date(session.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {session.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          Unit
          <select
            value={unitFilter}
            onChange={(event) => onUnitFilterChange(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          >
            <option value="all">All units</option>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/65">
          Location
          <select
            value={locationFilter}
            onChange={(event) => onLocationFilterChange(event.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
          >
            <option value="all">All locations</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end justify-end gap-2">
          <Button type="button" variant="outline" className="bg-white/80" onClick={onClear} disabled={disabled}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Clear
          </Button>
          <Button type="button" onClick={onSave} disabled={disabled}>
            <Save className="mr-1.5 h-4 w-4" />
            {saveLabel ?? "Save Attendance"}
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-300 bg-emerald-100/90 text-emerald-700">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          3-step quick flow
        </Badge>
        <Badge variant="outline" className="border-white/40 bg-white/70">
          Step 1: Choose date + activity
        </Badge>
        <Badge variant="outline" className="border-white/40 bg-white/70">
          Step 2: Mark residents
        </Badge>
        <Badge variant="outline" className="border-white/40 bg-white/70">
          Step 3: Save
        </Badge>
      </div>
    </section>
  );
}

