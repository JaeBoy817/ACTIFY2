import type { ResidentStatus } from "@prisma/client";

export const RESIDENT_SORT_OPTIONS = [
  { value: "ROOM", label: "Room" },
  { value: "NAME", label: "Name" },
  { value: "NEEDS_1TO1", label: "Needs 1:1" },
  { value: "RECENTLY_SEEN", label: "Recently Seen" }
] as const;

export type ResidentSortKey = (typeof RESIDENT_SORT_OPTIONS)[number]["value"];

export const RESIDENT_FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "BED_BOUND", label: "Bed Bound" },
  { value: "HOSPITAL", label: "Hospital" }
] as const;

export type ResidentFilterKey = (typeof RESIDENT_FILTER_OPTIONS)[number]["value"];

export type ResidentTagIconKey = "BED_BOUND" | "NON_VERBAL" | "TRACH";

export type ResidentListRow = {
  id: string;
  firstName: string;
  lastName: string;
  room: string;
  status: ResidentStatus;
  birthDate: string | null;
  preferences: string | null;
  safetyNotes: string | null;
  tags: string[];
  lastOneOnOneAt: string | null;
  followUpFlag: boolean;
  carePlanAreas: string[];
  carePlanNextReviewAt: string | null;
  recentNotes: Array<{
    id: string;
    createdAt: string;
    narrative: string;
  }>;
};

export type ResidentUpsertPayload = {
  firstName: string;
  lastName: string;
  room: string;
  status: "ACTIVE" | "BED_BOUND" | "HOSPITALIZED" | "DISCHARGED";
  birthDate?: string | null;
  preferences?: string | null;
  safetyNotes?: string | null;
  tags?: string[];
  followUpFlag?: boolean;
};

export function toResidentStatusLabel(status: ResidentStatus) {
  if (status === "HOSPITALIZED") return "Hospital";
  if (status === "BED_BOUND") return "Bed Bound";
  if (status === "ON_LEAVE") return "On Leave";
  if (status === "TRANSFERRED") return "Transferred";
  if (status === "DECEASED") return "Deceased";
  if (status === "DISCHARGED") return "Discharged";
  if (status === "OTHER") return "Other";
  return "Active";
}

export function parseResidentTags(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function serializeResidentTags(tags: string[]) {
  return tags
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(", ");
}

export function normalizeResidentStatusForImport(statusInput: string) {
  const normalized = statusInput.trim().toUpperCase();
  if (normalized === "ACTIVE") return "ACTIVE" as const;
  if (normalized === "BED BOUND" || normalized === "BED_BOUND") return "BED_BOUND" as const;
  if (normalized === "HOSPITAL" || normalized === "HOSPITALIZED") return "HOSPITALIZED" as const;
  if (normalized === "DISCHARGED") return "DISCHARGED" as const;
  return null;
}

export function getResidentTagIconKeys(tags: string[]): ResidentTagIconKey[] {
  const normalized = tags.map((tag) => tag.trim().toLowerCase());
  const keys: ResidentTagIconKey[] = [];
  if (normalized.some((tag) => tag.includes("bed") && tag.includes("bound"))) {
    keys.push("BED_BOUND");
  }
  if (normalized.some((tag) => tag.includes("non") && tag.includes("verbal"))) {
    keys.push("NON_VERBAL");
  }
  if (normalized.some((tag) => tag.includes("trach"))) {
    keys.push("TRACH");
  }
  return keys;
}

export function isResidentActiveForMainList(status: ResidentStatus) {
  return status !== "DISCHARGED";
}

export function isNeedsOneOnOne(lastOneOnOneAt: string | null, today = new Date(), thresholdDays = 7) {
  if (!lastOneOnOneAt) return true;
  const last = new Date(lastOneOnOneAt);
  if (Number.isNaN(last.getTime())) return true;
  const diffMs = today.getTime() - last.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days >= thresholdDays;
}

export function daysSince(lastOneOnOneAt: string | null, today = new Date()) {
  if (!lastOneOnOneAt) return null;
  const last = new Date(lastOneOnOneAt);
  if (Number.isNaN(last.getTime())) return null;
  const diffMs = today.getTime() - last.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function parseFocusAreas(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry)).filter(Boolean);
}

export function formatResidentBirthDate(birthDate: string | null) {
  if (!birthDate) return "Not set";
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString();
}

export function getResidentAge(birthDate: string | null, today = new Date()) {
  if (!birthDate) return null;
  const parsedBirthDate = new Date(birthDate);
  if (Number.isNaN(parsedBirthDate.getTime())) return null;

  let age = today.getUTCFullYear() - parsedBirthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - parsedBirthDate.getUTCMonth();
  const dayDelta = today.getUTCDate() - parsedBirthDate.getUTCDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}
