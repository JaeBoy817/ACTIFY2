import type { ResidentStatus } from "@prisma/client";

import type { ResidentListRow } from "@/lib/residents/types";

import type {
  ResidentDraftPayload,
  ResidentSnapshot,
  ResidentSnapshotFormValue,
  ResidentSupportNeed,
  SnapshotFilterKey,
  SnapshotIntentAction
} from "@/components/resident-snapshots/types";

export const SUPPORT_NEED_OPTIONS: ResidentSupportNeed[] = [
  "Bed-Bound",
  "Wheelchair Use",
  "Hearing Support",
  "Vision Support",
  "Prefers Quiet Setting",
  "Needs Cueing",
  "Benefits from Sensory Items",
  "Short Attention Span",
  "Low Energy",
  "Enjoys Social Settings",
  "Better in Small Groups"
];

const ARCHIVED_STATUSES: ResidentStatus[] = ["DISCHARGED", "TRANSFERRED", "DECEASED"];

const AI_ACTIONS: SnapshotIntentAction[] = [
  {
    id: "idea-1to1",
    label: "Suggest a 1:1 idea",
    description: "Quick individualized idea based on this resident's style.",
    prompt: "Give me a 10-minute 1:1 idea for this resident"
  },
  {
    id: "idea-group",
    label: "Suggest a group activity fit",
    description: "Find a group format this resident is likely to engage with.",
    prompt: "Suggest a group activity this resident may enjoy"
  },
  {
    id: "conversation",
    label: "Generate conversation starters",
    description: "Create practical prompts for room visits and social check-ins.",
    prompt: "Give me conversation starters for this resident"
  },
  {
    id: "backup",
    label: "Suggest backup activity",
    description: "Give a quick fallback if this resident declines the planned group.",
    prompt: "Suggest a backup activity if this resident refuses group"
  },
  {
    id: "note-progress",
    label: "Draft a progress note",
    description: "Turn rough details into polished progress-note support wording.",
    prompt: "Draft a progress note for this resident"
  },
  {
    id: "note-1to1",
    label: "Draft a 1:1 note",
    description: "Generate a clean 1:1 documentation draft.",
    prompt: "Draft a 1:1 note for this resident"
  },
  {
    id: "reword",
    label: "Reword a note",
    description: "Rewrite rough wording while preserving the original meaning.",
    prompt: "Reword this note using this resident's preferences"
  },
  {
    id: "calming",
    label: "Suggest a calming activity",
    description: "Recommend low-stimulation options for unsettled moments.",
    prompt: "Suggest a calming activity for this resident"
  },
  {
    id: "low-energy",
    label: "Suggest low-energy activity",
    description: "Offer easy options for low endurance days.",
    prompt: "Give me a low-energy activity idea for this resident"
  },
  {
    id: "follow-up",
    label: "Create follow-up idea",
    description: "Propose a practical next-step visit or engagement plan.",
    prompt: "Create a follow-up activity idea for this resident"
  },
  {
    id: "mini-plan",
    label: "Build mini engagement plan",
    description: "Generate a quick plan for the next few touchpoints.",
    prompt: "Build a mini engagement plan for this resident for the next 7 days"
  },
  {
    id: "analytics-attendance-low",
    label: "Ask why attendance may be low",
    description: "Review patterns and suggest practical causes.",
    prompt: "Based on this resident context and attendance summary, explain possible reasons participation is low"
  },
  {
    id: "analytics-participation-boost",
    label: "Suggest activities to improve participation",
    description: "Target engagement with practical alternatives.",
    prompt: "Suggest activities to improve this resident's participation based on attendance trends"
  },
  {
    id: "analytics-1to1-plan",
    label: "Suggest 1:1 plan based on attendance",
    description: "Create a targeted 1:1 plan based on engagement patterns.",
    prompt: "Create a 1:1 plan for this resident using attendance and refusal trends"
  },
  {
    id: "analytics-summary",
    label: "Summarize attendance trends",
    description: "Generate a concise trend summary for staff handoff.",
    prompt: "Summarize this resident's participation and attendance trends with clear next steps"
  }
];

