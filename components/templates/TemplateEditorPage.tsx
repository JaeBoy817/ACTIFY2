"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TEMPLATE_TYPE_OPTIONS, type TemplateType, type UnifiedTemplate } from "@/lib/templates/types";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type ActivityState = {
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedMinutes: string;
  supplies: string;
  setupSteps: string;
  checklistItems: string;
  adaptationBedBound: string;
  adaptationDementia: string;
  adaptationLowVision: string;
  adaptationOneToOne: string;
};

type NoteState = {
  fieldMood: boolean;
  fieldCues: boolean;
  fieldParticipation: boolean;
  fieldResponse: boolean;
  fieldFollowUp: boolean;
  opening: string;
  body: string;
  followUp: string;
  quickPhrases: string;
};

function defaultActivityState(): ActivityState {
  return {
    difficulty: "Medium",
    estimatedMinutes: "",
    supplies: "",
    setupSteps: "",
    checklistItems: "",
    adaptationBedBound: "",
    adaptationDementia: "",
    adaptationLowVision: "",
    adaptationOneToOne: ""
  };
}

function defaultNoteState(): NoteState {
  return {
    fieldMood: true,
    fieldCues: true,
    fieldParticipation: true,
    fieldResponse: true,
    fieldFollowUp: true,
    opening: "",
    body: "",
    followUp: "",
    quickPhrases: ""
  };
}

