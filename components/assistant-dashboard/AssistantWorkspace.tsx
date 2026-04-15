"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardPenLine,
  Copy,
  Loader2,
  SearchCheck,
  Sparkles,
  UserRoundSearch
} from "lucide-react";

import { ActivityTag } from "@/components/assistant-dashboard/ActivityTag";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { CalendarActionCard } from "@/components/assistant-dashboard/CalendarActionCard";
import { EmptyState } from "@/components/assistant-dashboard/EmptyState";
import { LoadingSkeleton } from "@/components/assistant-dashboard/LoadingSkeleton";
import { NotePreview } from "@/components/assistant-dashboard/NotePreview";
import { PodCard } from "@/components/assistant-dashboard/PodCard";
import { ResidentMiniCard } from "@/components/assistant-dashboard/ResidentMiniCard";
import { SearchInput } from "@/components/assistant-dashboard/SearchInput";
import { SectionHeader } from "@/components/assistant-dashboard/SectionHeader";
import type { ResidentSnapshot } from "@/components/assistant-dashboard/types";
import {
  type RewriteStrength,
  rewordOneToOneNote,
  rewordProgressNote,
  type NoteRewriteStyle,
  type NoteRewriteType
} from "@/lib/assistant/noteRewriter";

type AssistantWorkspaceProps = {
  firstName: string;
  residents: ResidentSnapshot[];
};

const NOTE_TYPES = ["Progress Note", "1:1 Visit Note", "Care Plan Wording", "UDA Support", "Resident Council Summary"] as const;
const REWORD_NOTE_TYPES = [
  { value: "progress" as const, label: "Progress Note" },
  { value: "one_to_one" as const, label: "1:1 Note" }
];
const REWORD_STYLES = [
  { value: "professional" as const, label: "Professional" },
  { value: "shorter" as const, label: "Shorter PCC Version" },
  { value: "detailed" as const, label: "More Detailed PCC Version" }
];

const CALENDAR_ACTIONS = [
  { title: "Fill Empty Days", hint: "Plug low-effort wins into open calendar slots." },
  { title: "Generate Themed Week", hint: "Build a cohesive week with resident-friendly pacing." },
  { title: "Holiday Plan", hint: "Fast holiday programming options by budget level." },
  { title: "Backup Ideas", hint: "No-material options for low attendance days." },
  { title: "Low-Budget Month", hint: "Stretch supplies without sacrificing variety." },
  { title: "Daily Theme Suggestions", hint: "Daily prompts for momentum and consistency." }
] as const;

const CALENDAR_SUGGESTIONS: Record<string, { heading: string; bullets: string[] }> = {
  "Fill Empty Days": {
    heading: "Quick fill set for open weekdays",
    bullets: [
      "Tuesday afternoon: Chair travel stories + postcard prompts",
      "Thursday morning: 20-minute table games rotation",
      "Friday fallback: Word puzzle social with music background"
    ]
  },
  "Generate Themed Week": {
    heading: "Suggested theme: Spring Memory Lane",
    bullets: [
      "Mon: Spring songs + memory prompts",
      "Wed: Garden sensory cart rounds",
      "Fri: Flower trivia and coloring social"
    ]
  },
  "Holiday Plan": {
    heading: "Holiday backup structure ready",
    bullets: [
      "Primary: themed social and music block",
      "Backup: room-to-room greeting carts",
      "Low-energy option: holiday reminiscence circle"
    ]
  },
  "Backup Ideas": {
    heading: "Fast backups for same-day pivots",
    bullets: [
      "No prep: Name that tune mini-round",
      "Low mobility: Seated stretch and breathe",
      "Quiet hour: picture prompts with tea"
    ]
  },
  "Low-Budget Month": {
    heading: "Low-budget plan with variety",
    bullets: [
      "Use reusable trivia cards and storytelling prompts",
      "Repurpose craft scraps for collage sessions",
      "Rotate volunteer-led social blocks twice weekly"
    ]
  },
  "Daily Theme Suggestions": {
    heading: "Daily spark examples",
    bullets: [
      "Monday Mood Boost",
      "Wednesday Memory Mix",
      "Friday Favorites and Requests"
    ]
  }
};

