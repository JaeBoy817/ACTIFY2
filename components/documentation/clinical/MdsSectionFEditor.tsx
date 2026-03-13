"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  Copy,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Trash2
} from "lucide-react";

import type {
  ClinicalAssessmentEditorData,
  ClinicalAssessmentHistoryRow,
  DocumentationResidentOption
} from "@/app/app/documentation/_lib";
import { formatActifyDate } from "@/lib/datetime";
import type { DocumentationSectionChangeState, DocumentationStatus } from "@/lib/documentation/types";
import { cn } from "@/lib/utils";

type MdsSectionDefinition = {
  id: string;
  label: string;
  helper: string;
  options: string[];
};

const MDS_SECTIONS: MdsSectionDefinition[] = [
  {
    id: "preferred_daily_routine",
    label: "Preferred Daily Routine",
    helper: "Capture preferred routine and daypart preference.",
    options: [
      "likes to sleep in",
      "prefers morning activity",
      "prefers afternoon activity",
      "prefers evening activity",
      "prefers staying in room",
      "likes being out of room",
      "likes routine schedule",
      "prefers quiet environment",
      "prefers small-group setting"
    ]
  },
  {
    id: "activity_preferences",
    label: "Activity Preferences",
    helper: "List primary activity interests that support Section F preference documentation.",
    options: [
      "music",
      "TV",
      "church/devotion",
      "bingo",
      "trivia",
      "word games",
      "conversation",
      "reminiscing",
      "crafts",
      "outdoors",
      "cards/games",
      "family visits",
      "independent leisure",
      "sensory stimulation",
      "pet visits"
    ]
  },
  {
    id: "social_preferences",
    label: "Social Preferences",
    helper: "Document social engagement preferences and interaction style.",
    options: [
      "likes 1:1 visits",
      "likes selected peers",
      "likes group interaction",
      "prefers limited social interaction",
      "enjoys family contact",
      "prefers staff interaction over peers"
    ]
  },
  {
    id: "spiritual_preferences",
    label: "Spiritual / Religious Preferences",
    helper: "Capture spiritual or religious routine and support needs.",
    options: [
      "church services",
      "devotion",
      "prayer",
      "scripture reading",
      "spiritual music",
      "no expressed preference"
    ]
  },
  {
    id: "environmental_scheduling",
    label: "Environmental / Scheduling Preferences",
    helper: "Document setting and scheduling preferences for successful participation.",
    options: [
      "quiet room",
      "bedside visits",
      "group room",
      "outdoors",
      "morning",
      "afternoon",
      "evening",
      "short duration",
      "structured routine"
    ]
  },
  {
    id: "barriers",
    label: "Barriers Affecting Participation",
    helper: "Identify barriers affecting routine and participation response.",
    options: [
      "fatigue",
      "decreased endurance",
      "hearing deficit",
      "vision deficit",
      "communication difficulty",
      "cognitive impairment",
      "mood",
      "anxiety",
      "behavior symptoms",
      "physical limitation",
      "bedbound",
      "decline / refusal"
    ]
  },
  {
    id: "observed_response",
    label: "Observed Response to Activities",
    helper: "Summarize observed emotional/behavioral response to offered activities.",
    options: [
      "smiles",
      "attentive",
      "calm",
      "pleasant",
      "verbally engaged",
      "nonverbal positive response",
      "neutral",
      "resistant",
      "variable tolerance"
    ]
  },
  {
    id: "section_f_narrative",
    label: "Section F Support Narrative",
    helper: "Create final support narrative aligned to Section F preference review.",
    options: [
      "Resident was assessed for customary routine and activity preferences",
      "benefits from preference-based individualized and group programming",
      "participation affected by identified barriers",
      "responds best to familiar approach and cueing",
      "continue supporting psychosocial well-being and quality of life"
    ]
  }
];

