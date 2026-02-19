import type { CuesRequired, MoodAffect, ParticipationLevel, ProgressNoteType, ResponseType } from "@prisma/client";

import type { NoteBuilderPayload, NoteTemplateUpsertPayload } from "@/lib/notes/schema";
import type { NoteBuilderType, NotesListRow, ParsedProgressNote } from "@/lib/notes/types";
import { parseNoteTemplateMeta, serializeNoteTemplateMeta } from "@/lib/templates/note-template-meta";

const TITLE_PREFIX = "Title:";
const LOCATION_PREFIX = "Location:";
const TOPIC_PREFIX = "Topic:";
const SETTING_PREFIX = "Setting:";
const TAGS_PREFIX = "Tags:";
const INTERVENTIONS_PREFIX = "Interventions:";
const FOLLOW_UP_NEEDED_PREFIX = "Follow-up Needed:";
const LINKED_RESIDENTS_PREFIX = "Linked Residents:";
const COMMUNICATION_PREFIX = "Communication:";
const MOBILITY_PREFIX = "Mobility/Access:";
const GOAL_LINK_PREFIX = "Goal Link:";
const STAFF_PRESENT_PREFIX = "Staff Present:";

export function toDbParticipation(value: NoteBuilderPayload["participationLevel"]): ParticipationLevel {
  if (value === "high") return "HIGH";
  if (value === "moderate") return "MODERATE";
  return "MINIMAL";
}

export function fromDbParticipation(value: ParticipationLevel): NoteBuilderPayload["participationLevel"] {
  if (value === "HIGH") return "high";
  if (value === "MODERATE") return "moderate";
  return "low";
}

export function toDbMood(value: NoteBuilderPayload["mood"]): MoodAffect {
  if (value === "bright") return "BRIGHT";
  if (value === "flat") return "FLAT";
  if (value === "anxious") return "ANXIOUS";
  if (value === "agitated") return "AGITATED";
  return "CALM";
}

export function fromDbMood(value: MoodAffect): NoteBuilderPayload["mood"] {
  if (value === "BRIGHT") return "bright";
  if (value === "FLAT") return "flat";
  if (value === "ANXIOUS") return "anxious";
  if (value === "AGITATED") return "agitated";
  return "calm";
}

export function toDbCues(value: NoteBuilderPayload["cues"]): CuesRequired {
  if (value === "verbal") return "VERBAL";
  if (value === "visual") return "VISUAL";
  if (value === "hand_on_hand" || value === "physical_assist") return "HAND_OVER_HAND";
  return "NONE";
}

export function fromDbCues(value: CuesRequired): NoteBuilderPayload["cues"] {
  if (value === "VERBAL") return "verbal";
  if (value === "VISUAL") return "visual";
  if (value === "HAND_OVER_HAND") return "hand_on_hand";
  return "none";
}

export function toDbResponse(value: NoteBuilderPayload["responseType"]): ResponseType {
  if (value === "neutral") return "NEUTRAL";
  if (value === "resistant") return "RESISTANT";
  return "POSITIVE";
}

export function fromDbResponse(value: ResponseType): NoteBuilderPayload["responseType"] {
  if (value === "NEUTRAL") return "neutral";
  if (value === "RESISTANT") return "resistant";
  return "positive";
}

export function toDbType(type: NoteBuilderType): ProgressNoteType {
  return type === "1on1" ? "ONE_TO_ONE" : "GROUP";
}

export function fromDbType(type: ProgressNoteType): NoteBuilderType {
  return type === "ONE_TO_ONE" ? "1on1" : "general";
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
}

export function normalizeTags(tags: string[]) {
  const cleaned = tags
    .map(normalizeTag)
    .filter(Boolean)
    .slice(0, 20);

  return Array.from(new Set(cleaned));
}

function appendHeaderLine(lines: string[], prefix: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  lines.push(`${prefix} ${trimmed}`);
}

