import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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

function sanitizeEnvValue(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Allow quoted values in env files.
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function readLocalEnvFileValue(key: string) {
  if (process.env.NODE_ENV === "production") return null;

  const candidates = [".env.local", ".env"];
  for (const fileName of candidates) {
    const filePath = path.join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    try {
      const raw = readFileSync(filePath, "utf8");
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) continue;

        const name = trimmed.slice(0, separatorIndex).trim();
        if (name !== key) continue;

        const value = trimmed.slice(separatorIndex + 1);
        return sanitizeEnvValue(value);
      }
    } catch {
      // Ignore file read errors in dev fallback.
    }
  }

  return null;
}

function getOpenRouterApiKey() {
  const apiKey =
    sanitizeEnvValue(process.env.OPENROUTER_API_KEY) ??
    sanitizeEnvValue(process.env.OPEN_ROUTER_API_KEY) ??
    readLocalEnvFileValue("OPENROUTER_API_KEY") ??
    readLocalEnvFileValue("OPEN_ROUTER_API_KEY");

  if (!apiKey) {
    throw new AssistantConfigurationError(
      "Assistant is not configured. Missing OPENROUTER_API_KEY. If you just updated .env, restart the server."
    );
  }

  // Catch placeholder values like <OPENROUTER_API_KEY>.
  if (apiKey.startsWith("<") && apiKey.endsWith(">")) {
    throw new AssistantConfigurationError(
      "Assistant is not configured. OPENROUTER_API_KEY appears to be a placeholder value."
    );
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
