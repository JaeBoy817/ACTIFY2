"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocumentationKind, DocumentationPriority, DocumentationStatus } from "@/lib/documentation/types";

type ResidentOption = {
  id: string;
  name: string;
  room: string;
};

type EntryInitial = {
  id?: string;
  residentId: string;
  title: string;
  narrative: string;
  followUp: string;
  status: DocumentationStatus;
  priority: DocumentationPriority;
  dueDate: string;
  occurredAt: string;
  participationLevel: "MINIMAL" | "MODERATE" | "HIGH";
  moodAffect: "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED";
  cuesRequired: "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND";
  response: "POSITIVE" | "NEUTRAL" | "RESISTANT";
};

const UDA_SECTION_LABELS = [
  "Resident Interests / Preferences",
  "Prior Lifestyle / Background",
  "Current Participation Pattern",
  "Strengths / Abilities",
  "Barriers / Limitations",
  "Psychosocial / Emotional Response",
  "Activity Interventions Needed",
  "UDA Summary Statement"
] as const;

const MDS_SECTION_LABELS = [
  "Preferred Daily Routine",
  "Activity Preferences",
  "Social Preferences",
  "Barriers Affecting Participation",
  "Observed Response to Activities",
  "MDS Support Narrative"
] as const;

const KIND_LABEL: Record<DocumentationKind, string> = {
  PROGRESS: "Progress Note",
  ONE_TO_ONE: "1:1 Note",
  UDA: "UDA",
  MDS: "MDS"
};

const KIND_HREF: Record<DocumentationKind, string> = {
  PROGRESS: "/app/documentation/progress-notes",
  ONE_TO_ONE: "/app/documentation/one-to-one",
  UDA: "/app/documentation/uda",
  MDS: "/app/documentation/mds"
};

function getEntryHref(kind: DocumentationKind, id: string) {
  return `${KIND_HREF[kind]}/${encodeURIComponent(id)}`;
}

function formatAsInputDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseSectionsFromNarrative(narrative: string, labels: readonly string[]) {
  const entries = labels.map(() => "");
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    const marker = `${label}:`;
    const startIndex = narrative.indexOf(marker);
    if (startIndex === -1) continue;
    const nextIndexes = labels
      .map((nextLabel) => narrative.indexOf(`${nextLabel}:`, startIndex + marker.length))
      .filter((index) => index !== -1);
    const endIndex = nextIndexes.length > 0 ? Math.min(...nextIndexes) : narrative.length;
    entries[i] = narrative
      .slice(startIndex + marker.length, endIndex)
      .trim()
      .replace(/^[-\s]+/, "");
  }
  return entries;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripStructuredSections(narrative: string, labels: readonly string[]) {
  if (!narrative.trim()) return "";
  if (labels.length === 0) return narrative.trim();
  const alternates = labels.map((label) => escapeRegExp(label)).join("|");
  const pattern = new RegExp(
    `(?:^|\\n\\n?)(${alternates}):\\n[\\s\\S]*?(?=(?:\\n\\n(?:${alternates}):\\n)|$)`,
    "g"
  );
  return narrative.replace(pattern, "").trim();
}

function buildStructuredNarrative(args: {
  baseNarrative: string;
  kind: DocumentationKind;
  udaSections: string[];
  mdsSections: string[];
}) {
  const blocks: string[] = [];
  const base = args.baseNarrative.trim();
  if (base) blocks.push(base);

  if (args.kind === "UDA") {
    for (let i = 0; i < UDA_SECTION_LABELS.length; i += 1) {
      const value = args.udaSections[i]?.trim();
      if (!value) continue;
      blocks.push(`${UDA_SECTION_LABELS[i]}:\n${value}`);
    }
  }

  if (args.kind === "MDS") {
    for (let i = 0; i < MDS_SECTION_LABELS.length; i += 1) {
      const value = args.mdsSections[i]?.trim();
      if (!value) continue;
      blocks.push(`${MDS_SECTION_LABELS[i]}:\n${value}`);
    }
  }

  return blocks.join("\n\n").trim();
}

