import type { ProgressNoteType } from "@prisma/client";

import type {
  DocumentationKind,
  DocumentationMeta,
  DocumentationPriority,
  DocumentationStatus
} from "@/lib/documentation/types";

const META_PREFIX = "[[DOC_META]]";

const DEFAULT_PRIORITY: DocumentationPriority = "MEDIUM";

function isDocumentationKind(value: string): value is DocumentationKind {
  return value === "PROGRESS" || value === "ONE_TO_ONE" || value === "UDA" || value === "MDS";
}

function isDocumentationStatus(value: string): value is DocumentationStatus {
  return value === "DRAFT" || value === "IN_PROGRESS" || value === "READY_REVIEW" || value === "COMPLETED";
}

function isDocumentationPriority(value: string): value is DocumentationPriority {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

export function parseDocumentationMeta(narrative: string): DocumentationMeta | null {
  const firstLine = narrative.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine || !firstLine.startsWith(META_PREFIX)) return null;

  const rawJson = firstLine.slice(META_PREFIX.length).trim();
  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson) as Partial<DocumentationMeta> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.kind || !isDocumentationKind(parsed.kind)) {
      return null;
    }

    return {
      kind: parsed.kind,
      status: parsed.status && isDocumentationStatus(parsed.status) ? parsed.status : undefined,
      dueDate: typeof parsed.dueDate === "string" ? parsed.dueDate : null,
      priority: parsed.priority && isDocumentationPriority(parsed.priority) ? parsed.priority : undefined,
      template: typeof parsed.template === "string" ? parsed.template : null,
      sectionProgress: typeof parsed.sectionProgress === "number" ? parsed.sectionProgress : null
    };
  } catch {
    return null;
  }
}

export function stripDocumentationMeta(narrative: string): string {
  const lines = narrative.split(/\r?\n/);
  if (lines.length === 0) return narrative;
  if (lines[0]?.trim().startsWith(META_PREFIX)) {
    return lines.slice(1).join("\n").trim();
  }
  return narrative.trim();
}

export function attachDocumentationMeta(narrativeBody: string, meta: DocumentationMeta): string {
  const body = stripDocumentationMeta(narrativeBody);
  const serialized = `${META_PREFIX} ${JSON.stringify(meta)}`;
  if (!body) return serialized;
  return `${serialized}\n${body}`;
}

export function inferDocumentationKind(params: {
  noteType: ProgressNoteType;
  narrative: string;
}): DocumentationKind {
  const meta = parseDocumentationMeta(params.narrative);
  if (meta?.kind) return meta.kind;
  if (params.noteType === "ONE_TO_ONE") return "ONE_TO_ONE";
  return "PROGRESS";
}

export function inferDocumentationStatus(narrative: string): DocumentationStatus {
  const meta = parseDocumentationMeta(narrative);
  if (meta?.status) return meta.status;
  return "COMPLETED";
}

export function inferDocumentationPriority(narrative: string): DocumentationPriority {
  const meta = parseDocumentationMeta(narrative);
  if (meta?.priority) return meta.priority;
  return DEFAULT_PRIORITY;
}

export function inferDocumentationDueDate(narrative: string): string | null {
  const meta = parseDocumentationMeta(narrative);
  return meta?.dueDate ?? null;
}

