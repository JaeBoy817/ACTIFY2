import { Mistral } from "@mistralai/mistralai";

import { extractAssistantTextFromMistralResponse } from "@/lib/assistant/extractAssistantText";
import { matchPromptToIntent } from "@/lib/assistant/matchPromptToIntent";
import { parseRewriteRequest } from "@/lib/assistant/parseRewriteRequest";
import type {
  AssistantConversationMessage,
  AssistantIntent,
  AssistantMode
} from "@/lib/assistant/types";

const DEFAULT_MISTRAL_AGENT_ID = "ag_019d92c5923371f19d586b2c54926fad";
const DEFAULT_MISTRAL_AGENT_VERSION = 0;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_HISTORY_MESSAGES = 14;
const MAX_HISTORY_CHARS = 2_000;
const MAX_INPUT_CHARS = 4_000;

type MistralConfig = {
  apiKey: string;
  agentId: string;
  agentVersion: number;
};

export type MistralAssistantRequest = {
  message: string;
  conversationHistory: AssistantConversationMessage[];
  mode: AssistantMode;
  conversationId?: string | null;
};

export type MistralAssistantResult = {
  message: string;
  intent: AssistantIntent;
  conversationId: string;
  model: string | null;
  agentId: string;
  agentVersion: number;
};

export type MistralAssistantStreamCallbacks = {
  onTextChunk: (chunk: string) => void | Promise<void>;
  onConversationId?: (conversationId: string) => void | Promise<void>;
  onModel?: (model: string) => void | Promise<void>;
  signal?: AbortSignal;
};

export class MistralAssistantError extends Error {
  status: number;
  code: string;

