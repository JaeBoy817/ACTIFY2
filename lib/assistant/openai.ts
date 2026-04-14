import type { AssistantChatMessageInput, AssistantMode } from "@/lib/assistant/schema";
import { getAssistantSystemPrompt } from "@/lib/assistant/system-prompt";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class AssistantConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantConfigurationError";
  }
}

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AssistantConfigurationError("Assistant is not configured. Missing OPENAI_API_KEY.");
  }
  return apiKey;
}

export function getAssistantModel() {
  return process.env.ACTIFY_AI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export async function createAssistantCompletionStream(options: {
  mode: AssistantMode;
  messages: AssistantChatMessageInput[];
}) {
  const apiKey = getOpenAIKey();
  const model = getAssistantModel();

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      stream: true,
      messages: [
        {
          role: "system",
          content: getAssistantSystemPrompt(options.mode)
        },
        ...options.messages
      ]
    })
  });

  return response;
}