const FORM_LINE_KEYS = {
  interests: "Interests",
  dislikes: "Dislikes",
  favoriteActivities: "Favorite Activities",
  favoriteTopics: "Favorite Conversation Topics",
  favoriteMusic: "Favorite Music",
  favoriteMedia: "Favorite TV/Movie Interests",
  independentActivities: "Independent Activity Preferences",
  participationStyle: "Participation Style",
  groupParticipationNotes: "Group Participation Notes",
  oneToOneStyle: "1:1 Response Style",
  commonRefusals: "Common Refusals",
  whatWorks: "What Usually Works",
  whatDoesNotWork: "What Usually Does Not Work",
  engagementNotes: "Engagement Notes",
  conversationStarters: "Conversation Starters",
  thingsToAvoid: "Things to Avoid",
  lastActivity: "Last Activity",
  lastOneToOne: "Last 1:1",
  lastAiSuggestion: "Last AI Suggestion",
  supportNeeds: "Support Needs",
  archiveDate: "Archive Date",
  archiveReason: "Archive Reason",
  archiveNote: "Archive Note"
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function toDisplayDate(value: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function toRelativeDayLabel(value: string | null) {
  if (!value) return "No recent engagement";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No recent engagement";

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function splitList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[,;|\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseStructuredText(value: string | null) {
  const output: Record<string, string> = {};
  if (!value) return output;

  for (const line of value.split(/\n+/)) {
    const match = /^([^:]+):\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    output[match[1].trim()] = match[2].trim();
  }

  return output;
}

function parseName(fullName: string) {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "Resident"
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "Resident"
  };
}

function toSummary(resident: ResidentSnapshot) {
  if (resident.participationStyle) return resident.participationStyle;
  if (resident.whatWorks) return resident.whatWorks;
  return "Snapshot in progress. Add preferences to personalize ideas quickly.";
}

function inferSupportNeeds(tags: string[], safetyText: string | null) {
  const normalizedTags = tags.map(normalize);
  const safetyLower = (safetyText ?? "").toLowerCase();

  return SUPPORT_NEED_OPTIONS.filter((need) => {
    const needKey = normalize(need);
    return normalizedTags.some((tag) => tag.includes(needKey)) || safetyLower.includes(needKey);
  });
}

function deriveParticipationLevel(value: number | null) {
  if (value === null) return "neutral";
  if (value >= 65) return "high";
  if (value <= 30) return "low";
  return "neutral";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function inferAttendanceTrend({
  participation30d,
  refusals,
  noShows,
  oneToOneCount
}: {
  participation30d: number | null;
  refusals: number;
  noShows: number;
  oneToOneCount: number;
}): "up" | "flat" | "down" {
  if (participation30d === null) return "flat";
  if (participation30d >= 70 && refusals <= 1) return "up";
  if (participation30d <= 40 || refusals + noShows >= Math.max(3, oneToOneCount + 2)) return "down";
  return "flat";
}

function toFallbackAttendanceByActivityType(row: ResidentListRow) {
  const textBlocks = [
    row.preferences ?? "",
    row.notes ?? "",
    row.safetyNotes ?? "",
    ...row.recentNotes.map((entry) => entry.narrative)
  ]
    .join(" ")
    .toLowerCase();

  const buckets = [
    { label: "Bingo", keywords: ["bingo"] },
    { label: "Music", keywords: ["music", "sing", "hymn", "karaoke"] },
    { label: "Exercise", keywords: ["exercise", "stretch", "walk", "chair"] },
    { label: "Movie", keywords: ["movie", "tv", "film"] },
    { label: "Bible Study", keywords: ["bible", "devotion", "faith"] },
    { label: "Crafts", keywords: ["craft", "painting", "nail"] },
    { label: "Puzzles", keywords: ["puzzle", "crossword", "word search", "trivia"] },
    { label: "1:1 Visits", keywords: ["1:1", "one-to-one", "room visit", "bedside"] }
  ] as const;

  const inferred = buckets
    .map((bucket) => {
      const hits = bucket.keywords.reduce((count, keyword) => (textBlocks.includes(keyword) ? count + 1 : count), 0);
      return {
        label: bucket.label,
        count: hits
      };
    })
    .filter((entry) => entry.count > 0);

  if (inferred.length > 0) {
    return inferred.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  const fallbacks = splitList(row.preferences)
    .slice(0, 4)
    .map((label) => ({ label, count: 1 }));
  return fallbacks.length > 0 ? fallbacks : [{ label: "General Activities", count: 1 }];
}

function maybeParseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isArchivedStatus(status: ResidentStatus) {
  return ARCHIVED_STATUSES.includes(status);
}

function isNewAdmission(admissionDate: string | null) {
  const parsed = maybeParseDate(admissionDate);
  if (!parsed) return false;
  const diffMs = Date.now() - parsed.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 45;
}

function boolIncludes(values: string[], keyword: string) {
  const lowerKeyword = keyword.toLowerCase();
  return values.some((entry) => entry.toLowerCase().includes(lowerKeyword));
}

function parseArchiveMeta(notes: string | null) {
  const parsed = parseStructuredText(notes);
  const archiveDate = parsed[FORM_LINE_KEYS.archiveDate] ?? null;
  const archiveReason = parsed[FORM_LINE_KEYS.archiveReason] ?? null;
  return {
    dischargeDate: archiveDate,
    dischargeReason: archiveReason
  };
}

export function fromResidentRow(row: ResidentListRow): ResidentSnapshot {
  const parsedPreferences = parseStructuredText(row.preferences);
  const parsedNotes = parseStructuredText(row.notes);
  const parsedSafety = parseStructuredText(row.safetyNotes);

  const tags = uniqueList(row.tags);
  const interests = uniqueList(
    splitList(parsedPreferences[FORM_LINE_KEYS.interests] ?? row.preferences).concat(tags.slice(0, 4))
  );
  const dislikes = uniqueList(splitList(parsedPreferences[FORM_LINE_KEYS.dislikes]));
  const favoriteActivities = uniqueList(splitList(parsedPreferences[FORM_LINE_KEYS.favoriteActivities]));
  const favoriteTopics = uniqueList(splitList(parsedPreferences[FORM_LINE_KEYS.favoriteTopics]));
  const favoriteMusic = uniqueList(splitList(parsedPreferences[FORM_LINE_KEYS.favoriteMusic]));
  const favoriteMedia = uniqueList(splitList(parsedPreferences[FORM_LINE_KEYS.favoriteMedia]));
  const independentActivities = uniqueList(splitList(parsedPreferences[FORM_LINE_KEYS.independentActivities]));

  const supportNeedsFromSafety = uniqueList(splitList(parsedSafety[FORM_LINE_KEYS.supportNeeds] ?? row.safetyNotes));
  const supportNeeds = uniqueList(supportNeedsFromSafety.concat(inferSupportNeeds(tags, row.safetyNotes))).filter(
    (entry): entry is ResidentSupportNeed => SUPPORT_NEED_OPTIONS.includes(entry as ResidentSupportNeed)
  );

  const lastNoteDate = row.recentNotes[0]?.createdAt ?? null;
  const lastActivity = row.recentNotes[0]?.narrative ?? null;
  const lastOneToOne = row.lastOneOnOneAt
    ? row.recentNotes.find((note) => /1:?1|one[-\s]?to[-\s]?one|room visit/i.test(note.narrative))?.narrative ?? null
    : null;

  const lastEngagementCandidates = [row.lastOneOnOneAt, lastNoteDate]
    .map((value) => maybeParseDate(value))
    .filter((value): value is Date => Boolean(value));

  const lastEngagementDate =
    lastEngagementCandidates.length > 0
      ? new Date(Math.max(...lastEngagementCandidates.map((value) => value.getTime()))).toISOString()
      : null;

  const archiveMeta = parseArchiveMeta(row.notes);

  const snapshot: ResidentSnapshot = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    preferredName: row.preferredName,
    room: row.room,
    status: row.status,
    admissionDate: row.admissionDate,
    birthDate: row.birthDate,
    tags,
    interests,
    dislikes,
    favoriteActivities,
    favoriteTopics,
    favoriteMusic,
    favoriteMedia,
    independentActivities,
    participationStyle:
      parsedNotes[FORM_LINE_KEYS.participationStyle] ||
      (deriveParticipationLevel(row.attendanceSnapshot.participationPercent30d) === "high"
        ? "Joins groups well and responds positively with social options"
        : deriveParticipationLevel(row.attendanceSnapshot.participationPercent30d) === "low"
          ? "Benefits from encouragement and shorter, lower-pressure options"
          : "Watches first, then engages with clear cues"),
    bestTimeOfDay: row.bestTimesOfDay || "Afternoons",
    groupParticipationNotes: parsedNotes[FORM_LINE_KEYS.groupParticipationNotes] || "",
    oneToOneStyle: parsedNotes[FORM_LINE_KEYS.oneToOneStyle] || "",
    commonRefusals: parsedNotes[FORM_LINE_KEYS.commonRefusals] || "",
    whatWorks: parsedNotes[FORM_LINE_KEYS.whatWorks] || "",
    whatDoesNotWork: parsedNotes[FORM_LINE_KEYS.whatDoesNotWork] || "",
    supportNeeds,
    quickSummary: "",
    sourceNotes: row.notes,
    sourcePreferences: row.preferences,
    sourceSafetyNotes: row.safetyNotes,
    lastEngagementDate,
    lastActivity,
    lastOneToOne,
    lastNoteDate,
    lastAiSuggestion: parsedNotes[FORM_LINE_KEYS.lastAiSuggestion] || null,
    lastSuccessfulActivityType: parsedNotes["Last Successful Activity Type"] || null,
    followUpRequired: row.followUpFlag,
    followUpDate: parsedNotes["Follow-Up Date"] || null,
    followUpPriority:
      (parsedNotes["Follow-Up Priority"]?.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | undefined) ?? null,
    dischargeDate: archiveMeta.dischargeDate,
    dischargeReason: archiveMeta.dischargeReason,
    totalActivitiesOffered: row.attendanceSnapshot.total30d,
    totalActivitiesAttended: row.attendanceSnapshot.engaged30d,
    participationPercentage: row.attendanceSnapshot.participationPercent30d,
    attendanceCount: row.attendanceSnapshot.engaged30d,
    oneToOneCount: row.recentNotes.filter((note) => {
      const createdAt = maybeParseDate(note.createdAt);
      if (!createdAt) return false;
      const days = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length,
    refusalCount: row.attendanceSnapshot.refused30d,
    missedActivitiesCount: row.attendanceSnapshot.noShow30d,
    totalTrackedOpportunitiesThisMonth: row.attendanceSnapshot.total30d,
    attendedCountThisMonth: row.attendanceSnapshot.engaged30d,
    oneToOneCompletedCountThisMonth: 0,
    refusalCountThisMonth: row.attendanceSnapshot.refused30d,
    missedCountThisMonth: row.attendanceSnapshot.noShow30d,
    noAttendanceLoggedThisMonth: row.attendanceSnapshot.total30d === 0,
    mostlyOneToOneParticipation: false,
    lastAttendanceDate: row.lastOneOnOneAt ?? row.recentNotes[0]?.createdAt ?? null,
    last30DayParticipation: row.attendanceSnapshot.participationPercent30d,
    last90DayParticipation: row.attendanceSnapshot.participationPercent30d,
    yearToDateParticipation: row.attendanceSnapshot.participationPercent30d,
    attendanceByActivityType: toFallbackAttendanceByActivityType(row),
    lastParticipationTrend: inferAttendanceTrend({
      participation30d: row.attendanceSnapshot.participationPercent30d,
      refusals: row.attendanceSnapshot.refused30d,
      noShows: row.attendanceSnapshot.noShow30d,
      oneToOneCount: row.recentNotes.length
    })
  };

  snapshot.quickSummary = toSummary(snapshot);
  return snapshot;
}

export function toSnapshotCollection(rows: ResidentListRow[]) {
  return rows.map(fromResidentRow);
}

function listToLine(label: string, value: string) {
  const normalized = uniqueList(splitList(value));
  return normalized.length ? `${label}: ${normalized.join(", ")}` : null;
}

function plainToLine(label: string, value: string) {
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
}

export function toDefaultFormValue(): ResidentSnapshotFormValue {
  return {
    fullName: "",
    preferredName: "",
    room: "",
    admissionDate: "",
    status: "ACTIVE",
    birthDate: "",
    interests: "",
    dislikes: "",
    favoriteActivities: "",
    favoriteTopics: "",
    favoriteMusic: "",
    favoriteMedia: "",
    independentActivities: "",
    participationStyle: "",
    bestTimeOfDay: "",
    groupParticipationNotes: "",
    oneToOneStyle: "",
    commonRefusals: "",
    whatWorks: "",
    whatDoesNotWork: "",
    engagementNotes: "",
    conversationStarters: "",
    thingsToAvoid: "",
    supportNeeds: [],
    quickTags: ""
  };
}

export function toFormValue(snapshot: ResidentSnapshot): ResidentSnapshotFormValue {
  return {
    fullName: snapshot.fullName,
    preferredName: snapshot.preferredName ?? "",
    room: snapshot.room,
    admissionDate: snapshot.admissionDate ? snapshot.admissionDate.slice(0, 10) : "",
    status: snapshot.status === "DISCHARGED" ? "DISCHARGED" : "ACTIVE",
    birthDate: snapshot.birthDate ? snapshot.birthDate.slice(0, 10) : "",
    interests: snapshot.interests.join(", "),
    dislikes: snapshot.dislikes.join(", "),
    favoriteActivities: snapshot.favoriteActivities.join(", "),
    favoriteTopics: snapshot.favoriteTopics.join(", "),
    favoriteMusic: snapshot.favoriteMusic.join(", "),
    favoriteMedia: snapshot.favoriteMedia.join(", "),
    independentActivities: snapshot.independentActivities.join(", "),
    participationStyle: snapshot.participationStyle,
    bestTimeOfDay: snapshot.bestTimeOfDay,
    groupParticipationNotes: snapshot.groupParticipationNotes,
    oneToOneStyle: snapshot.oneToOneStyle,
    commonRefusals: snapshot.commonRefusals,
    whatWorks: snapshot.whatWorks,
    whatDoesNotWork: snapshot.whatDoesNotWork,
    engagementNotes: parseStructuredText(snapshot.sourceNotes)[FORM_LINE_KEYS.engagementNotes] ?? "",
    conversationStarters: parseStructuredText(snapshot.sourceNotes)[FORM_LINE_KEYS.conversationStarters] ?? "",
    thingsToAvoid: parseStructuredText(snapshot.sourceNotes)[FORM_LINE_KEYS.thingsToAvoid] ?? "",
    supportNeeds: snapshot.supportNeeds,
    quickTags: snapshot.tags.join(", ")
  };
}

export function toDraftPayload(value: ResidentSnapshotFormValue): ResidentDraftPayload {
  const parsedName = parseName(value.fullName);
  const quickTags = uniqueList(splitList(value.quickTags));
  const interests = uniqueList(splitList(value.interests));
  const likesTags = interests.slice(0, 4);

  const tags = uniqueList(quickTags.concat(likesTags).concat(value.supportNeeds).concat(value.status === "PENDING" ? ["New Admission"] : []));

  const preferencesLines = [
    listToLine(FORM_LINE_KEYS.interests, value.interests),
    listToLine(FORM_LINE_KEYS.dislikes, value.dislikes),
    listToLine(FORM_LINE_KEYS.favoriteActivities, value.favoriteActivities),
    listToLine(FORM_LINE_KEYS.favoriteTopics, value.favoriteTopics),
    listToLine(FORM_LINE_KEYS.favoriteMusic, value.favoriteMusic),
    listToLine(FORM_LINE_KEYS.favoriteMedia, value.favoriteMedia),
    listToLine(FORM_LINE_KEYS.independentActivities, value.independentActivities)
  ].filter((line): line is string => Boolean(line));

  const notesLines = [
    plainToLine(FORM_LINE_KEYS.participationStyle, value.participationStyle),
    plainToLine(FORM_LINE_KEYS.groupParticipationNotes, value.groupParticipationNotes),
    plainToLine(FORM_LINE_KEYS.oneToOneStyle, value.oneToOneStyle),
    plainToLine(FORM_LINE_KEYS.commonRefusals, value.commonRefusals),
    plainToLine(FORM_LINE_KEYS.whatWorks, value.whatWorks),
    plainToLine(FORM_LINE_KEYS.whatDoesNotWork, value.whatDoesNotWork),
    plainToLine(FORM_LINE_KEYS.engagementNotes, value.engagementNotes),
    plainToLine(FORM_LINE_KEYS.conversationStarters, value.conversationStarters),
    plainToLine(FORM_LINE_KEYS.thingsToAvoid, value.thingsToAvoid)
  ].filter((line): line is string => Boolean(line));

  const supportLines = [
    listToLine(FORM_LINE_KEYS.supportNeeds, value.supportNeeds.join(", ")),
    plainToLine("General Support Notes", value.supportNeeds.length ? "See support need tags" : "")
  ].filter((line): line is string => Boolean(line));

  const status = value.status === "DISCHARGED" ? "DISCHARGED" : "ACTIVE";

  return {
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    preferredName: value.preferredName.trim() || null,
    room: value.room.trim(),
    admissionDate: value.admissionDate.trim() || null,
    birthDate: value.birthDate.trim() || null,
    status,
    preferences: preferencesLines.length ? preferencesLines.join("\n") : null,
    notes: notesLines.length ? notesLines.join("\n") : null,
    safetyNotes: supportLines.length ? supportLines.join("\n") : null,
    bestTimesOfDay: value.bestTimeOfDay.trim() || null,
    tags
  };
}

export function appendArchiveContext(input: {
  existingNotes: string | null;
  date: string;
  reason: string;
  note: string;
}) {
  const lines = (input.existingNotes ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(`${FORM_LINE_KEYS.archiveDate}:`) && !line.startsWith(`${FORM_LINE_KEYS.archiveReason}:`) && !line.startsWith(`${FORM_LINE_KEYS.archiveNote}:`));

  lines.push(`${FORM_LINE_KEYS.archiveDate}: ${input.date}`);
  lines.push(`${FORM_LINE_KEYS.archiveReason}: ${input.reason}`);
  if (input.note.trim()) {
    lines.push(`${FORM_LINE_KEYS.archiveNote}: ${input.note.trim()}`);
  }

  return lines.join("\n");
}

export function getSnapshotFiltersForView(view: "ACTIVE" | "ARCHIVED") {
  return SNAPSHOT_FILTER_KEYS.filter((key) =>
    view === "ARCHIVED"
      ? key === "DISCHARGED_ARCHIVED" || key === "ARCHIVED"
      : key !== "DISCHARGED_ARCHIVED" && key !== "ARCHIVED"
  );
}

export const SNAPSHOT_FILTER_KEYS = [
  "ACTIVE",
  "ARCHIVED",
  "NEW_ADMISSIONS",
  "DISCHARGED_ARCHIVED",
  "NEEDS_FOLLOW_UP",
  "BED_BOUND",
  "PREFERS_1TO1",
  "GROUP_FRIENDLY",
  "NEEDS_ENCOURAGEMENT",
  "QUIET_LOW_STIM",
  "HIGH_PARTICIPATION",
  "LOW_PARTICIPATION",
  "SMALL_GROUP",
  "MORNING",
  "AFTERNOON",
  "LOW_ENERGY",
  "SENSORY_FRIENDLY",
  "SOCIAL",
  "QUIET_RESERVED",
  "FAMILY_ORIENTED",
  "MUSIC",
  "BINGO",
  "GAMES",
  "CRAFTS",
  "SPORTS",
  "BIBLE_STUDY",
  "NAIL_CARE",
  "MOVIES_TV",
  "WORD_SEARCHES",
  "PUZZLES",
  "ATTENDANCE_BELOW_GOAL",
  "ATTENDANCE_IMPROVING",
  "MISSED_RECENT_GROUP",
  "ONE_TO_ONE_PRIORITY",
  "FREQUENT_REFUSAL",
  "INCONSISTENT_PARTICIPATION",
  "PARTICIPATION_BELOW_25",
  "PARTICIPATION_BELOW_50",
  "MOSTLY_1TO1_PARTICIPATION",
  "NO_ATTENDANCE_THIS_MONTH"
] as const satisfies SnapshotFilterKey[];

export function residentMatchesFilter(resident: ResidentSnapshot, filter: SnapshotFilterKey) {
  const searchableValues = resident.tags
    .concat(resident.interests)
    .concat(resident.favoriteActivities)
    .concat(resident.favoriteTopics)
    .concat(resident.supportNeeds);

  switch (filter) {
    case "ACTIVE":
      return !isArchivedStatus(resident.status);
    case "ARCHIVED":
      return isArchivedStatus(resident.status);
    case "NEW_ADMISSIONS":
      return isNewAdmission(resident.admissionDate);
    case "DISCHARGED_ARCHIVED":
      return isArchivedStatus(resident.status);
    case "NEEDS_FOLLOW_UP":
      return resident.followUpRequired;
    case "BED_BOUND":
      return boolIncludes(searchableValues, "bed") || resident.status === "BED_BOUND";
    case "PREFERS_1TO1":
      return boolIncludes(searchableValues, "1:1") || boolIncludes(searchableValues, "one-to-one");
    case "GROUP_FRIENDLY":
      return boolIncludes(searchableValues, "group") || boolIncludes([resident.participationStyle], "group");
    case "NEEDS_ENCOURAGEMENT":
      return boolIncludes(searchableValues.concat([resident.participationStyle, resident.whatWorks]), "encouragement");
    case "QUIET_LOW_STIM":
      return boolIncludes(searchableValues, "quiet") || boolIncludes(searchableValues, "low");
    case "HIGH_PARTICIPATION":
      return boolIncludes([resident.participationStyle], "joins") || boolIncludes(searchableValues, "high participation");
    case "LOW_PARTICIPATION":
      return boolIncludes([resident.participationStyle], "encouragement") || boolIncludes(searchableValues, "low participation");
    case "SMALL_GROUP":
      return boolIncludes(searchableValues.concat([resident.groupParticipationNotes, resident.participationStyle]), "small group");
    case "MORNING":
      return normalize(resident.bestTimeOfDay).includes("morning") || boolIncludes(searchableValues, "morning");
    case "AFTERNOON":
      return normalize(resident.bestTimeOfDay).includes("afternoon") || boolIncludes(searchableValues, "afternoon");
    case "LOW_ENERGY":
      return boolIncludes(searchableValues.concat([resident.participationStyle]), "low energy");
    case "SENSORY_FRIENDLY":
      return boolIncludes(searchableValues.concat([resident.whatWorks]), "sensory");
    case "SOCIAL":
      return boolIncludes(searchableValues.concat([resident.participationStyle]), "social");
    case "QUIET_RESERVED":
      return boolIncludes(searchableValues.concat([resident.participationStyle]), "quiet") || boolIncludes([resident.participationStyle], "observer");
    case "FAMILY_ORIENTED":
      return boolIncludes(searchableValues, "family");
    case "MUSIC":
      return boolIncludes(searchableValues, "music") || boolIncludes(searchableValues, "choir");
    case "BINGO":
      return boolIncludes(searchableValues, "bingo");
    case "GAMES":
      return boolIncludes(searchableValues, "game") || boolIncludes(searchableValues, "puzzle") || boolIncludes(searchableValues, "bingo");
    case "CRAFTS":
      return boolIncludes(searchableValues, "craft");
    case "SPORTS":
      return boolIncludes(searchableValues, "sport") || boolIncludes(searchableValues, "baseball");
    case "BIBLE_STUDY":
      return boolIncludes(searchableValues, "bible") || boolIncludes(searchableValues, "devotion");
    case "NAIL_CARE":
      return boolIncludes(searchableValues, "nail");
    case "MOVIES_TV":
      return boolIncludes(searchableValues, "movie") || boolIncludes(searchableValues, "tv");
    case "WORD_SEARCHES":
      return boolIncludes(searchableValues, "word search");
    case "PUZZLES":
      return boolIncludes(searchableValues, "puzzle") || boolIncludes(searchableValues, "crossword");
    case "ATTENDANCE_BELOW_GOAL":
      return (resident.participationPercentage ?? resident.last30DayParticipation ?? 0) < 50;
    case "ATTENDANCE_IMPROVING":
      return resident.lastParticipationTrend === "up";
    case "MISSED_RECENT_GROUP":
      return (resident.missedCountThisMonth ?? resident.missedActivitiesCount ?? 0) >= 2;
    case "ONE_TO_ONE_PRIORITY":
      return (
        (resident.oneToOneCompletedCountThisMonth ?? resident.oneToOneCount ?? 0) >= 2 ||
        boolIncludes(searchableValues, "1:1") ||
        boolIncludes(searchableValues, "bed")
      );
    case "FREQUENT_REFUSAL":
      return (resident.refusalCountThisMonth ?? resident.refusalCount ?? 0) >= 2 || boolIncludes([resident.commonRefusals], "decline");
    case "INCONSISTENT_PARTICIPATION":
      return (resident.participationPercentage ?? resident.last30DayParticipation ?? 0) >= 35 &&
        (resident.participationPercentage ?? resident.last30DayParticipation ?? 0) <= 65;
    case "PARTICIPATION_BELOW_25":
      return (resident.participationPercentage ?? resident.last30DayParticipation ?? 0) < 25;
    case "PARTICIPATION_BELOW_50":
      return (resident.participationPercentage ?? resident.last30DayParticipation ?? 0) < 50;
    case "MOSTLY_1TO1_PARTICIPATION":
      return (
        resident.mostlyOneToOneParticipation === true ||
        (resident.oneToOneCompletedCountThisMonth ?? resident.oneToOneCount ?? 0) >
          (resident.attendedCountThisMonth ?? resident.attendanceCount ?? 0)
      );
    case "NO_ATTENDANCE_THIS_MONTH":
      return (
        resident.noAttendanceLoggedThisMonth === true ||
        (resident.totalTrackedOpportunitiesThisMonth ?? resident.totalActivitiesOffered ?? 0) <= 0
      );
    default:
      return true;
  }
}

export function residentMatchesSearch(resident: ResidentSnapshot, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const tokens = [
    resident.fullName,
    resident.preferredName ?? "",
    resident.room,
    resident.interests.join(" "),
    resident.favoriteActivities.join(" "),
    resident.favoriteTopics.join(" "),
    resident.tags.join(" "),
    resident.participationStyle,
    resident.whatWorks,
    resident.whatDoesNotWork,
    resident.commonRefusals
  ]
    .join(" ")
    .toLowerCase();

  return tokens.includes(normalizedSearch);
}

export function buildAssistantPrompt(action: SnapshotIntentAction, resident: ResidentSnapshot) {
  const context = [
    `Resident: ${resident.fullName}`,
    `Preferred Name: ${resident.preferredName ?? "Not provided"}`,
    `Room: ${resident.room}`,
    `Participation Style: ${resident.participationStyle || "Not provided"}`,
    `Interests: ${resident.interests.join(", ") || "Not provided"}`,
    `Dislikes: ${resident.dislikes.join(", ") || "Not provided"}`,
    `Best Time: ${resident.bestTimeOfDay || "Not provided"}`,
    `Support Needs: ${resident.supportNeeds.join(", ") || "Not provided"}`,
    `What Works: ${resident.whatWorks || "Not provided"}`,
    `Common Refusals: ${resident.commonRefusals || "Not provided"}`,
    `Participation (30d): ${resident.last30DayParticipation ?? resident.participationPercentage ?? "Not enough data"}`,
    `Attendance count (30d): ${resident.attendanceCount ?? resident.totalActivitiesAttended ?? 0}`,
    `Recent 1:1 visits: ${resident.oneToOneCount ?? 0}`,
    `Refusals (30d): ${resident.refusalCount ?? 0}`,
    `Missed activities (30d): ${resident.missedActivitiesCount ?? 0}`
  ];

  return `${action.prompt}.\n\nResident context:\n${context.join("\n")}`;
}

export function calculateParticipationRate(attended: number, offered: number) {
  if (!Number.isFinite(attended) || !Number.isFinite(offered) || offered <= 0) return null;
  return clampPercent((attended / offered) * 100);
}

export function getSnapshotActions() {
  return AI_ACTIONS;
}