function splitMultiline(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function tagsFromInput(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function TemplateEditorPage({
  mode,
  canEdit,
  initialTemplate,
  initialType
}: {
  mode: "create" | "edit";
  canEdit: boolean;
  initialTemplate?: UnifiedTemplate | null;
  initialType?: TemplateType | null;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const startingType = (initialTemplate?.type ?? initialType ?? null) as "activity" | "note" | null;
  const [type, setType] = useState<"activity" | "note" | null>(startingType);
  const [activeSection, setActiveSection] = useState("basics");
  const [title, setTitle] = useState(initialTemplate?.title ?? "");
  const [category, setCategory] = useState(initialTemplate?.category ?? "");
  const [tags, setTags] = useState(initialTemplate?.tags.join(", ") ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const [activity, setActivity] = useState<ActivityState>(() => {
    if (initialTemplate?.type !== "activity") return defaultActivityState();
    const payload = initialTemplate.payload;
    if (!("difficulty" in payload)) return defaultActivityState();
    return {
      difficulty: payload.difficulty,
      estimatedMinutes: payload.estimatedMinutes ? String(payload.estimatedMinutes) : "",
      supplies: payload.supplies.join("\n"),
      setupSteps: payload.setupSteps.join("\n"),
      checklistItems: payload.checklistItems.join("\n"),
      adaptationBedBound: payload.adaptations.bedBound,
      adaptationDementia: payload.adaptations.dementia,
      adaptationLowVision: payload.adaptations.lowVision,
      adaptationOneToOne: payload.adaptations.oneToOne
    };
  });

  const [note, setNote] = useState<NoteState>(() => {
    if (initialTemplate?.type !== "note") return defaultNoteState();
    const payload = initialTemplate.payload;
    if (!("fieldsEnabled" in payload)) return defaultNoteState();
    return {
      fieldMood: payload.fieldsEnabled.mood,
      fieldCues: payload.fieldsEnabled.cues,
      fieldParticipation: payload.fieldsEnabled.participation,
      fieldResponse: payload.fieldsEnabled.response,
      fieldFollowUp: payload.fieldsEnabled.followUp,
      opening: payload.defaultTextBlocks.opening ?? "",
      body: payload.defaultTextBlocks.body ?? "",
      followUp: payload.defaultTextBlocks.followUp ?? "",
      quickPhrases: payload.quickPhrases.join("\n")
    };
  });

  const sections = useMemo(() => {
    if (type === "activity") {
      return [
        { id: "basics", label: "Basics" },
        { id: "content", label: "Supplies + Setup" },
        { id: "adaptations", label: "Adaptations" }
      ];
    }
    if (type === "note") {
      return [
        { id: "basics", label: "Basics" },
        { id: "fields", label: "Fields" },
        { id: "content", label: "Default Text" }
      ];
    }
    return [{ id: "basics", label: "Basics" }];
  }, [type]);

  async function handleSave() {
    if (!canEdit || !type) return;
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Add a template title before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload =
        type === "activity"
          ? {
              type,
              title: title.trim(),
              category: category.trim() || "General",
              tags: tagsFromInput(tags),
              payload: {
                difficulty: activity.difficulty,
                estimatedMinutes: activity.estimatedMinutes ? Number(activity.estimatedMinutes) : null,
                supplies: splitMultiline(activity.supplies),
                setupSteps: splitMultiline(activity.setupSteps),
                checklistItems: splitMultiline(activity.checklistItems),
                adaptations: {
                  bedBound: activity.adaptationBedBound.trim(),
                  dementia: activity.adaptationDementia.trim(),
                  lowVision: activity.adaptationLowVision.trim(),
                  oneToOne: activity.adaptationOneToOne.trim()
                }
              }
            }
          : {
              type,
              title: title.trim(),
              category: category.trim() || "Progress Note",
              tags: tagsFromInput(tags),
              payload: {
                fieldsEnabled: {
                  mood: note.fieldMood,
                  cues: note.fieldCues,
                  participation: note.fieldParticipation,
                  response: note.fieldResponse,
                  followUp: note.fieldFollowUp
                },
                defaultTextBlocks: {
                  opening: note.opening.trim() || null,
                  body: note.body.trim() || null,
                  followUp: note.followUp.trim() || null
                },
                quickPhrases: splitMultiline(note.quickPhrases)
              }
            };

      const endpoint = mode === "edit" && initialTemplate ? `/api/templates/${encodeURIComponent(initialTemplate.id)}` : "/api/templates";
      const method = mode === "edit" ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not save template.");
      }

      const savedId = String(body?.template?.id ?? initialTemplate?.id ?? "");
      toast({
        title: mode === "edit" ? "Template saved" : "Template created",
        description: `${title.trim()} is ready to use.`
      });

      router.push(`/app/templates${savedId ? `?templateId=${encodeURIComponent(savedId)}` : ""}`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (mode === "create" && !type) {
    return (
      <div className="space-y-4">
        <Card className="glass-panel rounded-2xl border-white/15">
          <CardContent className="p-5">
            <h1 className="font-[var(--font-display)] text-3xl text-foreground">New Template</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a template type first, then fill in only what matters.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          {TEMPLATE_TYPE_OPTIONS.filter((option) => option.enabled).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value as "activity" | "note")}
              className="glass-panel rounded-2xl border-white/15 p-5 text-left transition hover:bg-white/50"
            >
              <p className="font-semibold text-foreground">{option.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {option.value === "activity"
                  ? "Build reusable activity blueprints with setup, checklist, and adaptations."
                  : "Create note starters with field defaults and quick phrases."}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-panel rounded-2xl border-white/15 sticky top-4 z-20">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl text-foreground">
              {mode === "edit" ? "Edit Template" : "Create Template"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {type === "activity" ? "Activity Template" : "Note Template"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="bg-white/75">
              <Link href="/app/templates">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canEdit || isSaving}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-2xl border-white/15 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Sections</p>
          <nav className="mt-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  activeSection === section.id
                    ? "bg-[color:var(--actify-accent)]/85 text-white"
                    : "bg-white/55 text-foreground/80 hover:bg-white/80"
                )}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
          {(activeSection === "basics" || sections.length === 1) ? (
            <Card className="glass-panel rounded-2xl border-white/15">
              <CardHeader>
                <CardTitle>Basics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  Title
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1" />
                </label>
                <label className="text-sm">
                  Category
                  <Input value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1" />
                </label>
                <label className="text-sm md:col-span-2">
                  Tags (comma separated)
                  <Input value={tags} onChange={(event) => setTags(event.target.value)} className="mt-1" placeholder="social, trivia, easy-start" />
                </label>
              </CardContent>
            </Card>
          ) : null}

          {type === "activity" && activeSection === "content" ? (
            <Card className="glass-panel rounded-2xl border-white/15">
              <CardHeader>
                <CardTitle>Supplies + Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    Difficulty
                    <select
                      value={activity.difficulty}
                      onChange={(event) =>
                        setActivity((previous) => ({ ...previous, difficulty: event.target.value as ActivityState["difficulty"] }))
                      }
                      className="mt-1 h-10 w-full rounded-md border border-white/35 bg-white/75 px-3 text-sm"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    Estimated Minutes
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={activity.estimatedMinutes}
                      onChange={(event) => setActivity((previous) => ({ ...previous, estimatedMinutes: event.target.value }))}
                      className="mt-1"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  Supplies (one per line)
                  <textarea
                    value={activity.supplies}
                    onChange={(event) => setActivity((previous) => ({ ...previous, supplies: event.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Setup Steps (one per line)
                  <textarea
                    value={activity.setupSteps}
                    onChange={(event) => setActivity((previous) => ({ ...previous, setupSteps: event.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Checklist Items (one per line)
                  <textarea
                    value={activity.checklistItems}
                    onChange={(event) => setActivity((previous) => ({ ...previous, checklistItems: event.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
              </CardContent>
            </Card>
          ) : null}

          {type === "activity" && activeSection === "adaptations" ? (
            <Card className="glass-panel rounded-2xl border-white/15">
              <CardHeader>
                <CardTitle>Adaptations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm">
                  Bed-bound adaptation
                  <textarea
                    value={activity.adaptationBedBound}
                    onChange={(event) => setActivity((previous) => ({ ...previous, adaptationBedBound: event.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Dementia adaptation
                  <textarea
                    value={activity.adaptationDementia}
                    onChange={(event) => setActivity((previous) => ({ ...previous, adaptationDementia: event.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Low-vision adaptation
                  <textarea
                    value={activity.adaptationLowVision}
                    onChange={(event) => setActivity((previous) => ({ ...previous, adaptationLowVision: event.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  1:1 mini adaptation
                  <textarea
                    value={activity.adaptationOneToOne}
                    onChange={(event) => setActivity((previous) => ({ ...previous, adaptationOneToOne: event.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
              </CardContent>
            </Card>
          ) : null}

          {type === "note" && activeSection === "fields" ? (
            <Card className="glass-panel rounded-2xl border-white/15">
              <CardHeader>
                <CardTitle>Enabled Fields</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["fieldMood", "Mood"],
                    ["fieldCues", "Cues"],
                    ["fieldParticipation", "Participation"],
                    ["fieldResponse", "Response"],
                    ["fieldFollowUp", "Follow-up"]
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-md border border-white/25 bg-white/55 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={note[key]}
                      onChange={(event) => setNote((previous) => ({ ...previous, [key]: event.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {type === "note" && activeSection === "content" ? (
            <Card className="glass-panel rounded-2xl border-white/15">
              <CardHeader>
                <CardTitle>Default Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm">
                  Opening text
                  <textarea
                    value={note.opening}
                    onChange={(event) => setNote((previous) => ({ ...previous, opening: event.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Body text
                  <textarea
                    value={note.body}
                    onChange={(event) => setNote((previous) => ({ ...previous, body: event.target.value }))}
                    className="mt-1 min-h-28 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Follow-up text
                  <textarea
                    value={note.followUp}
                    onChange={(event) => setNote((previous) => ({ ...previous, followUp: event.target.value }))}
                    className="mt-1 min-h-20 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Quick phrases (one per line)
                  <textarea
                    value={note.quickPhrases}
                    onChange={(event) => setNote((previous) => ({ ...previous, quickPhrases: event.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-md border border-white/35 bg-white/75 px-3 py-2 text-sm"
                  />
                </label>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}

