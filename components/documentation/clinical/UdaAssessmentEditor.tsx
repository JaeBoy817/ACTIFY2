"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ClipboardCheck,
  Copy,
  FileClock,
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
import type { DocumentationSectionChangeState, DocumentationStatus } from "@/lib/documentation/types";
import { cn } from "@/lib/utils";

type UdaAssessmentType = "ANNUAL" | "QUARTERLY";

type UdaSectionDefinition = {
  id: string;
  label: string;
  helper: string;
  options: string[];
};

const ANNUAL_SECTIONS: UdaSectionDefinition[] = [
  {
    id: "interests_preferences",
    label: "Interests / Preferences",
    helper: "Document the resident's preferred leisure activities and interests.",
    options: [
      "Bingo",
      "Trivia",
      "Music",
      "Church / Devotion",
      "Reminiscing",
      "Word games",
      "TV",
      "Movies",
      "Outdoors",
      "Crafts",
      "Cards / Dominoes",
      "Social visits",
      "1:1 visits",
      "Independent leisure",
      "Family contact"
    ]
  },
  {
    id: "prior_lifestyle",
    label: "Prior Lifestyle / Background",
    helper: "Capture meaningful routines, hobbies, and social history that should continue in programming.",
    options: [
      "Worked in service-oriented role",
      "Enjoyed church/community groups",
      "Preferred family-centered activities",
      "Enjoyed independent hobbies",
      "Preferred structured daily routine"
    ]
  },
  {
    id: "participation_pattern",
    label: "Current Participation Pattern",
    helper: "Summarize the resident's current attendance and participation pattern.",
    options: [
      "Attends groups regularly",
      "Attends selectively",
      "Prefers 1:1",
      "Prefers in-room programming",
      "Declines most activities",
      "Participates with cueing",
      "Participates as desired and tolerated"
    ]
  },
  {
    id: "strengths_abilities",
    label: "Strengths / Abilities",
    helper: "Highlight strengths to preserve engagement and quality of life.",
    options: [
      "Responds well to familiar staff",
      "Remains socially engaged with cues",
      "Able to complete short activities",
      "Enjoys sensory stimulation",
      "Able to participate in structured group"
    ]
  },
  {
    id: "barriers_limitations",
    label: "Barriers / Limitations",
    helper: "Identify barriers impacting successful participation.",
    options: [
      "Fatigue",
      "Weakness",
      "Endurance",
      "Hearing deficit",
      "Vision deficit",
      "Cognitive impairment",
      "Communication difficulty",
      "Anxiety",
      "Behavioral symptoms",
      "Isolation preference",
      "Bedbound",
      "Wheelchair dependent",
      "Right to refuse"
    ]
  },
  {
    id: "cognitive_communication",
    label: "Cognitive / Communication Considerations",
    helper: "Describe cognitive status and cueing/communication approach.",
    options: [
      "Benefits from verbal cueing",
      "Benefits from visual prompts",
      "Short one-step direction preferred",
      "Needs repeated cueing",
      "Responds best with familiar approach"
    ]
  },
  {
    id: "sensory_physical",
    label: "Sensory / Physical Limitations Affecting Activity Participation",
    helper: "Capture hearing, vision, mobility, and endurance needs.",
    options: [
      "Requires amplified voice",
      "Requires visual contrast / large print",
      "Needs adapted positioning",
      "Tolerates short duration only",
      "Requires in-room alternatives"
    ]
  },
  {
    id: "psychosocial_emotional",
    label: "Psychosocial / Emotional Status Related to Activities",
    helper: "Document mood and psychosocial considerations affecting participation.",
    options: [
      "Pleasant and receptive",
      "Withdrawn at times",
      "Anxious in large groups",
      "Benefits from reassurance",
      "Responds positively to 1:1"
    ]
  },
  {
    id: "group_participation",
    label: "Group Participation",
    helper: "Summarize tolerance and response to group settings.",
    options: [
      "Attends selected groups",
      "Attends with cueing",
      "Short group tolerance",
      "Limited group tolerance",
      "Prefers small-group setting"
    ]
  },
  {
    id: "one_to_one_participation",
    label: "1:1 Participation",
    helper: "Describe 1:1 response and effective individual approaches.",
    options: [
      "Accepts 1:1 better than group setting",
      "Engages with preferred staff",
      "Responds to brief room visits",
      "Responds to reminiscence-based 1:1",
      "Responds to music-based 1:1"
    ]
  },
  {
    id: "independent_leisure",
    label: "Independent / In-room Leisure",
    helper: "Capture independent leisure habits and supports.",
    options: [
      "Prefers TV / movies",
      "Enjoys word books or puzzles",
      "Benefits from sensory items",
      "Enjoys magazines or reading",
      "Requires set-up assistance"
    ]
  },
  {
    id: "family_spiritual_social",
    label: "Family / Spiritual / Social Preferences",
    helper: "Document family contact patterns and spiritual or social preferences.",
    options: [
      "Family contact important",
      "Enjoys spiritual support",
      "Prefers selected peers",
      "Benefits from family encouragement",
      "No expressed spiritual preference"
    ]
  },
  {
    id: "interventions_needed",
    label: "Activity Interventions Needed",
    helper: "Define interventions required to support successful participation.",
    options: [
      "Encourage attendance",
      "Offer in-room alternatives",
      "Provide 1:1 visits",
      "Adapt activity approach",
      "Short duration activities",
      "Familiar staff approach",
      "Sensory-based intervention",
      "Music-based intervention",
      "Spiritual support",
      "Family contact encouragement"
    ]
  },
  {
    id: "summary_statement",
    label: "Summary / Assessment Statement",
    helper: "Document final UDA summary statement and clinical recommendation.",
    options: [
      "participates as desired and tolerated",
      "prefers selective attendance",
      "accepts 1:1 better than group setting",
      "right to refuse honored",
      "benefits from encouragement and cueing",
      "enjoys familiar preference-based programming",
      "requires adapted approach for successful engagement"
    ]
  }
];