const ACTIVITY_CATEGORIES = [
  "All",
  "Group Activities",
  "1:1 Visits",
  "Bed-Bound Ideas",
  "Dementia-Friendly",
  "Holiday Activities",
  "Sensory Activities",
  "Low-Budget Options",
  "Cognitive Games",
  "Physical Activities",
  "Independent Room Activities"
] as const;

const ACTIVITY_IDEAS = [
  {
    title: "Music Memory Circle",
    category: "Group Activities",
    summary: "Residents match songs to decades and share one memory prompt.",
    tags: ["Moderate energy", "Social"]
  },
  {
    title: "Bedside Sensory Basket",
    category: "Bed-Bound Ideas",
    summary: "Texture cards, gentle scents, and conversational prompts for 1:1 visits.",
    tags: ["1:1", "Comfort-focused"]
  },
  {
    title: "Holiday Trivia Sprint",
    category: "Holiday Activities",
    summary: "Short rounds with optional visual aids for mixed cognitive levels.",
    tags: ["Fast setup", "Group"]
  },
  {
    title: "Picture Prompt Chat",
    category: "Dementia-Friendly",
    summary: "Use familiar photo cards to support calm reminiscence conversation.",
    tags: ["Low pressure", "Memory support"]
  },
  {
    title: "Chair Stretch Story Time",
    category: "Physical Activities",
    summary: "Light guided movement paired with themed stories and music.",
    tags: ["Movement", "Adaptable"]
  },
  {
    title: "Word Search Corner",
    category: "Independent Room Activities",
    summary: "Printable puzzle packets with optional check-in prompts.",
    tags: ["Independent", "Low-budget"]
  }
];

const SEEDED_NOTE_PREVIEW =
  "Progress Note: Resident attended afternoon bingo social for 30 minutes. Resident required minimal verbal cueing and remained calm and cooperative throughout the activity. Resident responded positively to peer interaction and smiled during group discussion. Follow-up: Offer afternoon social programming this week based on observed engagement pattern.";

function buildGeneratedNote(input: {
  noteType: string;
  residentName: string;
  activityType: string;
  participationLevel: string;
  mood: string;
  cueing: string;
  responseType: string;
  followUpNeeded: string;
  details: string;
}) {
  const resident = input.residentName.trim() || "Resident";
  const activity = input.activityType.trim() || "activity programming";
  const noteHeader = `${input.noteType}:`;
  const followUpLine =
    input.followUpNeeded === "Yes"
      ? "Follow-up: Additional support visit recommended within 48 hours."
      : "Follow-up: Continue current approach based on response.";

  const detailLine = input.details.trim() ? `Additional details: ${input.details.trim()}` : "";

  return [
    `${noteHeader} ${resident} participated in ${activity}.`,
    `Participation level observed: ${input.participationLevel}.`,
    `Mood/affect: ${input.mood}. Cueing support: ${input.cueing}.`,
    `Response type: ${input.responseType}.`,
    followUpLine,
    detailLine
  ]
    .filter(Boolean)
    .join(" ");
}

