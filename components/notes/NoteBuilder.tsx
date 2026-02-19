"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Activity,
  Command,
  Copy,
  Hand,
  Heart,
  MessageCircle,
  Music,
  Save,
  Shield,
  Signpost,
  Sparkles,
  Tags,
  Users,
  WandSparkles
} from "lucide-react";

import { ResidentContextBanner } from "@/components/notes/ResidentContextBanner";
import { SaveStatusChip, type SaveState } from "@/components/notes/SaveStatusChip";
import { SectionCard } from "@/components/notes/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NoteBuilderValues, NoteTemplateLite } from "@/lib/notes/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

const LazyTemplateDrawer = dynamic(
  () => import("@/components/notes/TemplateDrawer").then((mod) => mod.TemplateDrawer),
  {
    ssr: false,
    loading: () => (
      <Button type="button" variant="outline" className="bg-white/85" disabled>
        Loading templates...
      </Button>
    )
  }
);

type ResidentContextRow = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  status: string;
  preferences?: string | null;
  safetyNotes?: string | null;
};

const INTERVENTION_LIBRARY = [
  "Encouragement",
  "Redirection",
  "Sensory support",
  "Validation",
  "Cueing",
  "Setup assistance",
  "Task simplification",
  "Break into short steps",
  "Choice offering",
  "Positive reinforcement"
];

const LOCATION_OPTIONS = [
  "Activity Room",
  "Dining Room",
  "Resident Room",
  "Hallway",
  "Front Porch",
  "Courtyard",
  "Outdoor",
  "Other"
];

const SETTING_OPTIONS = ["In-room", "Hallway", "Outdoor", "Dining", "Common Area", "Other"];
const FOCUS_OPTIONS = ["Music", "Conversation", "Sensory", "Games", "Life Review", "TV", "Craft", "Other"];

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
}

function draftStorageKey(noteId: string | null, type: NoteBuilderValues["noteType"], residentId?: string) {
  if (noteId) return `actify:note:draft:edit:${noteId}`;
  return `actify:note:draft:${type}:${residentId || "none"}`;
}

