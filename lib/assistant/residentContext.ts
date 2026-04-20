import type { ResidentAIContext } from "@/lib/assistant/types";

export const ASSISTANT_RESIDENT_CONTEXT_STORAGE_KEY = "actify-assistant-resident-context-v1";
const MAX_LIST_ITEMS = 8;
const MAX_ITEM_LENGTH = 90;
const MAX_TEXT_LENGTH = 260;

export type ResidentScopedAssistantRequest = {
  prompt: string;
  residentContext: ResidentAIContext;
  actionId?: string;
  actionLabel?: string;
  createdAt: string;
};

function cleanText(value: string | null | undefined, maxLength = MAX_TEXT_LENGTH) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}

function cleanList(values: string[] | null | undefined) {
  if (!Array.isArray(values)) return [];
  const deduped = Array.from(
    new Set(
      values
        .map((value) => cleanText(value, MAX_ITEM_LENGTH))
        .filter((value): value is string => Boolean(value))
    )
  );
  return deduped.slice(0, MAX_LIST_ITEMS);
}

export function sanitizeResidentAIContext(input: ResidentAIContext): ResidentAIContext {
  const residentId = cleanText(input.residentId, 120) ?? "unknown";
  const name = cleanText(input.name, 120) ?? "Resident";

  return {
    residentId,
    name,
    preferredName: cleanText(input.preferredName, 120),
    roomNumber: cleanText(input.roomNumber, 32),
    birthday: cleanText(input.birthday, 48),
    interests: cleanList(input.interests),
    dislikes: cleanList(input.dislikes),
    favoriteActivities: cleanList(input.favoriteActivities),
    favoriteMusic: cleanList(input.favoriteMusic),
    favoriteConversationTopics: cleanList(input.favoriteConversationTopics),
    participationStyle: cleanText(input.participationStyle, 180),
    supportNeeds: cleanList(input.supportNeeds),
    bestTimeOfDay: cleanText(input.bestTimeOfDay, 120),
    whatWorks: cleanText(input.whatWorks, 220),
    whatDoesNotWork: cleanText(input.whatDoesNotWork, 220)
  };
}

function toLine(label: string, value: string | null) {
  return `${label}: ${value ?? "Not provided"}`;
}

function toListLine(label: string, values: string[]) {
  return `${label}: ${values.length ? values.join(", ") : "Not provided"}`;
}

export function buildResidentContextLabel(residentContext: ResidentAIContext) {
  const cleaned = sanitizeResidentAIContext(residentContext);
  const displayName = cleaned.preferredName || cleaned.name;
  if (!cleaned.roomNumber) return displayName;
  return `${displayName} · Room ${cleaned.roomNumber}`;
}

export function createResidentScopedPrompt(input: {
  residentContext: ResidentAIContext;
  prompt: string;
}) {
  const resident = sanitizeResidentAIContext(input.residentContext);
  const requestPrompt = cleanText(input.prompt, 1800) ?? "Help me with this resident.";

  const residentLines = [
    toLine("Resident Name", resident.name),
    toLine("Preferred Name", resident.preferredName),
    toLine("Room Number", resident.roomNumber),
    toLine("Birthday", resident.birthday),
    toListLine("Interests", resident.interests),
    toListLine("Dislikes", resident.dislikes),
    toListLine("Favorite Activities", resident.favoriteActivities),
    toListLine("Favorite Music", resident.favoriteMusic),
    toListLine("Favorite Conversation Topics", resident.favoriteConversationTopics),
    toLine("Participation Style", resident.participationStyle),
    toListLine("Support Needs", resident.supportNeeds),
    toLine("Best Time of Day", resident.bestTimeOfDay),
    toLine("What Works", resident.whatWorks),
    toLine("What Does Not Work", resident.whatDoesNotWork)
  ];

  return [
    "Resident-specific context is included for personalization.",
    "Use only the provided resident context and explicit user-provided facts.",
    "Do not invent attendance, participation, behavior, mood/response details, or clinical facts.",
    "If details are missing, say so clearly and suggest options instead of guessing.",
    "",
    "Resident Context:",
    ...residentLines,
    "",
    `User Request: ${requestPrompt}`
  ].join("\n");
}

export function isResidentScopedRequest(input: {
  residentContext?: ResidentAIContext | null;
} | null | undefined) {
  return Boolean(input?.residentContext && cleanText(input.residentContext.name, 120));
}

export function queueResidentScopedAssistantRequest(
  input: Omit<ResidentScopedAssistantRequest, "createdAt" | "residentContext"> & {
    residentContext: ResidentAIContext;
  }
) {
  if (typeof window === "undefined") return;

  const prompt = cleanText(input.prompt, 1200) ?? "";
  if (!prompt) return;

  const payload: ResidentScopedAssistantRequest = {
    prompt,
    residentContext: sanitizeResidentAIContext(input.residentContext),
    actionId: cleanText(input.actionId, 64) ?? undefined,
    actionLabel: cleanText(input.actionLabel, 120) ?? undefined,
    createdAt: new Date().toISOString()
  };

  window.sessionStorage.setItem(ASSISTANT_RESIDENT_CONTEXT_STORAGE_KEY, JSON.stringify(payload));
}

export function consumeResidentScopedAssistantRequest(): ResidentScopedAssistantRequest | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(ASSISTANT_RESIDENT_CONTEXT_STORAGE_KEY);
  if (!raw) return null;

  window.sessionStorage.removeItem(ASSISTANT_RESIDENT_CONTEXT_STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw) as ResidentScopedAssistantRequest | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.residentContext || typeof parsed.residentContext !== "object") return null;

    const prompt = cleanText(parsed.prompt, 1200) ?? "";
    if (!prompt) return null;

    return {
      prompt,
      residentContext: sanitizeResidentAIContext(parsed.residentContext),
      actionId: cleanText(parsed.actionId, 64) ?? undefined,
      actionLabel: cleanText(parsed.actionLabel, 120) ?? undefined,
      createdAt: cleanText(parsed.createdAt, 64) ?? new Date().toISOString()
    };
  } catch {
    return null;
  }
}
