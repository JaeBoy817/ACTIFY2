import type { NoteTemplatePayload } from "@/lib/templates/types";

const NOTE_META_PREFIX = "[[ACTIFY_NOTE_META]]";

const NOTE_FIELDS_DEFAULTS: NoteTemplatePayload["fieldsEnabled"] = {
  mood: true,
  cues: true,
  participation: true,
  response: true,
  followUp: true
};

type StoredNoteTemplateMeta = {
  category?: string;
  tags?: string[];
  fieldsEnabled?: Partial<NoteTemplatePayload["fieldsEnabled"]>;
  defaultTextBlocks?: NoteTemplatePayload["defaultTextBlocks"];
};

export function parseNoteTemplateMeta(rawBodyTemplate: string) {
  const value = rawBodyTemplate ?? "";
  const lines = value.split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";

  let metadata: StoredNoteTemplateMeta | null = null;
  let bodyTemplate = value;

  if (firstLine.startsWith(NOTE_META_PREFIX)) {
    const encoded = firstLine.slice(NOTE_META_PREFIX.length).trim();
    try {
      metadata = JSON.parse(encoded) as StoredNoteTemplateMeta;
      bodyTemplate = lines.slice(1).join("\n").trimStart();
    } catch {
      metadata = null;
      bodyTemplate = value;
    }
  }

  const blocks = metadata?.defaultTextBlocks ?? {};
  const normalized: NoteTemplatePayload = {
    fieldsEnabled: {
      ...NOTE_FIELDS_DEFAULTS,
      ...(metadata?.fieldsEnabled ?? {})
    },
    defaultTextBlocks: {
      opening: blocks.opening?.trim() || undefined,
      body: (blocks.body?.trim() || bodyTemplate.trim()) || undefined,
      followUp: blocks.followUp?.trim() || undefined
    },
    quickPhrases: []
  };

  return {
    bodyTemplate,
    category: metadata?.category?.trim() || undefined,
    tags: Array.isArray(metadata?.tags) ? metadata?.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [],
    payload: normalized
  };
}

export function serializeNoteTemplateMeta(params: {
  body: string;
  category?: string;
  tags?: string[];
  fieldsEnabled?: Partial<NoteTemplatePayload["fieldsEnabled"]>;
  defaultTextBlocks?: NoteTemplatePayload["defaultTextBlocks"];
}) {
  const body = params.body.trim();
  const metadata: StoredNoteTemplateMeta = {
    category: params.category?.trim() || undefined,
    tags: (params.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    fieldsEnabled: params.fieldsEnabled ?? NOTE_FIELDS_DEFAULTS,
    defaultTextBlocks: {
      opening: params.defaultTextBlocks?.opening?.trim() || undefined,
      body: params.defaultTextBlocks?.body?.trim() || undefined,
      followUp: params.defaultTextBlocks?.followUp?.trim() || undefined
    }
  };

  return `${NOTE_META_PREFIX} ${JSON.stringify(metadata)}\n${body}`;
}

export function stripNoteTemplateMeta(rawBodyTemplate: string) {
  return parseNoteTemplateMeta(rawBodyTemplate).bodyTemplate;
}