export function DocumentationEntryEditor({
  kind,
  residents,
  initial
}: {
  kind: DocumentationKind;
  residents: ResidentOption[];
  initial: EntryInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultNarrative =
    kind === "UDA"
      ? stripStructuredSections(initial.narrative, UDA_SECTION_LABELS)
      : kind === "MDS"
        ? stripStructuredSections(initial.narrative, MDS_SECTION_LABELS)
        : initial.narrative;

  const [residentId, setResidentId] = useState(initial.residentId);
  const [title, setTitle] = useState(initial.title);
  const [narrative, setNarrative] = useState(defaultNarrative);
  const [followUp, setFollowUp] = useState(initial.followUp);
  const [status, setStatus] = useState<DocumentationStatus>(initial.status);
  const [priority, setPriority] = useState<DocumentationPriority>(initial.priority);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [participationLevel, setParticipationLevel] = useState(initial.participationLevel);
  const [moodAffect, setMoodAffect] = useState(initial.moodAffect);
  const [cuesRequired, setCuesRequired] = useState(initial.cuesRequired);
  const [response, setResponse] = useState(initial.response);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [udaSections, setUdaSections] = useState(() => parseSectionsFromNarrative(initial.narrative, UDA_SECTION_LABELS));
  const [mdsSections, setMdsSections] = useState(() => parseSectionsFromNarrative(initial.narrative, MDS_SECTION_LABELS));

  const resident = useMemo(() => residents.find((item) => item.id === residentId) ?? null, [residentId, residents]);

  const draftStorageKey = useMemo(() => {
    return `actify:documentation:draft:${kind}:${initial.id ?? "new"}`;
  }, [initial.id, kind]);

  useEffect(() => {
    if (typeof window === "undefined" || initial.id) return;
    const raw = window.localStorage.getItem(draftStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<EntryInitial> & {
        udaSections?: string[];
        mdsSections?: string[];
      };
      if (typeof parsed.residentId === "string" && parsed.residentId) setResidentId(parsed.residentId);
      if (typeof parsed.title === "string") setTitle(parsed.title);
      if (typeof parsed.narrative === "string") setNarrative(parsed.narrative);
      if (typeof parsed.followUp === "string") setFollowUp(parsed.followUp);
      if (typeof parsed.status === "string") setStatus(parsed.status as DocumentationStatus);
      if (typeof parsed.priority === "string") setPriority(parsed.priority as DocumentationPriority);
      if (typeof parsed.dueDate === "string") setDueDate(parsed.dueDate);
      if (typeof parsed.occurredAt === "string") setOccurredAt(parsed.occurredAt);
      if (typeof parsed.participationLevel === "string") {
        setParticipationLevel(parsed.participationLevel as "MINIMAL" | "MODERATE" | "HIGH");
      }
      if (typeof parsed.moodAffect === "string") {
        setMoodAffect(parsed.moodAffect as "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED");
      }
      if (typeof parsed.cuesRequired === "string") {
        setCuesRequired(parsed.cuesRequired as "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND");
      }
      if (typeof parsed.response === "string") {
        setResponse(parsed.response as "POSITIVE" | "NEUTRAL" | "RESISTANT");
      }
      if (Array.isArray(parsed.udaSections)) setUdaSections(parsed.udaSections.map((value) => String(value ?? "")));
      if (Array.isArray(parsed.mdsSections)) setMdsSections(parsed.mdsSections.map((value) => String(value ?? "")));
    } catch {
      // Ignore invalid persisted drafts.
    }
  }, [draftStorageKey, initial.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeoutId = window.setTimeout(() => {
      const payload = {
        residentId,
        title,
        narrative,
        followUp,
        status,
        priority,
        dueDate,
        occurredAt,
        participationLevel,
        moodAffect,
        cuesRequired,
        response,
        udaSections,
        mdsSections
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    cuesRequired,
    draftStorageKey,
    dueDate,
    mdsSections,
    moodAffect,
    narrative,
    occurredAt,
    participationLevel,
    priority,
    residentId,
    response,
    status,
    title,
    followUp,
    udaSections
  ]);

  const submit = (nextStatus: DocumentationStatus) => {
    setFeedback(null);
    const payload = {
      kind,
      residentId,
      title,
      narrative: buildStructuredNarrative({
        baseNarrative: narrative,
        kind,
        udaSections,
        mdsSections
      }),
      followUp,
      status: nextStatus,
      priority,
      dueDate: dueDate || null,
      occurredAt: occurredAt || null,
      participationLevel,
      moodAffect,
      cuesRequired,
      response,
      sectionProgress:
        kind === "UDA"
          ? Math.round((udaSections.filter((item) => item.trim().length > 0).length / UDA_SECTION_LABELS.length) * 100)
          : kind === "MDS"
            ? Math.round((mdsSections.filter((item) => item.trim().length > 0).length / MDS_SECTION_LABELS.length) * 100)
            : null
    };

    if (!payload.residentId) {
      setFeedback({ type: "error", message: "Select a resident before saving." });
      return;
    }

    if (!payload.narrative || payload.narrative.length < 4) {
      setFeedback({ type: "error", message: "Add a narrative before saving." });
      return;
    }

    startTransition(async () => {
      try {
        const endpoint = initial.id ? `/api/documentation/entries/${initial.id}` : "/api/documentation/entries";
        const method = initial.id ? "PATCH" : "POST";
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = (await response.json().catch(() => null)) as
          | { entry?: { id: string }; error?: { message?: string } }
          | null;

        if (!response.ok || !result?.entry?.id) {
          const message = result?.error?.message || "Unable to save documentation entry.";
          throw new Error(message);
        }

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(draftStorageKey);
        }

        setFeedback({ type: "ok", message: nextStatus === "COMPLETED" ? "Entry finalized." : "Draft saved." });
        const targetHref = getEntryHref(kind, result.entry.id);
        router.replace(targetHref);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save documentation entry.";
        setFeedback({ type: "error", message });
      }
    });
  };

  const deleteEntry = () => {
    if (!initial.id) return;
    if (!window.confirm("Delete this documentation entry? This cannot be undone.")) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/documentation/entries/${initial.id}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(result?.error?.message || "Unable to delete documentation entry.");
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(draftStorageKey);
        }
        router.push(KIND_HREF[kind]);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to delete documentation entry.";
        setFeedback({ type: "error", message });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-[#1f3152] bg-[linear-gradient(180deg,#091224_0%,#0a1427_100%)] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8ea6cf]">
            Documentation Editor
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">{initial.id ? `Edit ${KIND_LABEL[kind]}` : `New ${KIND_LABEL[kind]}`}</h2>
          <p className="mt-1 text-xs text-[#9db2d8]">Resident-centered charting with draft, review, and completion states.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={KIND_HREF[kind]}
            className="inline-flex h-10 items-center rounded-full border border-[#37537d] bg-[#12233f] px-4 text-xs font-semibold text-[#d7e5ff]"
          >
            Back to {KIND_LABEL[kind]}s
          </Link>
          {initial.id ? (
            <button
              type="button"
              onClick={deleteEntry}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/15 px-4 text-xs font-semibold text-rose-100"
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-[#9db2d8]">
              <span className="font-semibold uppercase tracking-[0.1em]">Resident</span>
              <select
                value={residentId}
                onChange={(event) => setResidentId(event.target.value)}
                className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
              >
                <option value="">Select resident</option>
                {residents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.room} · {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#9db2d8]">
              <span className="font-semibold uppercase tracking-[0.1em]">Entry Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`${KIND_LABEL[kind]} summary`}
                className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff] placeholder:text-[#7f97bf]"
              />
            </label>
            <label className="space-y-1 text-xs text-[#9db2d8]">
              <span className="font-semibold uppercase tracking-[0.1em]">Occurred At</span>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
              />
            </label>
            <label className="space-y-1 text-xs text-[#9db2d8]">
              <span className="font-semibold uppercase tracking-[0.1em]">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
              />
            </label>
          </div>

          {kind === "PROGRESS" || kind === "ONE_TO_ONE" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1 text-xs text-[#9db2d8]">
                <span className="font-semibold uppercase tracking-[0.1em]">Participation</span>
                <select
                  value={participationLevel}
                  onChange={(event) => setParticipationLevel(event.target.value as "MINIMAL" | "MODERATE" | "HIGH")}
                  className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
                >
                  <option value="MINIMAL">Minimal</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-[#9db2d8]">
                <span className="font-semibold uppercase tracking-[0.1em]">Mood</span>
                <select
                  value={moodAffect}
                  onChange={(event) => setMoodAffect(event.target.value as "BRIGHT" | "CALM" | "FLAT" | "ANXIOUS" | "AGITATED")}
                  className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
                >
                  <option value="BRIGHT">Bright</option>
                  <option value="CALM">Calm</option>
                  <option value="FLAT">Flat</option>
                  <option value="ANXIOUS">Anxious</option>
                  <option value="AGITATED">Agitated</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-[#9db2d8]">
                <span className="font-semibold uppercase tracking-[0.1em]">Cues</span>
                <select
                  value={cuesRequired}
                  onChange={(event) => setCuesRequired(event.target.value as "NONE" | "VERBAL" | "VISUAL" | "HAND_OVER_HAND")}
                  className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
                >
                  <option value="NONE">None</option>
                  <option value="VERBAL">Verbal</option>
                  <option value="VISUAL">Visual</option>
                  <option value="HAND_OVER_HAND">Hand-over-hand</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-[#9db2d8]">
                <span className="font-semibold uppercase tracking-[0.1em]">Response</span>
                <select
                  value={response}
                  onChange={(event) => setResponse(event.target.value as "POSITIVE" | "NEUTRAL" | "RESISTANT")}
                  className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
                >
                  <option value="POSITIVE">Positive</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="RESISTANT">Resistant</option>
                </select>
              </label>
            </div>
          ) : null}

          <label className="space-y-1 text-xs text-[#9db2d8]">
            <span className="font-semibold uppercase tracking-[0.1em]">Narrative</span>
            <textarea
              value={narrative}
              onChange={(event) => setNarrative(event.target.value)}
              rows={8}
              placeholder={
                kind === "PROGRESS"
                  ? "Document activity, resident response, and follow-up."
                  : kind === "ONE_TO_ONE"
                    ? "Document 1:1 interaction details and outcomes."
                    : kind === "UDA"
                      ? "Document assessment context and use sections below."
                      : "Document MDS support narrative and supporting observations."
              }
              className="w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 py-3 text-sm text-[#dce9ff] placeholder:text-[#7f97bf]"
            />
          </label>

          {kind === "UDA" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {UDA_SECTION_LABELS.map((label, index) => (
                <label key={label} className="space-y-1 text-xs text-[#9db2d8]">
                  <span className="font-semibold uppercase tracking-[0.1em]">{label}</span>
                  <textarea
                    rows={3}
                    value={udaSections[index] ?? ""}
                    onChange={(event) => {
                      setUdaSections((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      });
                    }}
                    className="w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 py-2 text-sm text-[#dce9ff] placeholder:text-[#7f97bf]"
                    placeholder="Add section details"
                  />
                </label>
              ))}
            </div>
          ) : null}

          {kind === "MDS" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {MDS_SECTION_LABELS.map((label, index) => (
                <label key={label} className="space-y-1 text-xs text-[#9db2d8]">
                  <span className="font-semibold uppercase tracking-[0.1em]">{label}</span>
                  <textarea
                    rows={3}
                    value={mdsSections[index] ?? ""}
                    onChange={(event) => {
                      setMdsSections((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      });
                    }}
                    className="w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 py-2 text-sm text-[#dce9ff] placeholder:text-[#7f97bf]"
                    placeholder="Add section details"
                  />
                </label>
              ))}
            </div>
          ) : null}

          <label className="space-y-1 text-xs text-[#9db2d8]">
            <span className="font-semibold uppercase tracking-[0.1em]">Follow-Up</span>
            <textarea
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              rows={3}
              placeholder="Optional follow-up notes"
              className="w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 py-2 text-sm text-[#dce9ff] placeholder:text-[#7f97bf]"
            />
          </label>
        </div>

        <aside className="space-y-3">
          <section className="rounded-xl border border-[#2a4168] bg-[#0d1a31] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8ea6cf]">Resident Snapshot</p>
            {resident ? (
              <>
                <p className="mt-2 text-lg font-semibold text-white">{resident.name}</p>
                <p className="text-xs text-[#9db2d8]">Room {resident.room}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#98add3]">Select a resident to start charting.</p>
            )}
          </section>

          <section className="rounded-xl border border-[#2a4168] bg-[#0d1a31] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8ea6cf]">Workflow State</p>
            <div className="mt-2 grid gap-2">
              <label className="space-y-1 text-xs text-[#9db2d8]">
                <span className="font-semibold uppercase tracking-[0.1em]">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as DocumentationStatus)}
                  className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="READY_REVIEW">Ready to Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-[#9db2d8]">
                <span className="font-semibold uppercase tracking-[0.1em]">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as DocumentationPriority)}
                  className="h-10 w-full rounded-xl border border-[#2e456e] bg-[#0e1b33] px-3 text-sm text-[#dce9ff]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => submit("DRAFT")}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#38557f] bg-[#132543] px-4 text-xs font-semibold text-[#dce9ff]"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => submit("READY_REVIEW")}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-full border border-violet-300/35 bg-violet-500/20 px-4 text-xs font-semibold text-violet-100"
              >
                Save + Ready to Review
              </button>
              <button
                type="button"
                onClick={() => submit("COMPLETED")}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-100"
              >
                Finalize Entry
              </button>
            </div>
          </section>

          {feedback ? (
            <section
              className={cn(
                "rounded-xl border p-3 text-sm",
                feedback.type === "ok"
                  ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                  : "border-rose-300/35 bg-rose-500/15 text-rose-100"
              )}
            >
              {feedback.message}
            </section>
          ) : null}

          {initial.id ? (
            <section className="rounded-xl border border-[#2a4168] bg-[#0d1a31] p-3 text-xs text-[#9db2d8]">
              Entry timestamp: {formatAsInputDateTime(initial.occurredAt) ? new Date(initial.occurredAt).toLocaleString() : "N/A"}
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
