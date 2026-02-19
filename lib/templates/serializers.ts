import type { ActivityTemplate, ProgressNoteTemplate } from "@prisma/client";

import { parseNoteTemplateMeta } from "@/lib/templates/note-template-meta";
import type { ActivityTemplatePayload, NoteTemplatePayload, UnifiedTemplate } from "@/lib/templates/types";

function toTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function splitMultiline(value: string) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLineOrComma(value: string) {
  if (!value) return [];
  return value
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toDifficulty(value: string): ActivityTemplatePayload["difficulty"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
}

export function toUnifiedActivityTemplate(template: ActivityTemplate, usageCount: number): UnifiedTemplate {
  const checklistRaw = Array.isArray(template.defaultChecklist)
    ? template.defaultChecklist
    : [];

  const adaptationsRaw =
    template.adaptations && typeof template.adaptations === "object" && !Array.isArray(template.adaptations)
      ? (template.adaptations as Record<string, unknown>)
      : {};

  const payload: ActivityTemplatePayload = {
    difficulty: toDifficulty(template.difficulty),
    supplies: splitLineOrComma(template.supplies),
    setupSteps: splitMultiline(template.setupSteps),
    checklistItems: checklistRaw.map((item) => String(item)).map((item) => item.trim()).filter(Boolean),
    adaptations: {
      bedBound: asString(adaptationsRaw.bedBound),
      dementia: asString(adaptationsRaw.dementiaFriendly),
      lowVision: asString(adaptationsRaw.lowVisionHearing),
      oneToOne: asString(adaptationsRaw.oneToOneMini)
    }
  };

  const tags = [template.category, payload.difficulty, payload.checklistItems.length > 0 ? "Checklist" : ""]
    .map((value) => value.trim())
    .filter(Boolean)
    .map(toTag);

  return {
    id: template.id,
    type: "activity",
    title: template.title,
    category: template.category,
    tags,
    status: "active",
    isFavorite: false,
    usageCount,
    updatedAt: template.createdAt.toISOString(),
    payload
  };
}

export function toUnifiedNoteTemplate(template: ProgressNoteTemplate): UnifiedTemplate {
  const metadata = parseNoteTemplateMeta(template.bodyTemplate ?? "");
  const quickPhrases = Array.isArray(template.quickPhrases)
    ? template.quickPhrases.map((phrase) => String(phrase).trim()).filter(Boolean)
    : [];

  const payload: NoteTemplatePayload = {
    fieldsEnabled: metadata.payload.fieldsEnabled,
    defaultTextBlocks: {
      opening: metadata.payload.defaultTextBlocks.opening,
      body: metadata.payload.defaultTextBlocks.body,
      followUp: metadata.payload.defaultTextBlocks.followUp
    },
    quickPhrases
  };

  const tagSet = new Set<string>();
  for (const tag of metadata.tags) {
    tagSet.add(toTag(tag));
  }
  if (tagSet.size === 0) {
    tagSet.add("progress-note");
  }

  return {
    id: template.id,
    type: "note",
    title: template.title,
    category: metadata.category ?? "Progress Note",
    tags: Array.from(tagSet),
    status: "active",
    isFavorite: false,
    usageCount: 0,
    updatedAt: template.createdAt.toISOString(),
    payload
  };
}

