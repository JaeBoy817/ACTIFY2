import { buildActifySystemPrompt, type ActifyAssistantMode } from "@/lib/ai/buildActifySystemPrompt";

export type OpenRouterChatRole = "system" | "user" | "assistant";

export type OpenRouterChatMessage = {
  role: OpenRouterChatRole;
  content: string;
};

export type OpenRouterChatResult = {
  message: string;
  model: string;
  providerModel: string | null;
};

type OpenRouterErrorCode =
  | "MISSING_API_KEY"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_FAILURE"
  | "BAD_RESPONSE";

export class OpenRouterRequestError extends Error {
  readonly code: OpenRouterErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    code: OpenRouterErrorCode,
    message: string,
    options?: { status?: number; retryable?: boolean }
  ) {
    super(message);
    this.name = "OpenRouterRequestError";
    this.code = code;
    this.status = options?.status ?? 500;
    this.retryable = options?.retryable ?? false;
  }
}

type OpenRouterResponseShape = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25_000;

function getOpenRouterApiKey() {
  const value = process.env.OPENROUTER_API_KEY?.trim();
  if (!value) {
    throw new OpenRouterRequestError(
      "MISSING_API_KEY",
      "Assistant is not configured. Missing OPENROUTER_API_KEY.",
      { status: 503, retryable: false }
    );
  }
  return value;
}

export function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL?.trim() || process.env.ACTIFY_AI_MODEL?.trim() || "openrouter/free";
}

function extractContent(content: unknown) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }

  return "";
}

function readOptionalHeaderEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export async function generateActifyAssistantReply(options: {
  mode: ActifyAssistantMode;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}): Promise<OpenRouterChatResult> {
  const apiKey = getOpenRouterApiKey();
  const model = getOpenRouterModel();

  const appUrl = readOptionalHeaderEnv("NEXT_PUBLIC_APP_URL");
  const appName = readOptionalHeaderEnv("NEXT_PUBLIC_APP_NAME");

  const headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (appUrl) {
    headers["HTTP-Referer"] = appUrl;
  }
  if (appName) {
    headers["X-OpenRouter-Title"] = appName;
  }

  const allMessages: OpenRouterChatMessage[] = [
    {
      role: "system",
      content: buildActifySystemPrompt(options.mode)
    },
    ...options.history,
    {
      role: "user",
      content: options.userMessage
    }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 700
      })
    });

    let parsedBody: unknown = null;
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }

    if (!response.ok) {
      const providerMessage =
        parsedBody &&
        typeof parsedBody === "object" &&
        "error" in parsedBody &&
        parsedBody.error &&
        typeof parsedBody.error === "object" &&
        "message" in parsedBody.error &&
        typeof parsedBody.error.message === "string"
          ? parsedBody.error.message
          : null;

      if (response.status === 429) {
        throw new OpenRouterRequestError(
          "RATE_LIMITED",
          providerMessage || "The assistant is taking a little longer than expected.",
          { status: 429, retryable: true }
        );
      }

      if (response.status >= 400 && response.status < 500) {
        throw new OpenRouterRequestError(
          "BAD_REQUEST",
          providerMessage || "We couldn’t generate a response right now.",
          { status: response.status, retryable: false }
        );
      }

      throw new OpenRouterRequestError(
        "UPSTREAM_FAILURE",
        providerMessage || "We couldn’t generate a response right now.",
        { status: 502, retryable: true }
      );
    }

    const body = parsedBody as OpenRouterResponseShape | null;
    const rawContent = body?.choices?.[0]?.message?.content;
    const message = extractContent(rawContent).trim();

    if (!message) {
      throw new OpenRouterRequestError("BAD_RESPONSE", "We couldn’t generate a response right now.", {
        status: 502,
        retryable: true
      });
    }

    return {
      message,
      model,
      providerModel: typeof body?.model === "string" ? body.model : null
    };
  } catch (error) {
    if (error instanceof OpenRouterRequestError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenRouterRequestError("TIMEOUT", "The assistant is taking a little longer than expected.", {
        status: 504,
        retryable: true
      });
    }

    throw new OpenRouterRequestError("UPSTREAM_FAILURE", "We couldn’t generate a response right now.", {
      status: 502,
      retryable: true
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
