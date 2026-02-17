"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, ClipboardList, Search, Sparkles, Users, X } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatResidentStatusLabel, type ResidentStatusValue } from "@/lib/resident-status";
import { cn } from "@/lib/utils";

const noteFieldTone = {
  participation: "bg-actifyBlue/15 text-actifyBlue border-actifyBlue/25",
  mood: "bg-actifyMint/20 text-foreground border-actifyMint/35",
  cues: "bg-actifyCoral/18 text-foreground border-actifyCoral/30",
  response: "bg-amber-100/80 text-amber-800 border-amber-200"
} as const;

const residentStatusTone: Record<ResidentStatusValue, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  BED_BOUND: "border-sky-200 bg-sky-50 text-sky-700",
  DISCHARGED: "border-zinc-300 bg-zinc-100 text-zinc-700",
  HOSPITALIZED: "border-rose-200 bg-rose-50 text-rose-700",
  ON_LEAVE: "border-indigo-200 bg-indigo-50 text-indigo-700",
  TRANSFERRED: "border-amber-200 bg-amber-50 text-amber-700",
  DECEASED: "border-slate-300 bg-slate-200 text-slate-700",
  OTHER: "border-violet-200 bg-violet-50 text-violet-700"
};

type ResidentOption = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  status: ResidentStatusValue;
  isActive: boolean;
};

type OneToOneNoteRow = {
  id: string;
  residentId: string;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  cuesRequired: "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
  narrative: string;
  followUp: string | null;
  createdAt: string;
  createdByName: string | null;
  resident: ResidentOption;
};

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function countNotesForResident(notes: OneToOneNoteRow[], residentId: string) {
  return notes.reduce((count, note) => (note.residentId === residentId ? count + 1 : count), 0);
}

function getLastNoteForResident(notes: OneToOneNoteRow[], residentId: string) {
  const record = notes.find((note) => note.residentId === residentId);
  return record ?? null;
}