const QUARTERLY_SECTIONS: UdaSectionDefinition[] = [
  {
    id: "participation_since_last_review",
    label: "Participation Since Last Review",
    helper: "Review participation change since prior assessment.",
    options: [
      "No significant participation change",
      "Improved participation tolerance",
      "Decline in group participation",
      "More receptive to 1:1",
      "Participation fluctuates with cueing"
    ]
  },
  {
    id: "changes_interests_preferences",
    label: "Changes in Interests / Preferences",
    helper: "Document any preference changes or reaffirm no change.",
    options: [
      "No change in interests",
      "Increased music preference",
      "Increased in-room preference",
      "Reduced tolerance for large groups",
      "Newly expressed spiritual interest"
    ]
  },
  {
    id: "changes_physical_cognitive",
    label: "Changes in Physical / Cognitive Ability",
    helper: "Capture changes impacting approach and cueing.",
    options: [
      "No notable change",
      "Increased fatigue",
      "Requires increased cueing",
      "Declined endurance",
      "Needs more simplified direction"
    ]
  },
  {
    id: "changes_mood_behavior",
    label: "Changes in Mood / Behavior Affecting Activities",
    helper: "Describe behavior or mood changes affecting participation.",
    options: [
      "Mood remains stable",
      "Anxiety impacts participation",
      "Increased withdrawal",
      "Variable tolerance",
      "Responds to reassurance"
    ]
  },
  {
    id: "barriers_review",
    label: "Continued Barriers / New Barriers",
    helper: "Identify barriers still present and new barriers since last review.",
    options: [
      "Barriers unchanged",
      "Ongoing endurance limitation",
      "Hearing/vision concern continues",
      "New mobility limitation",
      "Right to refuse continues"
    ]
  },
  {
    id: "preferred_interventions",
    label: "Current Preferred Interventions",
    helper: "Confirm interventions that remain effective or note updates.",
    options: [
      "Continue preference-based program",
      "Continue selective group approach",
      "Continue 1:1 emphasis",
      "Continue adapted in-room options",
      "Continue cueing and encouragement"
    ]
  },
  {
    id: "quarterly_summary",
    label: "Quarterly Summary Statement",
    helper: "Summarize no change/changes and recommendation for care approach.",
    options: [
      "Current activity approach remains appropriate",
      "Interventions remain effective",
      "Plan updated for change in tolerance",
      "Continue care plan approach with monitoring",
      "Recommend revised individualized interventions"
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

function parseSectionValues(narrative: string, sections: UdaSectionDefinition[]) {
  const values: Record<string, string> = {};
  for (const section of sections) {
    const label = escapeRegExp(section.label);
    const headingPattern = new RegExp(`(?:^|\\n)(?:##\\s*)?${label}:\\s*\\n([\\s\\S]*?)(?=\\n(?:##\\s*)?(?:${sections.map((item) => escapeRegExp(item.label)).join("|")}):\\s*\\n|$)`, "i");
    const match = narrative.match(headingPattern);
    values[section.id] = (match?.[1] || "").trim();
  }
  return values;
}

function parseStructuredSectionPayload(value: string): {
  state: DocumentationSectionChangeState | null;
  prior: string;
  current: string;
} {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let state: DocumentationSectionChangeState | null = null;
  const priorParts: string[] = [];
  const currentParts: string[] = [];
  let mode: "prior" | "current" = "current";

  for (const line of lines) {
    if (line.startsWith("State:")) {
      const token = line.slice("State:".length).trim().toUpperCase().replaceAll(" ", "_");
      if (token === "NO_CHANGE" || token === "UPDATED" || token === "SIGNIFICANT_CHANGE") {
        state = token;
      }
      continue;
    }
    if (line.startsWith("Prior:")) {
      mode = "prior";
      const part = line.slice("Prior:".length).trim();
      if (part) priorParts.push(part);
      continue;
    }
    if (line.startsWith("Current:")) {
      mode = "current";
      const part = line.slice("Current:".length).trim();
      if (part) currentParts.push(part);
      continue;
    }

    if (mode === "prior") {
      priorParts.push(line);
    } else {
      currentParts.push(line);
    }
  }

  return {
    state,
    prior: priorParts.join("\n").trim(),
    current: currentParts.join("\n").trim()
  };
}

function buildNarrative(params: {
  assessmentType: UdaAssessmentType;
  annualValues: Record<string, string>;
  quarterlyValues: Record<string, string>;
  quarterlyChangeStates: Record<string, DocumentationSectionChangeState>;
  quarterlyPriorValues: Record<string, string>;
}) {
  const blocks: string[] = [];

  if (params.assessmentType === "ANNUAL") {
    for (const section of ANNUAL_SECTIONS) {
      const value = (params.annualValues[section.id] || "").trim();
      if (!value) continue;
      blocks.push(`${section.label}:\n${value}`);
    }
    return blocks.join("\n\n").trim();
  }

  for (const section of QUARTERLY_SECTIONS) {
    const value = (params.quarterlyValues[section.id] || "").trim();
    const prior = (params.quarterlyPriorValues[section.id] || "").trim();
    const state = params.quarterlyChangeStates[section.id] || "NO_CHANGE";

    if (!value && !prior) continue;

    const lines: string[] = [];
    lines.push(`State: ${CHANGE_STATE_LABELS[state]}`);
    if (prior) lines.push(`Prior: ${prior}`);
    if (value) lines.push(`Current: ${value}`);

    blocks.push(`${section.label}:\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n").trim();
}

function calculateProgress(assessmentType: UdaAssessmentType, annualValues: Record<string, string>, quarterlyValues: Record<string, string>) {
  if (assessmentType === "ANNUAL") {
    const done = ANNUAL_SECTIONS.filter((section) => (annualValues[section.id] || "").trim().length > 0).length;
    return Math.round((done / ANNUAL_SECTIONS.length) * 100);
  }

  const done = QUARTERLY_SECTIONS.filter((section) => (quarterlyValues[section.id] || "").trim().length > 0).length;
  return Math.round((done / QUARTERLY_SECTIONS.length) * 100);
}

function summarizeAnnual(values: Record<string, string>) {
  const participation = values.participation_pattern || "participates as desired and tolerated";
  const barriers = values.barriers_limitations || "intermittent barriers noted";
  const interventions = values.interventions_needed || "preference-based interventions";
  return `Resident ${participation.toLowerCase()}. Barriers include ${barriers.toLowerCase()}. Continue ${interventions.toLowerCase()} while honoring right to refuse and reinforcing resident choice.`;
}

function summarizeQuarterly(values: Record<string, string>, states: Record<string, DocumentationSectionChangeState>) {
  const changeCount = Object.values(states).filter((state) => state === "UPDATED" || state === "SIGNIFICANT_CHANGE").length;
  const participation = values.participation_since_last_review || "participation remains as desired and tolerated";
  if (changeCount === 0) {
    return `Quarterly review indicates no major activity participation change. ${participation}. Current interventions remain appropriate and should continue.`;
  }
  return `Quarterly review identified ${changeCount} area(s) requiring update. ${participation}. Activity approach should be updated where indicated and monitored next review cycle.`;
}

function statusPill(status: DocumentationStatus) {
  if (status === "COMPLETED") return "border-emerald-300/35 bg-emerald-500/20 text-emerald-100";
  if (status === "READY_REVIEW") return "border-violet-300/35 bg-violet-500/20 text-violet-100";
  if (status === "IN_PROGRESS") return "border-sky-300/35 bg-sky-500/20 text-sky-100";
  return "border-slate-300/30 bg-slate-500/20 text-slate-100";
}

export function UdaAssessmentEditor({
  residents,
  initial,
  history
}: {
  residents: DocumentationResidentOption[];
  initial: ClinicalAssessmentEditorData;
  history: ClinicalAssessmentHistoryRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialAssessmentType = (initial.assessmentType === "QUARTERLY" ? "QUARTERLY" : "ANNUAL") as UdaAssessmentType;
  const [assessmentType, setAssessmentType] = useState<UdaAssessmentType>(initialAssessmentType);
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

  const initialAnnualValues = useMemo(() => parseSectionValues(initial.narrative, ANNUAL_SECTIONS), [initial.narrative]);
  const initialQuarterlyParsed = useMemo(() => {
    const raw = parseSectionValues(initial.narrative, QUARTERLY_SECTIONS);
    const current: Record<string, string> = {};
    const prior: Record<string, string> = {};
    const states: Record<string, DocumentationSectionChangeState> = {};

    for (const section of QUARTERLY_SECTIONS) {
      const parsed = parseStructuredSectionPayload(raw[section.id] || "");
      current[section.id] = parsed.current || raw[section.id] || "";
      prior[section.id] = parsed.prior;
      if (parsed.state) {
        states[section.id] = parsed.state;
      }
    }

    return { current, prior, states };
  }, [initial.narrative]);

  const [annualValues, setAnnualValues] = useState<Record<string, string>>(initialAnnualValues);
  const [quarterlyValues, setQuarterlyValues] = useState<Record<string, string>>(initialQuarterlyParsed.current);

  const [quarterlyChangeStates, setQuarterlyChangeStates] = useState<Record<string, DocumentationSectionChangeState>>(() => {
    const states: Record<string, DocumentationSectionChangeState> = {};
    for (const section of QUARTERLY_SECTIONS) {
      states[section.id] = initial.sectionStates[section.id] || initialQuarterlyParsed.states[section.id] || "NO_CHANGE";
    }
    return states;
  });

  const [quarterlyPriorValues, setQuarterlyPriorValues] = useState<Record<string, string>>(initialQuarterlyParsed.prior);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  const resident = useMemo(() => residents.find((item) => item.id === residentId) ?? null, [residentId, residents]);

  const latestAnnualHistory = useMemo(
    () => history.find((entry) => entry.assessmentType === "ANNUAL") ?? null,
    [history]
  );

  const latestQuarterlyHistory = useMemo(
    () => history.find((entry) => entry.assessmentType === "QUARTERLY") ?? null,
    [history]
  );

  const currentProgress = useMemo(
    () => calculateProgress(assessmentType, annualValues, quarterlyValues),
    [annualValues, assessmentType, quarterlyValues]
  );

  const dirtySnapshot = useMemo(
    () =>
      JSON.stringify({
        assessmentType,
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
        annualValues,
        quarterlyValues,
        quarterlyChangeStates,
        quarterlyPriorValues
      }),
    [
      annualValues,
      assessmentType,
      assignedStaff,
      carryForwardFromId,
      dueDate,
      followUp,
      noMajorChange,
      occurredAt,
      priority,
      quarterlyChangeStates,
      quarterlyPriorValues,
      quarterlyValues,
      residentId,
      reviewDate,
      status
    ]
  );

  const baselineRef = useRef<string>(dirtySnapshot);
  const isDirty = dirtySnapshot !== baselineRef.current;

  const applyHistoryEntry = (entry: ClinicalAssessmentHistoryRow, mode: "duplicate" | "prior") => {
    if (mode === "duplicate") {
      const parsedAnnual = parseSectionValues(entry.narrative, ANNUAL_SECTIONS);
      const parsedQuarterly = parseSectionValues(entry.narrative, QUARTERLY_SECTIONS);

      if (entry.assessmentType === "ANNUAL") {
        setAssessmentType("ANNUAL");
        setAnnualValues(parsedAnnual);
      } else {
        setAssessmentType("QUARTERLY");
        setQuarterlyValues(parsedQuarterly);
      }

      setCarryForwardFromId(entry.id);
      setFollowUp(entry.summary);
      if (entry.dueDateIso) setDueDate(entry.dueDateIso.slice(0, 10));
      if (entry.reviewDateIso) setReviewDate(entry.reviewDateIso.slice(0, 10));
      return;
    }

    const source = parseSectionValues(entry.narrative, ANNUAL_SECTIONS);
    const priorValues: Record<string, string> = {};

    for (const section of QUARTERLY_SECTIONS) {
      const annualKey = section.id
        .replace("participation_since_last_review", "participation_pattern")
        .replace("changes_interests_preferences", "interests_preferences")
        .replace("changes_physical_cognitive", "cognitive_communication")
        .replace("changes_mood_behavior", "psychosocial_emotional")
        .replace("barriers_review", "barriers_limitations")
        .replace("preferred_interventions", "interventions_needed")
        .replace("quarterly_summary", "summary_statement");
      priorValues[section.id] = source[annualKey] || "";
    }

    setAssessmentType("QUARTERLY");
    setQuarterlyPriorValues(priorValues);
    setCarryForwardFromId(entry.id);
  };

  const submit = (nextStatus: DocumentationStatus) => {
    setFeedback(null);

    const narrative = buildNarrative({
      assessmentType,
      annualValues,
      quarterlyValues,
      quarterlyChangeStates,
      quarterlyPriorValues
    });

    if (!residentId) {
      setFeedback({ type: "error", message: "Select a resident before saving this assessment." });
      return;
    }

    if (narrative.trim().length < 8) {
      setFeedback({ type: "error", message: "Complete at least one structured section before saving." });
      return;
    }

    const payload = {
      kind: "UDA" as const,
      residentId,
      title: `${assessmentType === "ANNUAL" ? "Annual" : "Quarterly"} UDA Assessment`,
      narrative,
      followUp,
      status: nextStatus,
      priority,
      dueDate: dueDate || null,
      reviewDate: reviewDate || null,
      occurredAt: occurredAt || null,
      assessmentType,
      assignedStaff: assignedStaff || null,
      noMajorChange: assessmentType === "QUARTERLY" ? noMajorChange : null,
      sectionStates: assessmentType === "QUARTERLY" ? quarterlyChangeStates : null,
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
          throw new Error(result?.error?.message || "Unable to save UDA assessment.");
        }

        baselineRef.current = dirtySnapshot;
        setFeedback({
          type: "ok",
          message: nextStatus === "COMPLETED" ? "Assessment finalized." : "Assessment saved."
        });

        router.replace(`/app/documentation/uda/${encodeURIComponent(result.entry.id)}`);
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to save UDA assessment."
        });
      }
    });
  };

  const deleteEntry = () => {
    if (!initial.id) return;
    if (!window.confirm("Delete this UDA assessment? This action cannot be undone.")) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/documentation/entries/${initial.id}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(result?.error?.message || "Unable to delete UDA assessment.");
        }
        router.push("/app/documentation/uda");
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Unable to delete UDA assessment."
        });
      }
    });
  };

  return (
    <section className="space-y-4">
      <header className="rounded-[1.6rem] border border-amber-300/25 bg-[linear-gradient(180deg,rgba(34,26,12,0.85)_0%,rgba(15,12,8,0.9)_100%)] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">Activity Assessment Workflow</p>
            <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">
              {initial.id ? "Update UDA Assessment" : "New UDA Assessment"}
            </h2>
            <p className="mt-1 text-sm text-[#c2d2ec]">
              Annual and quarterly assessment workspace with carry-forward history, change review, and finalize workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/documentation/uda"
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

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="space-y-3">
          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Assessment Type</p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                onClick={() => setAssessmentType("ANNUAL")}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border text-xs font-semibold",
                  assessmentType === "ANNUAL"
                    ? "border-amber-300/35 bg-amber-500/20 text-amber-100"
                    : "border-[#37527f] bg-[#152b4f] text-[#d8e7ff]"
                )}
              >
                Annual UDA
              </button>
              <button
                type="button"
                onClick={() => setAssessmentType("QUARTERLY")}
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border text-xs font-semibold",
                  assessmentType === "QUARTERLY"
                    ? "border-amber-300/35 bg-amber-500/20 text-amber-100"
                    : "border-[#37527f] bg-[#152b4f] text-[#d8e7ff]"
                )}
              >
                Quarterly UDA
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Section Progress</p>
            <p className="mt-2 text-3xl font-black text-white">{currentProgress}%</p>
            <div className="mt-2 h-2 rounded-full bg-[#1f355b]">
              <div className="h-2 rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_100%)]" style={{ width: `${Math.max(currentProgress, 4)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#9cb4da]">Structured completion across required assessment sections.</p>
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Quick Summary</p>
            <button
              type="button"
              onClick={() => {
                if (assessmentType === "ANNUAL") {
                  setAnnualValues((current) => ({
                    ...current,
                    summary_statement: summarizeAnnual(current)
                  }));
                  return;
                }
                setQuarterlyValues((current) => ({
                  ...current,
                  quarterly_summary: summarizeQuarterly(current, quarterlyChangeStates)
                }));
              }}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-[#3f5f90] bg-[#173460] text-xs font-semibold text-[#d9e8ff]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Build Summary Statement
            </button>

            {assessmentType === "QUARTERLY" ? (
              <label className="mt-3 flex items-center gap-2 text-xs text-[#c8d8f4]">
                <input
                  type="checkbox"
                  checked={noMajorChange}
                  onChange={(event) => setNoMajorChange(event.target.checked)}
                  className="h-4 w-4 rounded border-[#4a6591] bg-[#10213e]"
                />
                No major change this quarter
              </label>
            ) : null}
          </section>
        </aside>

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
                <span className="font-semibold uppercase tracking-[0.1em]">Due Date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 text-sm text-[#dceaff]"
                />
              </label>

              <label className="space-y-1 text-xs text-[#a6bddf]">
                <span className="font-semibold uppercase tracking-[0.1em]">Review Date</span>
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
                <span className="font-semibold uppercase tracking-[0.1em]">Follow-Up / Care Plan Coordination</span>
                <textarea
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  rows={2}
                  placeholder="Optional follow-up action summary"
                  className="w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#839bc1]"
                />
              </label>
            </div>
          </section>

          {assessmentType === "ANNUAL" ? (
            <section className="space-y-3">
              {ANNUAL_SECTIONS.map((section) => (
                <article key={section.id} className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                      <p className="mt-1 text-xs text-[#9fb6da]">{section.helper}</p>
                    </div>
                  </header>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {section.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setAnnualValues((current) => ({
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
                    value={annualValues[section.id] || ""}
                    onChange={(event) =>
                      setAnnualValues((current) => ({
                        ...current,
                        [section.id]: event.target.value
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                    placeholder="Document assessment details"
                  />
                </article>
              ))}
            </section>
          ) : (
            <section className="space-y-3">
              {QUARTERLY_SECTIONS.map((section) => (
                <article key={section.id} className="rounded-2xl border border-[#2a426a] bg-[#0a182f] p-4">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{section.label}</h3>
                      <p className="mt-1 text-xs text-[#9fb6da]">{section.helper}</p>
                    </div>
                    <div className="inline-flex rounded-full border border-[#34527f] bg-[#13284b] p-1">
                      {(["NO_CHANGE", "UPDATED", "SIGNIFICANT_CHANGE"] as DocumentationSectionChangeState[]).map((state) => (
                        <button
                          key={state}
                          type="button"
                          onClick={() =>
                            setQuarterlyChangeStates((current) => ({
                              ...current,
                              [section.id]: state
                            }))
                          }
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            quarterlyChangeStates[section.id] === state
                              ? "bg-amber-500/25 text-amber-100"
                              : "text-[#b6cbef]"
                          )}
                        >
                          {CHANGE_STATE_LABELS[state]}
                        </button>
                      ))}
                    </div>
                  </header>

                  {quarterlyPriorValues[section.id] ? (
                    <div className="mt-2 rounded-xl border border-[#39557f] bg-[#112542] p-2 text-xs text-[#abc3e8]">
                      <p className="font-semibold text-[#dceaff]">Carry-forward prior</p>
                      <p className="mt-1 whitespace-pre-wrap">{quarterlyPriorValues[section.id]}</p>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {section.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setQuarterlyValues((current) => ({
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
                    value={quarterlyValues[section.id] || ""}
                    onChange={(event) =>
                      setQuarterlyValues((current) => ({
                        ...current,
                        [section.id]: event.target.value
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-[#2f476f] bg-[#0d1d36] px-3 py-2 text-sm text-[#dceaff] placeholder:text-[#8198be]"
                    placeholder="Document change review and current assessment updates"
                  />
                </article>
              ))}
            </section>
          )}
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
              <p className="mt-2 text-sm text-[#9eb5db]">Select a resident to begin charting.</p>
            )}

            <div className="mt-3 space-y-2 text-xs text-[#a8c0e6]">
              <p className="inline-flex items-center gap-1">
                <FileClock className="h-3.5 w-3.5 text-amber-200" />
                Last Annual: {latestAnnualHistory ? new Date(latestAnnualHistory.createdAtIso).toLocaleDateString() : "--"}
              </p>
              <p className="inline-flex items-center gap-1">
                <ClipboardCheck className="h-3.5 w-3.5 text-sky-200" />
                Last Quarterly: {latestQuarterlyHistory ? new Date(latestQuarterlyHistory.createdAtIso).toLocaleDateString() : "--"}
              </p>
            </div>

            {latestAnnualHistory ? (
              <button
                type="button"
                onClick={() => applyHistoryEntry(latestAnnualHistory, "prior")}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border border-amber-300/35 bg-amber-500/15 text-xs font-semibold text-amber-100"
              >
                <Copy className="h-3.5 w-3.5" />
                Carry Forward Latest Annual
              </button>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#2a426a] bg-[#0b1930] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ab2d9]">Assessment History</p>
            <div className="mt-2 max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#35527f] bg-[#10213e] px-3 py-4 text-xs text-[#9db4da]">
                  No prior UDA history for this resident yet.
                </p>
              ) : (
                history.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-[#2f476f] bg-[#10213d] p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", statusPill(entry.status))}>
                        {entry.status.replaceAll("_", " ")}
                      </span>
                      <span className="text-[#a8c0e5]">
                        {entry.assessmentType === "QUARTERLY" ? "Quarterly" : "Annual"}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-white">{entry.summary}</p>
                    <p className="mt-1 text-[#98afd5]">{new Date(entry.createdAtIso).toLocaleDateString()} · {entry.authorName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/app/documentation/uda/${encodeURIComponent(entry.id)}`}
                        className="inline-flex h-7 items-center gap-1 rounded-full border border-[#3c5a88] bg-[#17335f] px-3 text-[10px] font-semibold text-[#d9e8ff]"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                        Open
                      </Link>
                      {!initial.id ? (
                        <button
                          type="button"
                          onClick={() => applyHistoryEntry(entry, "duplicate")}
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
            <p className="font-semibold text-white">{assessmentType === "ANNUAL" ? "Annual UDA" : "Quarterly UDA"} · {currentProgress}% complete</p>
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
              Finalize Assessment
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}