  constructor(message: string, options: { status: number; code: string; cause?: unknown }) {
    super(message);
    this.name = "MistralAssistantError";
    this.status = options.status;
    this.code = options.code;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

let mistralClient: Mistral | null = null;
let cachedApiKey: string | null = null;

function getMistralConfig(): MistralConfig {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  if (!apiKey) {
    throw new MistralAssistantError("Assistant is not configured. Missing MISTRAL_API_KEY.", {
      status: 503,
      code: "MISTRAL_NOT_CONFIGURED"
    });
  }

  const agentId = process.env.MISTRAL_AGENT_ID?.trim() || DEFAULT_MISTRAL_AGENT_ID;
  const rawAgentVersion = process.env.MISTRAL_AGENT_VERSION?.trim();
  const parsedAgentVersion = rawAgentVersion ? Number.parseInt(rawAgentVersion, 10) : DEFAULT_MISTRAL_AGENT_VERSION;
  const agentVersion = Number.isFinite(parsedAgentVersion) ? parsedAgentVersion : DEFAULT_MISTRAL_AGENT_VERSION;

  return {
    apiKey,
    agentId,
    agentVersion
  };
}

function getMistralClient(apiKey: string) {
  if (!mistralClient || cachedApiKey !== apiKey) {
    mistralClient = new Mistral({ apiKey });
    cachedApiKey = apiKey;
  }

  return mistralClient;
}

function trimContent(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength);
}

function normalizeConversationHistory(history: AssistantConversationMessage[]) {
  return history
    .filter((entry) => entry && (entry.role === "user" || entry.role === "assistant"))
    .map((entry) => ({
      role: entry.role,
      content: trimContent(entry.content, MAX_HISTORY_CHARS)
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

function mapPresetIntentToAssistantIntent(prompt: string): AssistantIntent {
  const matched = matchPromptToIntent(prompt);

  if (matched === "backupActivityIdeas") return "activity_backup";
  if (matched === "groupActivityIdeas") return "activity_group";
  if (matched === "oneToOneVisitIdeas") return "activity_1to1";
  if (matched === "bedBoundResidentIdeas") return "activity_bed_bound";
  if (matched === "dementiaFriendlyIdeas") return "activity_dementia_friendly";
  if (matched === "progressNoteHelp") return "progress_note_help";
  if (matched === "oneToOneNoteHelp") return "one_to_one_note_help";
  if (matched === "carePlanWording") return "care_plan_wording";
  if (matched === "calendarPlanningHelp") return "calendar_planning";
  if (matched === "holidayActivityPlanning") return "holiday_planning";
  if (matched === "residentEngagementSuggestions") return "resident_engagement";
  if (matched === "lowBudgetActivityIdeas") return "low_budget_ideas";
  return "general_assistant";
}

function deriveIntent(message: string) {
  const rewriteRequest = parseRewriteRequest(message);

  if (rewriteRequest.intent === "rewriteNote") {
    if (rewriteRequest.noteType === "progress") {
      return { intent: "rewrite_progress_note" as const, rewriteRequest };
    }
    if (rewriteRequest.noteType === "one_to_one") {
      return { intent: "rewrite_1to1_note" as const, rewriteRequest };
    }
    return { intent: "rewrite_note" as const, rewriteRequest };
  }

  return {
    intent: mapPresetIntentToAssistantIntent(message),
    rewriteRequest
  };
}

function buildRewritePrompt(input: {
  noteText: string;
  noteType: "progress" | "one_to_one" | "unknown";
  style: "professional" | "shorter" | "detailed";
}) {
  const typeLabel =
    input.noteType === "progress" ? "Progress Note" : input.noteType === "one_to_one" ? "1:1 Note" : "Activity Documentation Note";

  const styleInstruction =
    input.style === "shorter"
      ? "Output style: shorter PCC-ready version."
      : input.style === "detailed"
        ? "Output style: more detailed PCC-ready version (still concise and factual)."
        : "Output style: professional balanced PCC-ready version.";

  return [
    `Reword this ${typeLabel}.`,
    styleInstruction,
    "Preserve every specific detail from the original note, including location, activity, mood/response, encouragement/cueing, and future preference details when present.",
    "Do not invent facts or clinical conclusions.",
    "",
    "Original note:",
    input.noteText.trim()
  ].join("\n");
}

function buildFinalPrompt(message: string) {
  const parsed = parseRewriteRequest(message);
  if (parsed.intent !== "rewriteNote") {
    return {
      intentData: deriveIntent(message),
      prompt: trimContent(message, MAX_INPUT_CHARS)
    };
  }

  const rawNoteText = parsed.rawNoteText.trim();
  if (!rawNoteText) {
    throw new MistralAssistantError("Paste your rough note after the rewrite request so Actify can preserve your details.", {
      status: 400,
      code: "NOTE_TEXT_REQUIRED"
    });
  }

  if (rawNoteText.split(/\s+/).filter(Boolean).length < 4) {
    throw new MistralAssistantError(
      "Add a little more detail so Actify can create a stronger rewrite. Include activity, participation, mood, response, or support details.",
      {
        status: 400,
        code: "NOTE_TEXT_TOO_SHORT"
      }
    );
  }

  return {
    intentData: deriveIntent(message),
    prompt: buildRewritePrompt({
      noteText: rawNoteText,
      noteType: parsed.noteType,
      style: parsed.style
    })
  };
}

function toProviderError(error: unknown): MistralAssistantError {
  if (error instanceof MistralAssistantError) return error;

  if (error instanceof Error) {
    if (error.message === "MISTRAL_EMPTY_OUTPUT") {
      return new MistralAssistantError("We couldn’t generate a response right now. Please try again.", {
        status: 502,
        code: "MISTRAL_EMPTY_OUTPUT",
        cause: error
      });
    }

    if (error.name === "RequestTimeoutError" || error.name === "RequestAbortedError") {
      return new MistralAssistantError("The assistant is taking a little longer than expected.", {
        status: 504,
        code: "TIMEOUT",
        cause: error
      });
    }
  }

  return new MistralAssistantError("We couldn’t generate a response right now. Please try again.", {
    status: 502,
    code: "MISTRAL_PROVIDER_ERROR",
    cause: error
  });
}

type StartConversationInput = {
  client: Mistral;
  config: MistralConfig;
  prompt: string;
  history: AssistantConversationMessage[];
};

async function startConversation(input: StartConversationInput) {
  const inputs = [
    ...input.history.map((entry) => ({
      role: entry.role,
      content: entry.content
    })),
    { role: "user" as const, content: input.prompt }
  ];

  return input.client.beta.conversations.start(
    {
      agentId: input.config.agentId,
      agentVersion: input.config.agentVersion,
      inputs
    },
    {
      timeoutMs: REQUEST_TIMEOUT_MS
    }
  );
}

async function appendConversation(input: {
  client: Mistral;
  conversationId: string;
  prompt: string;
}) {
  return input.client.beta.conversations.append(
    {
      conversationId: input.conversationId,
      conversationAppendRequest: {
        inputs: [{ role: "user", content: input.prompt }]
      }
    },
    {
      timeoutMs: REQUEST_TIMEOUT_MS
    }
  );
}

async function startConversationStream(input: StartConversationInput) {
  const inputs = [
    ...input.history.map((entry) => ({
      role: entry.role,
      content: entry.content
    })),
    { role: "user" as const, content: input.prompt }
  ];

  return input.client.beta.conversations.startStream(
    {
      agentId: input.config.agentId,
      agentVersion: input.config.agentVersion,
      inputs
    },
    {
      timeoutMs: REQUEST_TIMEOUT_MS
    }
  );
}

async function appendConversationStream(input: {
  client: Mistral;
  conversationId: string;
  prompt: string;
}) {
  return input.client.beta.conversations.appendStream(
    {
      conversationId: input.conversationId,
      conversationAppendStreamRequest: {
        inputs: [{ role: "user", content: input.prompt }]
      }
    },
    {
      timeoutMs: REQUEST_TIMEOUT_MS
    }
  );
}

function extractDeltaTextChunk(eventData: unknown) {
  if (!eventData || typeof eventData !== "object") return "";
  const typed = eventData as {
    content?: unknown;
  };

  if (typeof typed.content === "string") {
    return typed.content;
  }

  if (typed.content && typeof typed.content === "object") {
    const chunk = typed.content as { text?: unknown; type?: unknown };
    if (typeof chunk.text === "string") {
      return chunk.text;
    }
  }

  return "";
}

async function consumeConversationStream(
  stream: AsyncIterable<unknown>,
  callbacks: MistralAssistantStreamCallbacks
) {
  let generatedMessage = "";
  let conversationId = "";
  let model: string | null = null;

  for await (const rawEvent of stream) {
    if (callbacks.signal?.aborted) {
      throw new MistralAssistantError("Request was canceled.", {
        status: 499,
        code: "REQUEST_ABORTED"
      });
    }

    const event = rawEvent as {
      event?: string;
      data?: Record<string, unknown>;
    };
    const eventType = event.event;
    const eventData = event.data;

    if (eventType === "conversation.response.error") {
      const message =
        eventData && typeof eventData.message === "string"
          ? eventData.message
          : "We couldn’t generate a response right now. Please try again.";
      throw new MistralAssistantError(message, {
        status: 502,
        code: "MISTRAL_PROVIDER_ERROR"
      });
    }

    if (eventType === "conversation.response.started" && eventData && typeof eventData.conversationId === "string") {
      conversationId = eventData.conversationId;
      if (callbacks.onConversationId) {
        await callbacks.onConversationId(conversationId);
      }
      continue;
    }

    if (eventType === "message.output.delta") {
      if (eventData && typeof eventData.model === "string") {
        model = eventData.model;
        if (callbacks.onModel) {
          await callbacks.onModel(model);
        }
      }

      const chunk = extractDeltaTextChunk(eventData);
      if (chunk.length > 0) {
        generatedMessage += chunk;
        await callbacks.onTextChunk(chunk);
      }
    }
  }

  return {
    generatedMessage,
    conversationId,
    model
  };
}

export async function runMistralAssistant(request: MistralAssistantRequest): Promise<MistralAssistantResult> {
  const config = getMistralConfig();
  const client = getMistralClient(config.apiKey);
  const history = normalizeConversationHistory(request.conversationHistory);
  const { intentData, prompt } = buildFinalPrompt(request.message);

  try {
    let providerResponse:
      | Awaited<ReturnType<typeof startConversation>>
      | Awaited<ReturnType<typeof appendConversation>>;

    const hasConversationId = Boolean(request.conversationId && request.conversationId.trim().length > 0);

    if (hasConversationId) {
      try {
        providerResponse = await appendConversation({
          client,
          conversationId: request.conversationId!.trim(),
          prompt
        });
      } catch {
        providerResponse = await startConversation({
          client,
          config,
          prompt,
          history
        });
      }
    } else {
      providerResponse = await startConversation({
        client,
        config,
        prompt,
        history
      });
    }

    const extracted = extractAssistantTextFromMistralResponse(providerResponse);
    const conversationId =
      providerResponse && typeof providerResponse === "object" && "conversationId" in providerResponse
        ? (providerResponse.conversationId as string)
        : "";

    if (!conversationId) {
      throw new MistralAssistantError("We couldn’t generate a response right now. Please try again.", {
        status: 502,
        code: "MISSING_CONVERSATION_ID"
      });
    }

    return {
      message: extracted.text,
      model: extracted.model,
      conversationId,
      intent: intentData.intent,
      agentId: config.agentId,
      agentVersion: config.agentVersion
    };
  } catch (error) {
    throw toProviderError(error);
  }
}

export async function runMistralAssistantStream(
  request: MistralAssistantRequest,
  callbacks: MistralAssistantStreamCallbacks
): Promise<MistralAssistantResult> {
  const config = getMistralConfig();
  const client = getMistralClient(config.apiKey);
  const history = normalizeConversationHistory(request.conversationHistory);
  const { intentData, prompt } = buildFinalPrompt(request.message);

  try {
    let providerStream:
      | Awaited<ReturnType<typeof startConversationStream>>
      | Awaited<ReturnType<typeof appendConversationStream>>;

    const hasConversationId = Boolean(request.conversationId && request.conversationId.trim().length > 0);

    if (hasConversationId) {
      try {
        providerStream = await appendConversationStream({
          client,
          conversationId: request.conversationId!.trim(),
          prompt
        });
      } catch {
        providerStream = await startConversationStream({
          client,
          config,
          prompt,
          history
        });
      }
    } else {
      providerStream = await startConversationStream({
        client,
        config,
        prompt,
        history
      });
    }

    const { generatedMessage, conversationId, model } = await consumeConversationStream(providerStream, callbacks);

    if (!conversationId) {
      throw new MistralAssistantError("We couldn’t generate a response right now. Please try again.", {
        status: 502,
        code: "MISSING_CONVERSATION_ID"
      });
    }

    if (!generatedMessage.trim()) {
      throw new MistralAssistantError("We couldn’t generate a response right now. Please try again.", {
        status: 502,
        code: "MISTRAL_EMPTY_OUTPUT"
      });
    }

    return {
      message: generatedMessage,
      model,
      conversationId,
      intent: intentData.intent,
      agentId: config.agentId,
      agentVersion: config.agentVersion
    };
  } catch (error) {
    throw toProviderError(error);
  }
}