export function OneToOneLiveWorkspace({
  residents,
  notes,
  canEdit,
  initialResidentId,
  initialQuery,
  totalNotesCount,
  residentsTouchedLast30,
  createOneToOneNote,
  deleteOneToOneNote
}: {
  residents: ResidentOption[];
  notes: OneToOneNoteRow[];
  canEdit: boolean;
  initialResidentId: string;
  initialQuery: string;
  totalNotesCount: number;
  residentsTouchedLast30: number;
  createOneToOneNote: (formData: FormData) => Promise<void> | void;
  deleteOneToOneNote: (formData: FormData) => Promise<void> | void;
}) {
  const [searchText, setSearchText] = useState(initialQuery);
  const [residentFilterId, setResidentFilterId] = useState(initialResidentId);
  const [formResidentLookup, setFormResidentLookup] = useState("");
  const [formResidentId, setFormResidentId] = useState(initialResidentId);
  const [participationFilter, setParticipationFilter] = useState<"ALL" | "MINIMAL" | "MODERATE" | "HIGH">("ALL");
  const [responseFilter, setResponseFilter] = useState<"ALL" | "POSITIVE" | "NEUTRAL" | "RESISTANT">("ALL");

  const residentMap = useMemo(() => new Map(residents.map((resident) => [resident.id, resident])), [residents]);
  const normalizedSearch = searchText.trim().toLowerCase();
  const normalizedResidentLookup = formResidentLookup.trim().toLowerCase();

  const formResidents = useMemo(() => {
    const base = normalizedResidentLookup
      ? residents.filter((resident) => {
          const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase();
          const reverseName = `${resident.lastName}, ${resident.firstName}`.toLowerCase();
          return fullName.includes(normalizedResidentLookup) || reverseName.includes(normalizedResidentLookup) || resident.room.toLowerCase().includes(normalizedResidentLookup);
        })
      : residents;

    if (!formResidentId) return base;

    if (base.some((resident) => resident.id === formResidentId)) return base;

    const selected = residentMap.get(formResidentId);
    return selected ? [selected, ...base] : base;
  }, [formResidentId, normalizedResidentLookup, residentMap, residents]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (residentFilterId && note.residentId !== residentFilterId) return false;
      if (participationFilter !== "ALL" && note.participationLevel !== participationFilter) return false;
      if (responseFilter !== "ALL" && note.response !== responseFilter) return false;
      if (!normalizedSearch) return true;

      const fullName = `${note.resident.firstName} ${note.resident.lastName}`.toLowerCase();
      const reverseName = `${note.resident.lastName}, ${note.resident.firstName}`.toLowerCase();
      const searchableText = [
        note.narrative,
        note.followUp ?? "",
        note.resident.room,
        fullName,
        reverseName,
        note.createdByName ?? "",
        note.participationLevel,
        note.moodAffect,
        note.response,
        note.cuesRequired
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [normalizedSearch, notes, participationFilter, residentFilterId, responseFilter]);

  const notesToday = useMemo(() => {
    const now = new Date();
    return notes.filter((note) => {
      const created = new Date(note.createdAt);
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate()
      );
    }).length;
  }, [notes]);

  const notesWithFollowUp = useMemo(() => {
    return notes.reduce((count, note) => (note.followUp?.trim() ? count + 1 : count), 0);
  }, [notes]);

  const selectedResident = residentFilterId ? residentMap.get(residentFilterId) ?? null : null;
  const selectedResidentLastNote = selectedResident ? getLastNoteForResident(notes, selectedResident.id) : null;
  const selectedResidentNoteCount = selectedResident ? countNotesForResident(notes, selectedResident.id) : 0;

  const responseBreakdown = useMemo(() => {
    const tally: Record<"POSITIVE" | "NEUTRAL" | "RESISTANT", number> = {
      POSITIVE: 0,
      NEUTRAL: 0,
      RESISTANT: 0
    };
    for (const note of filteredNotes) {
      tally[note.response] += 1;
    }
    return tally;
  }, [filteredNotes]);

  return (
    <div className="space-y-5">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-actifyBlue/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-16 h-28 w-28 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[var(--font-display)] text-3xl text-foreground">1:1 Notes</h1>
              <Badge className="border-0 bg-actifyBlue/15 text-actifyBlue">Live Workspace</Badge>
            </div>
            <p className="max-w-3xl text-sm text-foreground/75">
              Faster one-to-one documentation with real-time resident search, clearer note history, and deeper session detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild size="sm" variant="dense">
              <Link href="/app/notes/new">Open full note builder</Link>
            </GlassButton>
            <GlassButton asChild size="sm" variant="dense">
              <Link href="/app/residents">Residents</Link>
            </GlassButton>
          </div>
        </div>
      </GlassPanel>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard variant="dense" className="p-4">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Total 1:1 Notes</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalNotesCount}</p>
        </GlassCard>
        <GlassCard variant="dense" className="p-4">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Residents With Notes (30d)</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{residentsTouchedLast30}</p>
        </GlassCard>
        <GlassCard variant="dense" className="p-4">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Entries Today</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{notesToday}</p>
        </GlassCard>
        <GlassCard variant="dense" className="p-4">
          <p className="text-xs uppercase tracking-wide text-foreground/60">Follow-Up Logged</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{notesWithFollowUp}</p>
        </GlassCard>
      </section>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <GlassCard className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-foreground">Add 1:1 Note</p>
            <p className="text-sm text-foreground/70">
              Use the resident lookup to select quickly. Search updates in real time.
            </p>
          </div>

          <form action={createOneToOneNote} className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-foreground/65">
                Find Resident
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                <Input
                  value={formResidentLookup}
                  onChange={(event) => setFormResidentLookup(event.target.value)}
                  placeholder="Type room, first name, or last name"
                  className="h-10 border-white/70 bg-white/90 pl-9 pr-10"
                />
                {formResidentLookup ? (
                  <button
                    type="button"
                    onClick={() => setFormResidentLookup("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/55 hover:text-foreground"
                    aria-label="Clear resident lookup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <select
                name="residentId"
                className="h-10 w-full rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                value={formResidentId}
                onChange={(event) => setFormResidentId(event.target.value)}
                required
              >
                <option value="">Select resident</option>
                {formResidents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.room} - {resident.lastName}, {resident.firstName}
                  </option>
                ))}
              </select>
            </div>

            {formResidentId ? (
              <div className="rounded-xl border border-white/60 bg-white/75 p-3 text-xs text-foreground/75">
                <p className="font-medium text-foreground">
                  {residentMap.get(formResidentId)?.lastName}, {residentMap.get(formResidentId)?.firstName}
                </p>
                <p className="mt-1">
                  Room {residentMap.get(formResidentId)?.room} · {countNotesForResident(notes, formResidentId)} total 1:1 entries
                </p>
              </div>
            ) : null}

            <Input type="datetime-local" name="occurredAt" />

            <div className="grid gap-3 sm:grid-cols-2">
              <select name="participationLevel" defaultValue="MODERATE" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm">
                <option value="MINIMAL">Participation: Minimal</option>
                <option value="MODERATE">Participation: Moderate</option>
                <option value="HIGH">Participation: High</option>
              </select>
              <select name="moodAffect" defaultValue="CALM" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm">
                <option value="BRIGHT">Mood: Bright</option>
                <option value="CALM">Mood: Calm</option>
                <option value="FLAT">Mood: Flat</option>
                <option value="ANXIOUS">Mood: Anxious</option>
                <option value="AGITATED">Mood: Agitated</option>
              </select>
              <select name="cuesRequired" defaultValue="VERBAL" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm">
                <option value="NONE">Cues: None</option>
                <option value="VERBAL">Cues: Verbal</option>
                <option value="VISUAL">Cues: Visual</option>
                <option value="HAND_OVER_HAND">Cues: Hand over hand</option>
              </select>
              <select name="response" defaultValue="POSITIVE" className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm">
                <option value="POSITIVE">Response: Positive</option>
                <option value="NEUTRAL">Response: Neutral</option>
                <option value="RESISTANT">Response: Resistant</option>
              </select>
            </div>

            <Textarea name="narrative" placeholder="What happened during the 1:1 activity?" minLength={10} maxLength={4000} required />
            <Textarea name="followUp" placeholder="Follow-up, barriers, or next-step plan (optional)" maxLength={1200} />

            <GlassButton type="submit" className="w-full" disabled={!canEdit}>
              Save 1:1 Note
            </GlassButton>
            {!canEdit ? <p className="text-xs text-muted-foreground">Read-only role: you can view notes but cannot create or delete them.</p> : null}
          </form>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">Resident Note Feed</p>
                <p className="text-sm text-foreground/70">
                  Filter residents and note content instantly. No manual apply button needed.
                </p>
              </div>
              <Badge variant="outline" className="bg-white/70 text-xs">
                Showing {filteredNotes.length} of {notes.length}
              </Badge>
            </div>

            <div className="grid gap-2 md:grid-cols-[1.2fr_220px_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search resident, room, narrative, follow-up, or staff"
                  className="h-10 border-white/70 bg-white/90 pl-9 pr-10"
                />
                {searchText ? (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/55 hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <select
                className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                value={residentFilterId}
                onChange={(event) => {
                  setResidentFilterId(event.target.value);
                  if (event.target.value) setFormResidentId(event.target.value);
                }}
              >
                <option value="">All residents</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.room} - {resident.lastName}, {resident.firstName}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                value={participationFilter}
                onChange={(event) => setParticipationFilter(event.target.value as "ALL" | "MINIMAL" | "MODERATE" | "HIGH")}
              >
                <option value="ALL">All participation</option>
                <option value="HIGH">High</option>
                <option value="MODERATE">Moderate</option>
                <option value="MINIMAL">Minimal</option>
              </select>
              <select
                className="h-10 rounded-md border border-white/70 bg-white/90 px-3 text-sm"
                value={responseFilter}
                onChange={(event) => setResponseFilter(event.target.value as "ALL" | "POSITIVE" | "NEUTRAL" | "RESISTANT")}
              >
                <option value="ALL">All responses</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="RESISTANT">Resistant</option>
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/60 bg-white/75 p-3 text-xs text-foreground/70">
                <p className="font-medium text-foreground">Positive</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{responseBreakdown.POSITIVE}</p>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/75 p-3 text-xs text-foreground/70">
                <p className="font-medium text-foreground">Neutral</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{responseBreakdown.NEUTRAL}</p>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/75 p-3 text-xs text-foreground/70">
                <p className="font-medium text-foreground">Resistant</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{responseBreakdown.RESISTANT}</p>
              </div>
            </div>

            {selectedResident ? (
              <div className="rounded-xl border border-white/60 bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedResident.lastName}, {selectedResident.firstName}
                    </p>
                    <p className="text-xs text-foreground/65">Room {selectedResident.room}</p>
                  </div>
                  <Badge className={cn("border text-xs", residentStatusTone[selectedResident.status])}>
                    {formatResidentStatusLabel(selectedResident.status)}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-foreground/70 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2">
                    <p className="font-medium text-foreground">Total 1:1 entries</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{selectedResidentNoteCount}</p>
                  </div>
                  <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2">
                    <p className="font-medium text-foreground">Last documented</p>
                    <p className="mt-1 text-sm text-foreground">
                      {selectedResidentLastNote ? formatDateTime(selectedResidentLastNote.createdAt) : "No entries yet"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/70 bg-white/60 p-3 text-xs text-foreground/70">
                Select a resident to view focused entry coverage and recent documentation.
              </div>
            )}
          </GlassCard>

          <div className="space-y-3">
            {filteredNotes.length === 0 ? (
              <GlassCard variant="dense" className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No 1:1 notes found for the current filters.</p>
              </GlassCard>
            ) : null}

            {filteredNotes.map((note) => (
              <GlassCard key={note.id} variant="dense" className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {note.resident.lastName}, {note.resident.firstName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/65">
                      <span>Room {note.resident.room}</span>
                      <Badge className={cn("border text-[11px]", residentStatusTone[note.resident.status])}>
                        {formatResidentStatusLabel(note.resident.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-foreground/65">
                    <p>{formatDateTime(note.createdAt)}</p>
                    <p className="mt-1">By {note.createdByName ?? "Staff"}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Badge className={cn("justify-center border px-3 py-1", noteFieldTone.participation)}>
                    <Users className="mr-1 h-3.5 w-3.5" />
                    {toLabel(note.participationLevel)}
                  </Badge>
                  <Badge className={cn("justify-center border px-3 py-1", noteFieldTone.mood)}>
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    {toLabel(note.moodAffect)}
                  </Badge>
                  <Badge className={cn("justify-center border px-3 py-1", noteFieldTone.cues)}>
                    <ClipboardList className="mr-1 h-3.5 w-3.5" />
                    {toLabel(note.cuesRequired)}
                  </Badge>
                  <Badge className={cn("justify-center border px-3 py-1", noteFieldTone.response)}>
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                    {toLabel(note.response)}
                  </Badge>
                </div>

                <div className="rounded-xl border border-white/60 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">Narrative</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{note.narrative}</p>
                </div>

                {note.followUp?.trim() ? (
                  <div className="rounded-xl border border-white/60 bg-actifyMint/12 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">Follow-Up Snapshot</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{note.followUp}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/residents/${note.resident.id}`}>Open resident</Link>
                  </Button>
                  {canEdit ? (
                    <form action={deleteOneToOneNote}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        Delete
                      </Button>
                    </form>
                  ) : null}
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
