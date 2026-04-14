import { OpenRouter } from "@openrouter/sdk";

import type { AssistantChatMessageInput, AssistantMode } from "@/lib/assistant/schema";
import { getAssistantSystemPrompt } from "@/lib/assistant/system-prompt";

export class AssistantConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantConfigurationError";
  }
}

let openRouterClient: OpenRouter | null = null;

function getOpenRouterApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new AssistantConfigurationError("Assistant is not configured. Missing OPENROUTER_API_KEY.");
  }
  return apiKey;
}

function getOpenRouterClient() {
  if (openRouterClient) return openRouterClient;
  openRouterClient = new OpenRouter({
    apiKey: getOpenRouterApiKey()
  });
  return openRouterClient;
}

export function getAssistantModel() {
  return process.env.ACTIFY_AI_MODEL?.trim() || process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
}

export async function streamAssistantCompletion(options: {
  mode: AssistantMode;
  messages: AssistantChatMessageInput[];
}) {
  const client = getOpenRouterClient();
  const model = getAssistantModel();

  const stream = await client.chat.send({
    chatRequest: {
      model,
      temperature: 0.45,
      stream: true,
      messages: [
        {
          role: "system",
          content: getAssistantSystemPrompt(options.mode)
        },
        ...options.messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ]
    }
  });

  return {
    stream,
    model
  };
}