export function serializeNarrative(payload: NoteBuilderPayload) {
  const headerLines: string[] = [];
  appendHeaderLine(headerLines, TITLE_PREFIX, payload.title);
  if (payload.noteType === "general") {
    appendHeaderLine(headerLines, LOCATION_PREFIX, payload.location);
  } else {
    appendHeaderLine(headerLines, SETTING_PREFIX, payload.setting || payload.location);
  }
  appendHeaderLine(headerLines, TOPIC_PREFIX, payload.activityLabel);

  const bodyLines: string[] = [payload.narrative.trim()];
  const tags = normalizeTags(payload.tags);
  if (tags.length > 0) {
    bodyLines.push("", `${TAGS_PREFIX} ${tags.map((tag) => `#${tag}`).join(" ")}`);
  }

  const header = headerLines.length > 0 ? `${headerLines.join("\n")}\n\n` : "";
  return `${header}${bodyLines.join("\n")}`.trim();
}

export function serializeFollowUp(payload: NoteBuilderPayload, linkedResidentNames: string[]) {
  const lines: string[] = [];

  if (payload.followUpNotes.trim()) {
    lines.push(payload.followUpNotes.trim());
  }

  if (payload.interventions.length > 0) {
    lines.push(`${INTERVENTIONS_PREFIX} ${payload.interventions.join(", ")}`);
  }

  if (payload.followUpNeeded) {
    lines.push(`${FOLLOW_UP_NEEDED_PREFIX} Yes`);
  }

  if (linkedResidentNames.length > 0) {
    lines.push(`${LINKED_RESIDENTS_PREFIX} ${linkedResidentNames.join(", ")}`);
  }

  if (payload.communicationMethod.trim()) {
    lines.push(`${COMMUNICATION_PREFIX} ${payload.communicationMethod.trim()}`);
  }

  if (payload.mobilityAccess.trim()) {
    lines.push(`${MOBILITY_PREFIX} ${payload.mobilityAccess.trim()}`);
  }

  if (payload.goalLink.trim()) {
    lines.push(`${GOAL_LINK_PREFIX} ${payload.goalLink.trim()}`);
  }

  if (payload.staffPresent.trim()) {
    lines.push(`${STAFF_PRESENT_PREFIX} ${payload.staffPresent.trim()}`);
  }

  return lines.join("\n").trim() || null;
}

function parseHeaderLine(line: string) {
  const trimmed = line.trim();

  if (trimmed.startsWith(TITLE_PREFIX)) return { key: "title", value: trimmed.slice(TITLE_PREFIX.length).trim() };
  if (trimmed.startsWith(LOCATION_PREFIX)) return { key: "location", value: trimmed.slice(LOCATION_PREFIX.length).trim() };
  if (trimmed.startsWith(SETTING_PREFIX)) return { key: "setting", value: trimmed.slice(SETTING_PREFIX.length).trim() };
  if (trimmed.startsWith(TOPIC_PREFIX)) return { key: "activityLabel", value: trimmed.slice(TOPIC_PREFIX.length).trim() };
  return null;
}

function parseTagsLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith(TAGS_PREFIX)) return [];
  const value = trimmed.slice(TAGS_PREFIX.length).trim();
  return normalizeTags(
    value
      .split(/[\s,]+/)
      .map((token) => token.replace(/^#/, ""))
      .filter(Boolean)
  );
}

function parseTaggedValue(lines: string[], prefix: string) {
  const row = lines.find((line) => line.trim().startsWith(prefix));
  if (!row) return "";
  return row.trim().slice(prefix.length).trim();
}

export function parseProgressNoteContent(narrativeRaw: string, followUpRaw?: string | null): ParsedProgressNote {
  const narrative = (narrativeRaw ?? "").trim();
  const narrativeLines = narrative.split(/\r?\n/);

  const parsed: ParsedProgressNote = {
    title: "",
    location: "",
    setting: "",
    activityLabel: "",
    narrativeBody: narrative,
    tags: [],
    interventions: [],
    followUpNeeded: false,
    followUpNotes: "",
    linkedResidentNames: [],
    communicationMethod: "",
    mobilityAccess: "",
    goalLink: "",
    staffPresent: ""
  };

  let index = 0;
  while (index < narrativeLines.length) {
    const parsedHeader = parseHeaderLine(narrativeLines[index]);
    if (!parsedHeader) break;

    if (parsedHeader.key === "title") parsed.title = parsedHeader.value;
    if (parsedHeader.key === "location") parsed.location = parsedHeader.value;
    if (parsedHeader.key === "setting") parsed.setting = parsedHeader.value;
    if (parsedHeader.key === "activityLabel") parsed.activityLabel = parsedHeader.value;

    index += 1;
  }

  while (index < narrativeLines.length && narrativeLines[index].trim() === "") {
    index += 1;
  }

  const bodyLines = narrativeLines.slice(index);
  if (bodyLines.length > 0) {
    const maybeTags = parseTagsLine(bodyLines[bodyLines.length - 1]);
    if (maybeTags.length > 0) {
      parsed.tags = maybeTags;
      bodyLines.pop();
      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
        bodyLines.pop();
      }
    }
  }

  parsed.narrativeBody = bodyLines.join("\n").trim() || narrative;

  const followLines = (followUpRaw ?? "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  const notesOnly = followLines.filter(
    (line) =>
      !line.trim().startsWith(INTERVENTIONS_PREFIX) &&
      !line.trim().startsWith(FOLLOW_UP_NEEDED_PREFIX) &&
      !line.trim().startsWith(LINKED_RESIDENTS_PREFIX) &&
      !line.trim().startsWith(COMMUNICATION_PREFIX) &&
      !line.trim().startsWith(MOBILITY_PREFIX) &&
      !line.trim().startsWith(GOAL_LINK_PREFIX) &&
      !line.trim().startsWith(STAFF_PRESENT_PREFIX)
  );

  parsed.followUpNotes = notesOnly.join("\n").trim();
  const interventionsValue = parseTaggedValue(followLines, INTERVENTIONS_PREFIX);
  parsed.interventions = interventionsValue
    ? interventionsValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  parsed.followUpNeeded = parseTaggedValue(followLines, FOLLOW_UP_NEEDED_PREFIX).toLowerCase() === "yes";
  const linked = parseTaggedValue(followLines, LINKED_RESIDENTS_PREFIX);
  parsed.linkedResidentNames = linked
    ? linked
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  parsed.communicationMethod = parseTaggedValue(followLines, COMMUNICATION_PREFIX);
  parsed.mobilityAccess = parseTaggedValue(followLines, MOBILITY_PREFIX);
  parsed.goalLink = parseTaggedValue(followLines, GOAL_LINK_PREFIX);
  parsed.staffPresent = parseTaggedValue(followLines, STAFF_PRESENT_PREFIX);

  return parsed;
}