function toIsoFromInput(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function statusLabel(type: NoteBuilderValues["noteType"]) {
  return type === "1on1" ? "1:1 Note" : "General Note";
}

export function NoteBuilder({
  canEdit,
  noteId,
  initialValues,
  residents,
  templates
}: {
  canEdit: boolean;
  noteId: string | null;
  initialValues: NoteBuilderValues;
  residents: ResidentContextRow[];
  templates: NoteTemplateLite[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | undefined>(undefined);
  const [commandOpen, setCommandOpen] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [linkedResidentSearch, setLinkedResidentSearch] = useState("");
  const [searchResident, setSearchResident] = useState("");
  const autosaveTimerRef = useRef<number | null>(null);

  const form = useForm<NoteBuilderValues>({
    defaultValues: initialValues,
    mode: "onChange"
  });

  const noteType = useWatch({ control: form.control, name: "noteType" });
  const selectedResidentId = useWatch({ control: form.control, name: "residentId" });
  const linkedResidentIds = useWatch({ control: form.control, name: "linkedResidentIds" }) ?? [];
  const selectedTags = useWatch({ control: form.control, name: "tags" }) ?? [];
  const occurredAtValue = useWatch({ control: form.control, name: "occurredAt" });
  const narrativeValue = useWatch({ control: form.control, name: "narrative" });
  const activityValue = useWatch({ control: form.control, name: "activityLabel" });
  const locationValue = useWatch({ control: form.control, name: "location" });
  const settingValue = useWatch({ control: form.control, name: "setting" });

  const selectedResident = useMemo(() => {
    return residents.find((resident) => resident.id === selectedResidentId) ?? null;
  }, [residents, selectedResidentId]);

  const filteredResidents = useMemo(() => {
    const q = searchResident.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((resident) => {
      const text = `${resident.firstName} ${resident.lastName} ${resident.room} ${resident.status}`.toLowerCase();
      return text.includes(q);
    });
  }, [residents, searchResident]);

  const filteredLinkedResidents = useMemo(() => {
    const q = linkedResidentSearch.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((resident) => {
      const text = `${resident.firstName} ${resident.lastName} ${resident.room}`.toLowerCase();
      return text.includes(q);
    });
  }, [linkedResidentSearch, residents]);

  const linkedParentRef = useRef<HTMLDivElement>(null);
  const linkedVirtualizer = useVirtualizer({
    count: filteredLinkedResidents.length,
    getScrollElement: () => linkedParentRef.current,
    estimateSize: () => 36,
    overscan: 8
  });

  const requiredCount = useMemo(() => {
    const checks = [
      occurredAtValue?.trim().length > 0,
      narrativeValue?.trim().length >= 10,
      activityValue?.trim().length > 0,
      noteType === "1on1" ? selectedResidentId?.trim().length > 0 : true,
      (noteType === "1on1" ? settingValue : locationValue)?.trim().length > 0
    ];
    return checks.filter(Boolean).length;
  }, [activityValue, locationValue, narrativeValue, noteType, occurredAtValue, selectedResidentId, settingValue]);

  const totalRequired = noteType === "1on1" ? 5 : 4;

  const storageKey = useMemo(() => {
    return draftStorageKey(noteId, noteType, selectedResidentId);
  }, [noteId, noteType, selectedResidentId]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        persistDraft();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void signNote();
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (noteId) return;
    const existing = window.localStorage.getItem(storageKey);
    setDraftAvailable(Boolean(existing));
  }, [noteId, storageKey]);

  useEffect(() => {
    if (!canEdit) return;
    const subscription = form.watch((values) => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      setSaveState("saving");
      setSaveMessage("Saving draft...");
      autosaveTimerRef.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify({ ...values, updatedAt: Date.now() }));
          setSaveState("saved");
          setSaveMessage("Draft saved locally");
        } catch {
          setSaveState("error");
          setSaveMessage("Could not save draft");
        }
      }, 950);
    });

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, [canEdit, form, storageKey]);

  function persistDraft() {
    try {
      const values = form.getValues();
      window.localStorage.setItem(storageKey, JSON.stringify({ ...values, updatedAt: Date.now() }));
      setSaveState("saved");
      setSaveMessage("Draft saved locally");
      toast({ title: "Draft saved", description: "You can continue this note later." });
    } catch {
      setSaveState("error");
      setSaveMessage("Could not save draft");
      toast({ title: "Could not save draft", variant: "destructive" });
    }
  }

  function loadDraft() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as NoteBuilderValues;
      form.reset(parsed);
      setDraftAvailable(false);
      setSaveState("saved");
      setSaveMessage("Recovered draft");
      toast({ title: "Draft restored" });
    } catch {
      toast({ title: "Draft recovery failed", variant: "destructive" });
    }
  }

  function discardDraft() {
    window.localStorage.removeItem(storageKey);
    setDraftAvailable(false);
    setSaveState("idle");
    setSaveMessage(undefined);
  }

  async function submitToApi(method: "POST" | "PATCH") {
    const rawValues = form.getValues();

    const payload: NoteBuilderValues = {
      ...rawValues,
      tags: (rawValues.tags ?? []).map(normalizeTag).filter(Boolean),
      linkedResidentIds: Array.from(new Set(rawValues.linkedResidentIds ?? [])),
      occurredAt: toIsoFromInput(rawValues.occurredAt)
    };

    setSaveState("saving");
    setSaveMessage("Saving note...");

    try {
      const target = method === "PATCH" && noteId ? `/api/notes/${noteId}` : "/api/notes";
      const response = await fetch(target, {
        method,
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save note.");
      }

      window.localStorage.removeItem(storageKey);
      setSaveState("saved");
      setSaveMessage("Signed ✓");

      toast({
        title: method === "PATCH" ? "Note updated" : "Note signed",
        description: "The note is now available in Notes list."
      });

      const note = body?.note as { id: string } | undefined;
      if (note?.id) {
        router.push(`/app/notes/new?noteId=${note.id}&type=${payload.noteType}`);
      }
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setSaveMessage("Could not save, retry");
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save note.",
        variant: "destructive"
      });
    }
  }

  async function signNote() {
    if (!canEdit) return;
    const values = form.getValues();
    if (!values.narrative.trim() || values.narrative.trim().length < 10) {
      toast({ title: "Narrative is required", description: "Please add at least 10 characters.", variant: "destructive" });
      return;
    }

    if (values.noteType === "1on1" && !values.residentId) {
      toast({ title: "Resident required", description: "Select a resident for 1:1 notes.", variant: "destructive" });
      return;
    }

    await submitToApi(noteId ? "PATCH" : "POST");
  }

  function copyNarrative() {
    const value = form.getValues("narrative");
    navigator.clipboard
      .writeText(value)
      .then(() => toast({ title: "Narrative copied" }))
      .catch(() => toast({ title: "Copy failed", variant: "destructive" }));
  }

  const preferences = selectedResident?.preferences
    ? selectedResident.preferences.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    : [];
  const safety = selectedResident?.safetyNotes
    ? selectedResident.safetyNotes.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      <section className="sticky top-3 z-20 rounded-2xl border border-white/35 bg-white/75 p-3 shadow-lg shadow-black/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/35 bg-white/70">
              {statusLabel(noteType)}
            </Badge>
            <Badge variant="outline" className="border-white/35 bg-white/70">
              Required {requiredCount}/{totalRequired}
            </Badge>
            <SaveStatusChip state={saveState} message={saveMessage} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="bg-white/85" onClick={persistDraft} disabled={!canEdit}>
              <Save className="mr-1.5 h-4 w-4" />
              Save Draft
            </Button>
            <LazyTemplateDrawer
              templates={templates}
              currentType={noteType}
              onApply={(template) => {
                const nextTags = Array.from(new Set([...form.getValues("tags"), ...template.tags.filter((tag) => !tag.startsWith("type:"))]));
                form.setValue("tags", nextTags, { shouldDirty: true });
                form.setValue("interventions", template.quickPhrases.slice(0, 10), { shouldDirty: true });
                if (template.narrativeStarter.trim()) {
                  form.setValue("narrative", template.narrativeStarter.trim(), { shouldDirty: true });
                }
                toast({ title: "Template applied", description: template.title });
              }}
            />
            <Button type="button" variant="outline" className="bg-white/85" onClick={copyNarrative}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copy
            </Button>
            <Button type="button" variant="outline" className="bg-white/85" onClick={() => window.print()}>
              Print
            </Button>
            <Button type="button" onClick={() => void signNote()} disabled={!canEdit}>
              <Signpost className="mr-1.5 h-4 w-4" />
              {noteId ? "Save Changes" : "Sign Note"}
            </Button>
          </div>
        </div>
      </section>

      {draftAvailable ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Continue last draft?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={loadDraft}>
              Continue Draft
            </Button>
            <Button type="button" size="sm" variant="outline" className="bg-white" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </section>
      ) : null}

      {noteType === "1on1" && selectedResident ? (
        <ResidentContextBanner
          resident={{
            id: selectedResident.id,
            name: `${selectedResident.firstName} ${selectedResident.lastName}`,
            room: selectedResident.room,
            status: selectedResident.status,
            preferences,
            safety
          }}
          href={`/app/residents/${selectedResident.id}`}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section id="basics" className="rounded-2xl border border-white/25 bg-white/78 p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
            <h2 className="inline-flex items-center gap-2 font-[var(--font-display)] text-xl">
              <Sparkles className="h-5 w-5 text-pink-600" />
              Basics
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Fast entry first, details second.</p>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="text-sm">
                Title (optional)
                <Input {...form.register("title")} placeholder="Optional title" className="mt-1" disabled={!canEdit} />
              </label>

              <label className="text-sm">
                Date & time
                <Controller
                  control={form.control}
                  name="occurredAt"
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={field.value}
                      onChange={field.onChange}
                      className="mt-1"
                      disabled={!canEdit}
                    />
                  )}
                />
              </label>

              <label className="text-sm">
                Note type
                <Controller
                  control={form.control}
                  name="noteType"
                  render={({ field }) => (
                    <select
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                      disabled={!canEdit || Boolean(noteId)}
                    >
                      <option value="general">General</option>
                      <option value="1on1">1:1</option>
                    </select>
                  )}
                />
              </label>

              {noteType === "1on1" ? (
                <label className="text-sm">
                  Resident
                  <Controller
                    control={form.control}
                    name="residentId"
                    render={({ field }) => (
                      <>
                        <Input
                          value={searchResident}
                          onChange={(event) => setSearchResident(event.target.value)}
                          placeholder="Search resident"
                          className="mt-1"
                          disabled={!canEdit}
                        />
                        <select
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          className="mt-2 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                          disabled={!canEdit}
                        >
                          <option value="">Select resident</option>
                          {filteredResidents.map((resident) => (
                            <option key={resident.id} value={resident.id}>
                              {resident.lastName}, {resident.firstName} · Room {resident.room}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  />
                </label>
              ) : (
                <label className="text-sm">
                  Location
                  <Controller
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <select
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                        disabled={!canEdit}
                      >
                        <option value="">Select location</option>
                        {LOCATION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </label>
              )}

              {noteType === "1on1" ? (
                <label className="text-sm">
                  Setting
                  <Controller
                    control={form.control}
                    name="setting"
                    render={({ field }) => (
                      <select
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                        disabled={!canEdit}
                      >
                        <option value="">Select setting</option>
                        {SETTING_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </label>
              ) : null}

              <label className={cn("text-sm", noteType === "1on1" ? "lg:col-span-2" : "") }>
                {noteType === "1on1" ? "1:1 Focus" : "Activity / Topic"}
                <Controller
                  control={form.control}
                  name="activityLabel"
                  render={({ field }) => (
                    <input
                      list="note-focus-options"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                      placeholder={noteType === "1on1" ? "Select or type focus" : "Select or type topic"}
                      disabled={!canEdit}
                    />
                  )}
                />
              </label>

              <datalist id="note-focus-options">
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>

              <label className="text-sm lg:col-span-2">
                Narrative
                <Textarea
                  {...form.register("narrative")}
                  placeholder="Write the note narrative..."
                  rows={8}
                  className="mt-1 resize-y"
                  disabled={!canEdit}
                />
              </label>
            </div>
          </section>

          <SectionCard id="participation" title="Participation & Response" icon={<Activity className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Participation
                <Controller
                  control={form.control}
                  name="participationLevel"
                  render={({ field }) => (
                    <select
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                      disabled={!canEdit}
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  )}
                />
              </label>

              <label className="text-sm">
                Response
                <Controller
                  control={form.control}
                  name="responseType"
                  render={({ field }) => (
                    <select
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                      disabled={!canEdit}
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="resistant">Resistant</option>
                    </select>
                  )}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard id="mood" title="Mood & Cues" icon={<Heart className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Mood/Affect
                <Controller
                  control={form.control}
                  name="mood"
                  render={({ field }) => (
                    <select
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                      disabled={!canEdit}
                    >
                      <option value="bright">Bright</option>
                      <option value="calm">Calm</option>
                      <option value="flat">Flat</option>
                      <option value="anxious">Anxious</option>
                      <option value="agitated">Agitated</option>
                      <option value="other">Other</option>
                    </select>
                  )}
                />
              </label>

              <label className="text-sm">
                Cues/Assist
                <Controller
                  control={form.control}
                  name="cues"
                  render={({ field }) => (
                    <select
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/80 px-3 text-sm"
                      disabled={!canEdit}
                    >
                      <option value="none">None</option>
                      <option value="verbal">Verbal</option>
                      <option value="visual">Visual</option>
                      <option value="hand_on_hand">Hand-over-hand</option>
                      <option value="physical_assist">Physical assist</option>
                    </select>
                  )}
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard id="interventions" title="Interventions" icon={<WandSparkles className="h-4 w-4" />}>
            <Controller
              control={form.control}
              name="interventions"
              render={({ field }) => {
                const selected = field.value ?? [];
                return (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {INTERVENTION_LIBRARY.map((item) => {
                      const active = selected.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            if (!canEdit) return;
                            if (active) {
                              field.onChange(selected.filter((value) => value !== item));
                            } else {
                              field.onChange([...selected, item]);
                            }
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left text-sm transition",
                            active
                              ? "border-[color:var(--actify-accent)] bg-[color:var(--actify-accent)]/15 text-foreground"
                              : "border-white/35 bg-white/70 hover:bg-white"
                          )}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            />
          </SectionCard>

          <SectionCard id="follow-up" title="Follow Up" icon={<MessageCircle className="h-4 w-4" />}>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(form.watch("followUpNeeded"))}
                  onChange={(event) => form.setValue("followUpNeeded", event.target.checked, { shouldDirty: true })}
                  disabled={!canEdit}
                />
                Follow up needed
              </label>
              <Textarea
                {...form.register("followUpNotes")}
                rows={4}
                placeholder="Optional follow-up instructions"
                disabled={!canEdit}
              />
            </div>
          </SectionCard>

          {noteType === "general" ? (
            <SectionCard id="linked-residents" title="Linked Residents" icon={<Users className="h-4 w-4" />}>
              <Input
                value={linkedResidentSearch}
                onChange={(event) => setLinkedResidentSearch(event.target.value)}
                placeholder="Search residents"
                className="mb-2"
                disabled={!canEdit}
              />
              <div ref={linkedParentRef} className="h-[220px] overflow-auto rounded-lg border border-white/25 bg-white/55">
                <div style={{ height: linkedVirtualizer.getTotalSize(), position: "relative" }}>
                  {linkedVirtualizer.getVirtualItems().map((item) => {
                    const resident = filteredLinkedResidents[item.index];
                    if (!resident) return null;
                    const checked = linkedResidentIds.includes(resident.id);
                    return (
                      <div
                        key={resident.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${item.start}px)`
                        }}
                        className="px-2 py-1"
                      >
                        <label className="flex items-center justify-between rounded-md border border-white/30 bg-white/80 px-2 py-1.5 text-sm">
                          <span>
                            {resident.lastName}, {resident.firstName} · Room {resident.room}
                          </span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              if (!canEdit) return;
                              if (event.target.checked) {
                                form.setValue("linkedResidentIds", [...linkedResidentIds, resident.id], { shouldDirty: true });
                              } else {
                                form.setValue("linkedResidentIds", linkedResidentIds.filter((id) => id !== resident.id), { shouldDirty: true });
                              }
                            }}
                            disabled={!canEdit}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {noteType === "1on1" ? (
            <SectionCard id="communication" title="Communication / Mobility / Goal" icon={<Hand className="h-4 w-4" />}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Communication Method
                  <Input {...form.register("communicationMethod")} placeholder="Nonverbal, gestures, writing..." className="mt-1" disabled={!canEdit} />
                </label>
                <label className="text-sm">
                  Mobility/Access
                  <Input {...form.register("mobilityAccess")} placeholder="Bed-bound, wheelchair..." className="mt-1" disabled={!canEdit} />
                </label>
                <label className="text-sm">
                  Goal Link
                  <Input {...form.register("goalLink")} placeholder="Optional care plan goal" className="mt-1" disabled={!canEdit} />
                </label>
                <label className="text-sm">
                  Staff Present / Witness
                  <Input {...form.register("staffPresent")} placeholder="Optional" className="mt-1" disabled={!canEdit} />
                </label>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard id="tags" title="Tags" icon={<Tags className="h-4 w-4" />}>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="Add tag"
                disabled={!canEdit}
              />
              <Button
                type="button"
                onClick={() => {
                  const normalized = normalizeTag(tagInput);
                  if (!normalized) return;
                  if (!selectedTags.includes(normalized)) {
                    form.setValue("tags", [...selectedTags, normalized], { shouldDirty: true });
                  }
                  setTagInput("");
                }}
                disabled={!canEdit}
              >
                Add
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => form.setValue("tags", selectedTags.filter((value) => value !== tag), { shouldDirty: true })}
                    className="rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-xs text-pink-700"
                    disabled={!canEdit}
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No tags yet.</span>
              )}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/25 bg-white/75 p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/60">
              <Music className="h-3.5 w-3.5 text-pink-600" />
              Quick Guide
            </p>
            <ol className="mt-2 space-y-2 text-sm text-foreground/80">
              <li>1. Fill Basics: date, focus, narrative.</li>
              <li>2. Expand only needed details.</li>
              <li>3. Save draft or sign to lock note.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-white/25 bg-white/75 p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/60">
              <Shield className="h-3.5 w-3.5 text-cyan-600" />
              Shortcuts
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-foreground/80">
              <li><kbd className="rounded bg-white px-1">Ctrl/Cmd + S</kbd> Save draft</li>
              <li><kbd className="rounded bg-white px-1">Ctrl/Cmd + Enter</kbd> Sign note</li>
              <li><kbd className="rounded bg-white px-1">Ctrl/Cmd + K</kbd> Command menu</li>
            </ul>
          </section>
        </aside>
      </div>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-md rounded-2xl border-white/25 bg-white/90">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2 font-[var(--font-display)] text-xl">
              <Command className="h-4 w-4" />
              Jump to Section
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {[
              { id: "basics", label: "Basics" },
              { id: "participation", label: "Participation & Response" },
              { id: "mood", label: "Mood & Cues" },
              { id: "interventions", label: "Interventions" },
              { id: "follow-up", label: "Follow Up" },
              ...(noteType === "general" ? [{ id: "linked-residents", label: "Linked Residents" }] : []),
              ...(noteType === "1on1" ? [{ id: "communication", label: "Communication & Mobility" }] : []),
              { id: "tags", label: "Tags" }
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="w-full justify-start bg-white/80"
                onClick={() => {
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setCommandOpen(false);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
