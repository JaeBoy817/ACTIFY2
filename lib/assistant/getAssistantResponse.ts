import { matchPromptToIntent } from "@/lib/assistant/matchPromptToIntent";
import {
  parseRewriteRequest,
  rewordOneToOneNote,
  rewordProgressNote,
  type NoteRewriteStyle
} from "@/lib/assistant/noteRewriter";
import {
  PRESET_RESPONSES,
  type AssistantIntent,
  type PresetAssistantResponse
} from "@/lib/assistant/presetResponses";

export type AssistantResponseIntent =
  | AssistantIntent
  | "noteRewordProgress"
  | "noteRewordOneToOne"
  | "noteRewordNeedsType"
  | "noteRewordNeedsText"
  | "identity"
  | "clinicalRedirect";

export type AssistantResponseResult = {
  intent: AssistantResponseIntent;
  responseId: string;
  formattedMessage: string;
  source: "preset" | "note-rewriter";
  rewriteStyle?: NoteRewriteStyle;
};

function formatPresetResponse(response: PresetAssistantResponse) {
  const tagsLine =
    response.tags.length > 0 ? `\n\nTags: ${response.tags.map((tag) => `#${tag}`).join(" ")}` : "";
  return `${response.title}\n\n${response.content}${tagsLine}`;
}

function pickResponseForIntent(intent: AssistantIntent, excludeId?: string) {
  const responseSet = PRESET_RESPONSES[intent];
  if (!responseSet || responseSet.length === 0) {
    return PRESET_RESPONSES.fallback[0];
  }

  if (responseSet.length === 1 || !excludeId) {
    return responseSet[Math.floor(Math.random() * responseSet.length)];
  }

  const filtered = responseSet.filter((response) => response.id !== excludeId);
  const pool = filtered.length > 0 ? filtered : responseSet;
  return pool[Math.floor(Math.random() * pool.length)];
}

function isIdentityQuestion(prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  return /^(who|what)\s+are\s+you\??$/.test(normalized) || normalized.includes("who are you") || normalized.includes("what are you");
}

function isClinicalRequest(prompt: string) {
  const normalized = prompt.toLowerCase();
  return (
    normalized.includes("act like a doctor") ||
    normalized.includes("diagnose") ||
    normalized.includes("diagnosis") ||
    normalized.includes("medical advice") ||
    normalized.includes("nursing assessment")
  );
}

export function getAssistantResponseFromPrompt(options: {
  prompt: string;
  forceIntent?: AssistantResponseIntent;
  excludeResponseId?: string;
}): AssistantResponseResult {
  if (isIdentityQuestion(options.prompt)) {
    return {
      intent: "identity",
      responseId: "actify-identity",
      source: "preset",
      formattedMessage: "Actify, the AI Assistant tool for Activity Directors."
    };
  }

  if (isClinicalRequest(options.prompt)) {
    return {
      intent: "clinicalRedirect",
      responseId: "clinical-redirect",
      source: "preset",
      formattedMessage:
        "That may need to be addressed by nursing or the interdisciplinary team per facility policy. From an Activities documentation standpoint, you can document only the observed activity response, resident engagement, participation, mood/affect if observed, and any Activities follow-up that is supported by the facts you provide."
    };
  }

  const rewriteRequest = parseRewriteRequest(options.prompt);

  if (
    options.forceIntent === "noteRewordProgress" ||
    options.forceIntent === "noteRewordOneToOne" ||
    rewriteRequest.intent === "rewriteNote"
  ) {
    const noteText = rewriteRequest.rawNoteText;
    const style = rewriteRequest.style;
    const forcedType =
      options.forceIntent === "noteRewordProgress"
        ? "progress"
        : options.forceIntent === "noteRewordOneToOne"
          ? "one_to_one"
          : rewriteRequest.noteType;

    if (noteText.trim().length < 4) {
      return {
        intent: "noteRewordNeedsText",
        responseId: "reword-needs-text",
        source: "note-rewriter",
        rewriteStyle: style,
        formattedMessage:
          "Paste a rough note after your request so I can reword it clearly. Example: Reword this progress note: Resident came to bingo and needed encouragement."
      };
    }

    if (forcedType === "unknown") {
      return {
        intent: "noteRewordNeedsType",
        responseId: "reword-needs-type",
        source: "note-rewriter",
        rewriteStyle: style,
        formattedMessage:
          "I can reword this right away. Please specify the note type first: Progress Note or 1:1 Note."
      };
    }

    const rewritten =
      forcedType === "progress"
        ? rewordProgressNote(noteText, style, { excludeResponseId: options.excludeResponseId })
        : rewordOneToOneNote(noteText, style, { excludeResponseId: options.excludeResponseId });

    return {
      intent: forcedType === "progress" ? "noteRewordProgress" : "noteRewordOneToOne",
      responseId: rewritten.responseId,
      source: "note-rewriter",
      rewriteStyle: style,
      formattedMessage: `Reworded ${forcedType === "progress" ? "Progress Note" : "1:1 Note"} (${style}):\n\n${rewritten.note}`
    };
  }

  const intent = (options.forceIntent as AssistantIntent | undefined) ?? matchPromptToIntent(options.prompt);
  const safeIntent: AssistantIntent = PRESET_RESPONSES[intent] ? intent : "fallback";
  const response = pickResponseForIntent(safeIntent, options.excludeResponseId);

  return {
    intent: safeIntent,
    responseId: response.id,
    source: "preset",
    formattedMessage: formatPresetResponse(response)
  };
}