export function toNotesListRow(params: {
  id: string;
  type: ProgressNoteType;
  createdAt: Date;
  residentId: string;
  residentName: string;
  residentRoom: string;
  createdByName: string;
  narrative: string;
  followUp?: string | null;
}): NotesListRow {
  const parsed = parseProgressNoteContent(params.narrative, params.followUp);

  return {
    id: params.id,
    createdAt: params.createdAt.toISOString(),
    noteType: fromDbType(params.type),
    residentId: params.residentId,
    residentName: params.residentName,
    residentRoom: params.residentRoom,
    createdByName: params.createdByName,
    title: parsed.title || parsed.activityLabel || parsed.narrativeBody.slice(0, 72) || "Untitled note",
    tags: parsed.tags,
    status: "Signed",
    narrativeBody: parsed.narrativeBody
  };
}

export function mapTemplateForBuilder(template: {
  id: string;
  title: string;
  quickPhrases: unknown;
  bodyTemplate: string;
}) {
  const parsed = parseNoteTemplateMeta(template.bodyTemplate);

  return {
    id: template.id,
    title: template.title,
    category: parsed.category,
    tags: parsed.tags,
    quickPhrases: Array.isArray(template.quickPhrases)
      ? template.quickPhrases.map(String).map((value) => value.trim()).filter(Boolean)
      : [],
    narrativeStarter: parsed.payload.defaultTextBlocks.body ?? ""
  };
}

export function serializeTemplateForApi(payload: NoteTemplateUpsertPayload) {
  const normalizedTags = normalizeTags(payload.tags);
  const tagsWithType = Array.from(new Set([...normalizedTags, `type:${payload.noteType}`]));

  return {
    type: "note" as const,
    title: payload.title,
    category: payload.category,
    tags: tagsWithType,
    payload: {
      fieldsEnabled: {
        mood: true,
        cues: true,
        participation: true,
        response: true,
        followUp: true
      },
      defaultTextBlocks: {
        body: payload.narrativeStarter || ""
      },
      quickPhrases: payload.quickPhrases
    },
    serializedBody: serializeNoteTemplateMeta({
      body: payload.narrativeStarter || "",
      category: payload.category,
      tags: tagsWithType,
      fieldsEnabled: {
        mood: true,
        cues: true,
        participation: true,
        response: true,
        followUp: true
      },
      defaultTextBlocks: {
        body: payload.narrativeStarter || ""
      }
    })
  };
}
