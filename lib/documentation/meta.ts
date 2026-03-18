import type { ProgressNoteType } from "@prisma/client";

import type {
  DocumentationAssessmentType,
  DocumentationKind,
  DocumentationMeta,
  DocumentationPriority,
  DocumentationSectionChangeState,
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

function isDocumentationAssessmentType(value: string): value is DocumentationAssessmentType {
  return value === "ADMISSION" || value === "ANNUAL" || value === "QUARTERLY" || value === "SECTION_F";
}

function isDocumentationSectionChangeState(value: string): value is DocumentationSectionChangeState {
  return value === "NO_CHANGE" || value === "UPDATED" || value === "SIGNIFICANT_CHANGE";
}

function parseSectionStates(value: unknown): Record<string, DocumentationSectionChangeState> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.length === 0) return null;

  const parsed: Record<string, DocumentationSectionChangeState> = {};
  for (const [key, raw] of entries) {
    if (typeof key !== "string" || !key.trim()) continue;
    if (typeof raw !== "string" || !isDocumentationSectionChangeState(raw)) continue;
    parsed[key] = raw;
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
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
      sectionProgress: typeof parsed.sectionProgress === "number" ? parsed.sectionProgress : null,
      assessmentType:
        typeof parsed.assessmentType === "string" && isDocumentationAssessmentType(parsed.assessmentType)
          ? parsed.assessmentType
          : null,
      reviewDate: typeof parsed.reviewDate === "string" ? parsed.reviewDate : null,
      assignedStaff: typeof parsed.assignedStaff === "string" ? parsed.assignedStaff : null,
      noMajorChange: typeof parsed.noMajorChange === "boolean" ? parsed.noMajorChange : null,
      sectionStates: parseSectionStates(parsed.sectionStates),
      carryForwardFromId: typeof parsed.carryForwardFromId === "string" ? parsed.carryForwardFromId : null
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

export function inferDocumentationAssessmentType(narrative: string): DocumentationAssessmentType | null {
  const meta = parseDocumentationMeta(narrative);
  return meta?.assessmentType ?? null;
}

export function inferDocumentationReviewDate(narrative: string): string | null {
  const meta = parseDocumentationMeta(narrative);
  return meta?.reviewDate ?? null;
}

export function inferDocumentationAssignedStaff(narrative: string): string | null {
  const meta = parseDocumentationMeta(narrative);
  return meta?.assignedStaff ?? null;
}

export function inferDocumentationSectionProgress(narrative: string): number | null {
  const meta = parseDocumentationMeta(narrative);
  return typeof meta?.sectionProgress === "number" ? meta.sectionProgress : null;
}

export function inferDocumentationNoMajorChange(narrative: string): boolean | null {
  const meta = parseDocumentationMeta(narrative);
  return typeof meta?.noMajorChange === "boolean" ? meta.noMajorChange : null;
}

export function inferDocumentationSectionStates(
  narrative: string
): Record<string, DocumentationSectionChangeState> | null {
  const meta = parseDocumentationMeta(narrative);
  return meta?.sectionStates ?? null;
}
