import { matchPromptToIntent } from "@/lib/assistant/matchPromptToIntent";
import {
  PRESET_RESPONSES,
  type AssistantIntent,
  type PresetAssistantResponse
} from "@/lib/assistant/presetResponses";

export type AssistantPresetResult = {
  intent: AssistantIntent;
  response: PresetAssistantResponse;
  formattedMessage: string;
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

export function getAssistantResponseFromPrompt(options: {
  prompt: string;
  forceIntent?: AssistantIntent;
  excludeResponseId?: string;
}): AssistantPresetResult {
  const intent = options.forceIntent ?? matchPromptToIntent(options.prompt);
  const safeIntent: AssistantIntent = PRESET_RESPONSES[intent] ? intent : "fallback";
  const response = pickResponseForIntent(safeIntent, options.excludeResponseId);

  return {
    intent: safeIntent,
    response,
    formattedMessage: formatPresetResponse(response)
  };
}