export function AssistantWorkspace({ firstName, residents }: AssistantWorkspaceProps) {
  const [noteType, setNoteType] = useState<(typeof NOTE_TYPES)[number]>("Progress Note");
  const [residentName, setResidentName] = useState("Martha Hill");
  const [activityType, setActivityType] = useState("Bingo social");
  const [participationLevel, setParticipationLevel] = useState("Moderate");
  const [mood, setMood] = useState("Calm");
  const [cueing, setCueing] = useState("Verbal cueing");
  const [responseType, setResponseType] = useState("Positive");
  const [followUpNeeded, setFollowUpNeeded] = useState("Yes");
  const [noteDetails, setNoteDetails] = useState("");
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(SEEDED_NOTE_PREVIEW);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [rewordNoteType, setRewordNoteType] = useState<NoteRewriteType>("progress");
  const [rewordStyle, setRewordStyle] = useState<NoteRewriteStyle>("professional");
  const [roughNoteInput, setRoughNoteInput] = useState("");
  const [rewordedNote, setRewordedNote] = useState(
    "Paste your rough note and click Reword Note to generate a polished PCC-ready version."
  );
  const [isRewordingNote, setIsRewordingNote] = useState(false);
  const [rewordError, setRewordError] = useState<string | null>(null);
  const [rewordResponseId, setRewordResponseId] = useState<string | null>(null);
  const [rewordCopyState, setRewordCopyState] = useState<"idle" | "copied">("idle");

  const [selectedCalendarAction, setSelectedCalendarAction] = useState<string | null>(null);
  const [activityQuery, setActivityQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof ACTIVITY_CATEGORIES)[number]>("All");
  const [residentQuery, setResidentQuery] = useState("");

  const calendarSuggestion = selectedCalendarAction ? CALENDAR_SUGGESTIONS[selectedCalendarAction] : null;

  const filteredActivities = useMemo(() => {
    return ACTIVITY_IDEAS.filter((idea) => {
      const matchesCategory = selectedCategory === "All" || idea.category === selectedCategory;
      const text = `${idea.title} ${idea.summary} ${idea.tags.join(" ")}`.toLowerCase();
      const matchesQuery = text.includes(activityQuery.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [activityQuery, selectedCategory]);

  const filteredResidents = useMemo(() => {
    const query = residentQuery.trim().toLowerCase();
    if (!query) return residents;
    return residents.filter((resident) => {
      const haystack = [
        resident.name,
        resident.room,
        resident.interests.join(" "),
        resident.favoriteTopics.join(" "),
        resident.suggestedMatches.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [residentQuery, residents]);

  const generateNote = () => {
    setIsGeneratingNote(true);
    window.setTimeout(() => {
      setGeneratedNote(
        buildGeneratedNote({
          noteType,
          residentName,
          activityType,
          participationLevel,
          mood,
          cueing,
          responseType,
          followUpNeeded,
          details: noteDetails
        })
      );
      setIsGeneratingNote(false);
    }, 520);
  };

  const copyGeneratedNote = async () => {
    try {
      await navigator.clipboard.writeText(generatedNote);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1400);
    } catch {
      setCopyState("idle");
    }
  };

  const rewordNote = (options?: { nextStyle?: NoteRewriteStyle; strength?: RewriteStrength }) => {
    const source = roughNoteInput.trim();
    if (!source) {
      setRewordError("Paste a rough note to reword.");
      return;
    }
    if (source.length < 20) {
      setRewordError("Add a little more detail so Actify can rewrite it clearly.");
      return;
    }

    setIsRewordingNote(true);
    setRewordError(null);

    window.setTimeout(() => {
      try {
        const style = options?.nextStyle ?? rewordStyle;
        if (style !== rewordStyle) {
          setRewordStyle(style);
        }

        const rewritten =
          rewordNoteType === "progress"
            ? rewordProgressNote(source, style, {
                excludeResponseId: rewordResponseId ?? undefined,
                strength: options?.strength
              })
            : rewordOneToOneNote(source, style, {
                excludeResponseId: rewordResponseId ?? undefined,
                strength: options?.strength
              });

        setRewordedNote(rewritten.note);
        setRewordResponseId(rewritten.responseId);
      } catch (error) {
        if (error instanceof Error && error.message) {
          setRewordError(error.message);
        } else {
          setRewordError("We couldn’t reword that note right now.");
        }
      } finally {
        setIsRewordingNote(false);
      }
    }, 180);
  };

  const copyRewordedNote = async () => {
    try {
      await navigator.clipboard.writeText(rewordedNote);
      setRewordCopyState("copied");
      window.setTimeout(() => setRewordCopyState("idle"), 1400);
    } catch {
      setRewordCopyState("idle");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <SectionHeader
        eyebrow="Assistant-First Workspace"
        title={`Good morning, ${firstName}`}
        description="Actify helps you plan faster, write faster, and build better activity moments without workflow clutter."
      />

      <section
        className="grid gap-6 xl:grid-cols-[minmax(260px,1fr)_minmax(560px,1.55fr)_minmax(260px,1fr)] xl:grid-rows-[auto_auto]"
        aria-label="Actify assistant command center"
      >
        <PodCard
          title="Actify AI Assistant"
          description="Ask for activity ideas, notes, planning help, and resident support."
          icon={Sparkles}
          tone="sky"
          className="order-1 xl:col-start-2 xl:row-span-2"
        >
          <AssistantChat />
        </PodCard>

        <PodCard
          title="Note Studio"
          description="Generate ready-to-use activity documentation support."
          icon={ClipboardPenLine}
          tone="mint"
          className="order-2 xl:col-start-1 xl:row-start-1"
        >
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Note type</span>
                <select
                  value={noteType}
                  onChange={(event) => setNoteType(event.target.value as (typeof NOTE_TYPES)[number])}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  {NOTE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Resident name</span>
                <input
                  value={residentName}
                  onChange={(event) => setResidentName(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Activity type</span>
                <input
                  value={activityType}
                  onChange={(event) => setActivityType(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Participation level</span>
                <input
                  value={participationLevel}
                  onChange={(event) => setParticipationLevel(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Mood / affect</span>
                <input
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Cueing</span>
                <input
                  value={cueing}
                  onChange={(event) => setCueing(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Response type</span>
                <input
                  value={responseType}
                  onChange={(event) => setResponseType(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Follow-up needed</span>
                <select
                  value={followUpNeeded}
                  onChange={(event) => setFollowUpNeeded(event.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">Optional details</span>
              <textarea
                value={noteDetails}
                onChange={(event) => setNoteDetails(event.target.value)}
                rows={2}
                placeholder="Any specific behavior, quote, or follow-up context..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              />
            </label>

            <button
              type="button"
              onClick={generateNote}
              disabled={isGeneratingNote}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(5,150,105,0.9)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              {isGeneratingNote ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {isGeneratingNote ? "Generating..." : "Generate Note"}
            </button>

            {isGeneratingNote ? (
              <div className="space-y-2">
                <LoadingSkeleton className="h-4 w-1/3" />
                <LoadingSkeleton className="h-20 w-full" />
              </div>
            ) : (
              <NotePreview value={generatedNote} onCopy={copyGeneratedNote} copyState={copyState} />
            )}

            <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/45 p-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">Reword Existing Note</h3>
                <p className="text-xs text-slate-600">
                  Reword rough notes into polished PCC-ready wording. Keep the meaning. Improve the wording.
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Note type</span>
                  <select
                    value={rewordNoteType}
                    onChange={(event) => setRewordNoteType(event.target.value as NoteRewriteType)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    {REWORD_NOTE_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Rewrite style</span>
                  <select
                    value={rewordStyle}
                    onChange={(event) => setRewordStyle(event.target.value as NoteRewriteStyle)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    {REWORD_STYLES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Paste your rough note</span>
                <textarea
                  value={roughNoteInput}
                  onChange={(event) => setRoughNoteInput(event.target.value)}
                  rows={4}
                  placeholder="Example: Resident came to bingo and played some. Needed encouragement at first but got more into it later."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                />
              </label>

              <button
                type="button"
                onClick={() => rewordNote()}
                disabled={isRewordingNote}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-22px_rgba(15,23,42,0.9)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {isRewordingNote ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardPenLine className="h-4 w-4" aria-hidden />}
                {isRewordingNote ? "Rewording..." : "Reword Note"}
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => rewordNote({ strength: "strong" })}
                  disabled={isRewordingNote}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  Try Stronger Rewrite
                </button>
                <button
                  type="button"
                  onClick={() => rewordNote({ nextStyle: "professional", strength: "strong" })}
                  disabled={isRewordingNote}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  Make More Professional
                </button>
                <button
                  type="button"
                  onClick={() => rewordNote({ nextStyle: "shorter" })}
                  disabled={isRewordingNote}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  Shorten
                </button>
                <button
                  type="button"
                  onClick={() => rewordNote({ nextStyle: "detailed" })}
                  disabled={isRewordingNote}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  Expand Slightly
                </button>
              </div>

              {rewordError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{rewordError}</p>
              ) : null}

              {isRewordingNote ? (
                <div className="space-y-2">
                  <LoadingSkeleton className="h-4 w-1/3" />
                  <LoadingSkeleton className="h-20 w-full" />
                </div>
              ) : (
                <NotePreview
                  value={rewordedNote}
                  onCopy={copyRewordedNote}
                  copyState={rewordCopyState}
                  label="Reworded note preview"
                />
              )}
            </section>
          </div>
        </PodCard>

        <PodCard
          title="Calendar Builder"
          description="Plan themed weeks, fill activity gaps, and build better monthly calendars."
          icon={CalendarDays}
          tone="indigo"
          className="order-3 xl:col-start-3 xl:row-start-1"
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">April quick view</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-indigo-900">
                <div className="rounded-lg bg-white px-2 py-1">Mon 15: Music Mix</div>
                <div className="rounded-lg bg-white px-2 py-1">Wed 17: Bingo Social</div>
                <div className="rounded-lg bg-white px-2 py-1">Fri 19: Chair Trivia</div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {CALENDAR_ACTIONS.map((action) => (
                <CalendarActionCard
                  key={action.title}
                  title={action.title}
                  hint={action.hint}
                  active={selectedCalendarAction === action.title}
                  onClick={() => setSelectedCalendarAction(action.title)}
                />
              ))}
            </div>

            {calendarSuggestion ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Suggestion preview</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">{calendarSuggestion.heading}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {calendarSuggestion.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : (
              <EmptyState title="No planning mode selected" description="Pick an action to generate a focused plan preview." />
            )}
          </div>
        </PodCard>

        <PodCard
          title="Activity Vault"
          description="Browse activity ideas by type, need, mood, and resident ability."
          icon={BookOpen}
          tone="teal"
          className="order-4 xl:col-start-1 xl:row-start-2"
          headerAction={
            <button
              type="button"
              className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              Explore Library
            </button>
          }
        >
          <div className="space-y-3">
            <SearchInput
              value={activityQuery}
              onChange={setActivityQuery}
              placeholder="Search ideas by type, mood, or need..."
              label="Search activity vault"
            />

            <div className="flex flex-wrap gap-1.5" aria-label="Activity category filters">
              {ACTIVITY_CATEGORIES.map((category) => (
                <ActivityTag
                  key={category}
                  label={category}
                  active={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                />
              ))}
            </div>

            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {filteredActivities.length ? (
                filteredActivities.map((idea) => (
                  <article key={idea.title} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{idea.title}</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {idea.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{idea.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {idea.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  icon={SearchCheck}
                  title="No matching ideas"
                  description="Try a broader category or clear your search to see more options."
                />
              )}
            </div>
          </div>
        </PodCard>

        <PodCard
          title="Resident Snapshots"
          description="Quick resident preferences, participation style, and best-match ideas."
          icon={UserRoundSearch}
          tone="neutral"
          className="order-5 xl:col-start-3 xl:row-start-2"
        >
          <div className="space-y-3">
            <SearchInput
              value={residentQuery}
              onChange={setResidentQuery}
              placeholder="Search resident name, room, or interest..."
              label="Search resident snapshots"
            />

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredResidents.length ? (
                filteredResidents.map((resident) => <ResidentMiniCard key={resident.id} resident={resident} />)
              ) : (
                <EmptyState title="No resident snapshots found" description="Try a different keyword or clear your search." />
              )}
            </div>
          </div>
        </PodCard>
      </section>
    </div>
  );
}