const CHANGE_STATE_LABELS: Record<DocumentationSectionChangeState, string> = {
  NO_CHANGE: "No Change",
  UPDATED: "Updated",
  SIGNIFICANT_CHANGE: "Significant Change"
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSectionValues(narrative: string) {
  const values: Record<string, string> = {};
  const labelsPattern = MDS_SECTIONS.map((section) => escapeRegExp(section.label)).join("|");
  for (const section of MDS_SECTIONS) {
    const label = escapeRegExp(section.label);
    const pattern = new RegExp(`(?:^|\\n)(?:##\\s*)?${label}:\\s*\\n([\\s\\S]*?)(?=\\n(?:##\\s*)?(?:${labelsPattern}):\\s*\\n|$)`, "i");
    const match = narrative.match(pattern);
    values[section.id] = (match?.[1] || "").trim();
  }
  return values;
}

function parseMdsStructuredPayload(value: string): {
  state: DocumentationSectionChangeState | null;
  current: string;
} {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let state: DocumentationSectionChangeState | null = null;
  const currentParts: string[] = [];
  let mode: "current" | "ignore" = "current";

  for (const line of lines) {
    if (line.startsWith("State:")) {
      const token = line.slice("State:".length).trim().toUpperCase().replaceAll(" ", "_");
      if (token === "NO_CHANGE" || token === "UPDATED" || token === "SIGNIFICANT_CHANGE") {
        state = token;
      }
      mode = "current";
      continue;
    }
    if (line.startsWith("Prior:")) {
      mode = "ignore";
      continue;
    }
    if (line.startsWith("Current:")) {
      mode = "current";
      const part = line.slice("Current:".length).trim();
      if (part) currentParts.push(part);
      continue;
    }
    if (mode === "current") {
      currentParts.push(line);
    }
  }

  return {
    state,
    current: currentParts.join("\n").trim()
  };
}

function buildNarrative(values: Record<string, string>, sectionStates: Record<string, DocumentationSectionChangeState>) {
  const blocks: string[] = [];
  for (const section of MDS_SECTIONS) {
    const value = (values[section.id] || "").trim();
    if (!value) continue;
    const state = sectionStates[section.id] || "NO_CHANGE";
    blocks.push(`${section.label}:\nState: ${CHANGE_STATE_LABELS[state]}\n${value}`);
  }
  return blocks.join("\n\n").trim();
}

function calculateProgress(values: Record<string, string>) {
  const completed = MDS_SECTIONS.filter((section) => (values[section.id] || "").trim().length > 0).length;
  return Math.round((completed / MDS_SECTIONS.length) * 100);
}

function generateSectionFSummary(values: Record<string, string>) {
  const routine = values.preferred_daily_routine || "customary routine reviewed";
  const preferences = values.activity_preferences || "activity preferences reviewed";
  const barriers = values.barriers || "no significant participation barriers identified";
  const response = values.observed_response || "resident response remains variable but preference-based support is effective";

  return `Resident was assessed for customary routine and activity preferences. Resident prefers ${preferences.toLowerCase()} and follows ${routine.toLowerCase()}. Participation may be affected by ${barriers.toLowerCase()}. Resident responds best when ${response.toLowerCase()}. Continue offering preference-based individualized and/or group programming to support psychosocial well-being and quality of life.`;
}

function statusPill(status: DocumentationStatus) {
  if (status === "COMPLETED") return "border-emerald-300/35 bg-emerald-500/20 text-emerald-100";
  if (status === "READY_REVIEW") return "border-violet-300/35 bg-violet-500/20 text-violet-100";
  if (status === "IN_PROGRESS") return "border-sky-300/35 bg-sky-500/20 text-sky-100";
  return "border-slate-300/30 bg-slate-500/20 text-slate-100";
}

export function MdsSectionFEditor({
  residents,
  initial,
  history,
  timeZone
}: {
  residents: DocumentationResidentOption[];
  initial: ClinicalAssessmentEditorData;
  history: ClinicalAssessmentHistoryRow[];
  timeZone?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [residentId, setResidentId] = useState(initial.residentId);
  const [status, setStatus] = useState<DocumentationStatus>(initial.status);
  const [priority, setPriority] = useState(initial.priority);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [reviewDate, setReviewDate] = useState(initial.reviewDate);
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt);
  const [assignedStaff, setAssignedStaff] = useState(initial.assignedStaff);
  const [followUp, setFollowUp] = useState(initial.followUp);
  const [carryForwardFromId, setCarryForwardFromId] = useState(initial.carryForwardFromId);
  const [noMajorChange, setNoMajorChange] = useState(initial.noMajorChange);

  const initialParsed = useMemo(() => {
    const raw = parseSectionValues(initial.narrative);
    const values: Record<string, string> = {};
    const states: Record<string, DocumentationSectionChangeState> = {};

    for (const section of MDS_SECTIONS) {
      const parsed = parseMdsStructuredPayload(raw[section.id] || "");
      values[section.id] = parsed.current || raw[section.id] || "";
      if (parsed.state) {
        states[section.id] = parsed.state;
      }
    }

    return { values, states };
  }, [initial.narrative]);

  const [sectionValues, setSectionValues] = useState<Record<string, string>>(initialParsed.values);
  const [sectionStates, setSectionStates] = useState<Record<string, DocumentationSectionChangeState>>(() => {
    const values: Record<string, DocumentationSectionChangeState> = {};
    for (const section of MDS_SECTIONS) {
      values[section.id] = initial.sectionStates[section.id] || initialParsed.states[section.id] || "NO_CHANGE";
    }
    return values;
  });

  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  const resident = useMemo(() => residents.find((item) => item.id === residentId) ?? null, [residentId, residents]);
  const currentProgress = useMemo(() => calculateProgress(sectionValues), [sectionValues]);

  const dirtySnapshot = useMemo(
    () =>
      JSON.stringify({
        residentId,
        status,
        priority,
        dueDate,
        reviewDate,
        occurredAt,
        assignedStaff,
        followUp,
        carryForwardFromId,
        noMajorChange,
        sectionValues,
        sectionStates
      }),
    [assignedStaff, carryForwardFromId, dueDate, followUp, noMajorChange, occurredAt, priority, residentId, reviewDate, sectionStates, sectionValues, status]
  );

  const baselineRef = useRef<string>(dirtySnapshot);
  const isDirty = dirtySnapshot !== baselineRef.current;

  const applyHistoryEntry = (entry: ClinicalAssessmentHistoryRow) => {
    setSectionValues(parseSectionValues(entry.narrative));
    setSectionStates(entry.sectionStates ?? {});
    setCarryForwardFromId(entry.id);
    setFollowUp(entry.summary);
    if (entry.dueDateIso) setDueDate(entry.dueDateIso.slice(0, 10));
    if (entry.reviewDateIso) setReviewDate(entry.reviewDateIso.slice(0, 10));
  };

  const submit = (nextStatus: DocumentationStatus) => {
    setFeedback(null);
    const narrative = buildNarrative(sectionValues, sectionStates);

    if (!residentId) {
      setFeedback({ type: "error", message: "Select a resident before saving this entry." });
      return;
    }

    if (narrative.trim().length < 8) {
      setFeedback({ type: "error", message: "Complete at least one Section F support section before saving." });
      return;
    }

    const payload = {
      kind: "MDS" as const,
      residentId,
      title: "MDS Section F Support Entry",
      narrative,
      followUp,
      status: nextStatus,
      priority,
      dueDate: dueDate || null,
      reviewDate: reviewDate || null,
      occurredAt: occurredAt || null,
      assessmentType: "SECTION_F" as const,
      assignedStaff: assignedStaff || null,
      noMajorChange,
      sectionStates,
      carryForwardFromId: carryForwardFromId || null,
      sectionProgress: currentProgress,
      participationLevel: "MODERATE" as const,
      moodAffect: "CALM" as const,
      cuesRequired: "VERBAL" as const,
      response: "NEUTRAL" as const
    };

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
          throw new Error(result?.error?.message || "Unable to save MDS Section F entry.");
        }

        baselineRef.current = dirtySnapshot;
        setFeedback({
          type: "ok",
          message: nextStatus === "COMPLETED" ? "Section F entry finalized." : "Section F entry saved."
        });

        router.replace(`/app/documentation/mds/${encodeURIComponent(result.entry.id)}`);
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to save MDS Section F entry."
        });
      }
    });
  };

  const deleteEntry = () => {
    if (!initial.id) return;
    if (!window.confirm("Delete this MDS Section F entry? This action cannot be undone.")) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/documentation/entries/${initial.id}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(result?.error?.message || "Unable to delete MDS Section F entry.");
        }

        router.push("/app/documentation/mds");
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to delete MDS Section F entry."
        });
      }
    });
  };

  return (
    <section className="space-y-4">
      <header className="rounded-[1.6rem] border border-emerald-300/25 bg-[linear-gradient(180deg,rgba(9,34,29,0.85)_0%,rgba(8,18,17,0.9)_100%)] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/80">MDS Activities Support</p>
            <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">{initial.id ? "Update MDS Section F Entry" : "New MDS Section F Entry"}</h2>
            <p className="mt-1 text-sm text-[#c2d2ec]">
              Structured workflow for Section F preference support, resident response review, and compliant finalization.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/documentation/mds"
              className="inline-flex h-10 items-center rounded-full border border-[#35527f] bg-[#132848] px-4 text-xs font-semibold text-[#d8e7ff]"
            >
              Back to Queue
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#3a5f8f] bg-[#17335f] px-4 text-xs font-semibold text-[#d8e7ff]"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            {initial.id ? (
              <button
                type="button"
                onClick={deleteEntry}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/20 px-4 text-xs font-semibold text-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#294068] bg-[linear-gradient(180deg,#0a182f_0%,#091325_100%)] p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Resident</span>
                <select
                  value={residentId}
                  onChange={(event) => setResidentId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                >
                  <option value="">Select resident</option>
                  {residents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.room} · {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as DocumentationStatus)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="READY_REVIEW">Ready to Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as "LOW" | "MEDIUM" | "HIGH")}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Due / Review Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">ARD / Review Date</span>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Assessment Date/Time</span>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf] md:col-span-2 xl:col-span-3">
                <span className="font-semibold uppercase tracking-[0.1em]">Assigned Staff</span>
                <input
                  value={assignedStaff}
                  onChange={(event) => setAssignedStaff(event.target.value)}
                  placeholder="Optional: assigned clinician or reviewer"
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff] placeholder:text-[#839bc1]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf] md:col-span-2 xl:col-span-3">
                <span className="font-semibold uppercase tracking-[0.1em]">Follow-Up / Team Coordination</span>
                <textarea
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  rows={2}
                  placeholder="Optional follow-up summary for interdisciplinary team"
                  className="w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#839bc1]"
                />
              </label>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-xs text-[#c6d8f2]">
              <input
                type="checkbox"
                checked={noMajorChange}
                onChange={(event) => setNoMajorChange(event.target.checked)}
                className="h-4 w-4 rounded border-[#4a6591] bg-[#10213e]"
              />
              No major Section F preference change this review
            </label>
          </section>

          <section className="space-y-3">
            {MDS_SECTIONS.map((section) => (
              <article key={section.id} className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                    <p className="mt-1 text-xs text-[#9fb6da]">{section.helper}</p>
                  </div>
                  <div className="inline-flex rounded-full border border-[#35527f] bg-[#13284b] p-1">
                    {(["NO_CHANGE", "UPDATED", "SIGNIFICANT_CHANGE"] as DocumentationSectionChangeState[]).map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() =>
                          setSectionStates((current) => ({
                            ...current,
                            [section.id]: state
                          }))
                        }
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                          sectionStates[section.id] === state
                            ? "bg-emerald-500/25 text-emerald-100"
                            : "text-[#b6cbef]"
                        )}
                      >
                        {CHANGE_STATE_LABELS[state]}
                      </button>
                    ))}
                  </div>
                </header>

                <div className="mt-2 flex flex-wrap gap-2">
                  {section.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setSectionValues((current) => ({
                          ...current,
                          [section.id]: current[section.id]?.includes(option)
                            ? current[section.id]
                            : `${current[section.id] ? `${current[section.id].trim()}\n` : ""}${option}`.trim()
                        }))
                      }
                      className="inline-flex rounded-full border border-[#34517f] bg-[#142a4d] px-3 py-1 text-[11px] font-semibold text-[#d8e7ff]"
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={sectionValues[section.id] || ""}
                  onChange={(event) =>
                    setSectionValues((current) => ({
                      ...current,
                      [section.id]: event.target.value
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                  placeholder="Document Section F support details"
                />
              </article>
            ))}
          </section>
        </div>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Resident Snapshot</p>
            {resident ? (
              <>
                <p className="mt-2 text-lg font-semibold text-white">{resident.name}</p>
                <p className="text-xs text-[#9eb5db]">
                  Room {resident.room}
                  {resident.unit ? ` · ${resident.unit}` : ""}
                  {resident.age ? ` · Age ${resident.age}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#9eb5db]">Select a resident to begin documentation.</p>
            )}

            <div className="mt-3 space-y-1 text-xs text-[#9eb5db]">
              <p className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-emerald-200" />
                Section progress: {currentProgress}%
              </p>
              <p className="inline-flex items-center gap-1">
                <ClipboardCheck className="h-3.5 w-3.5 text-sky-200" />
                Status: {status.replaceAll("_", " ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSectionValues((current) => ({
                  ...current,
                  section_f_narrative: generateSectionFSummary(current)
                }))
              }
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-[#3f5f90] bg-[#173460] text-xs font-semibold text-[#d9e8ff]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Build Section F Narrative
            </button>
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Resident History</p>
            <div className="mt-2 max-h-[500px] space-y-2 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#35527f] bg-[#10213e] px-3 py-4 text-xs text-[#9db4da]">
                  No Section F support history found for this resident.
                </p>
              ) : (
                history.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-[#2f476f] bg-[#10213d] p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", statusPill(entry.status))}>
                        {entry.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-[#a8c0e5]">Section F</span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{entry.summary}</p>
                    <p className="mt-1 text-[#98afd5]">{formatActifyDate(entry.createdAtIso, timeZone)} · {entry.authorName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/app/documentation/mds/${encodeURIComponent(entry.id)}`}
                        className="inline-flex h-7 items-center gap-1 rounded-full border border-[#3c5a88] bg-[#17335f] px-3 text-[10px] font-semibold text-[#d9e8ff]"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Open
                      </Link>
                      {!initial.id ? (
                        <button
                          type="button"
                          onClick={() => applyHistoryEntry(entry)}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-[#3c5a88] bg-[#142a4d] px-3 text-[10px] font-semibold text-[#d9e8ff]"
                        >
                          <Copy className="h-3 w-3" />
                          Duplicate
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
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
        </aside>
      </div>

      <footer className="sticky bottom-3 z-20 rounded-2xl border border-[#2a426a] bg-[linear-gradient(180deg,rgba(10,26,48,0.92)_0%,rgba(8,18,34,0.96)_100%)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#a8c0e6]">
            <p className="font-semibold text-white">MDS Section F · {currentProgress}% complete</p>
            <p>{isDirty ? "Unsaved changes" : "All changes synced in this session"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => submit("DRAFT")}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#3f5f90] bg-[#17335f] px-4 text-xs font-semibold text-[#d8e7ff]"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => submit("READY_REVIEW")}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-full border border-violet-300/35 bg-violet-500/20 px-4 text-xs font-semibold text-violet-100"
            >
              Save + Ready to Review
            </button>
            <button
              type="button"
              onClick={() => submit("COMPLETED")}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-full border border-emerald-300/35 bg-emerald-500/20 px-4 text-xs font-semibold text-emerald-100"
            >
              Finalize Entry
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}
