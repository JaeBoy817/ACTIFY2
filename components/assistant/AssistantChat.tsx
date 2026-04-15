"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { AssistantMessage } from "@/components/assistant/AssistantMessage";
import { PromptChips } from "@/components/assistant/PromptChips";
import { EmptyState } from "@/components/assistant-dashboard/EmptyState";
import type {
  AssistantApiErrorResponse,
  AssistantApiResponse,
  AssistantApiRequest,
  AssistantApiSuccessResponse,
  AssistantConversationMessage,
  AssistantIntent
} from "@/lib/assistant/types";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  intent?: AssistantIntent;
  sourcePrompt?: string;
  model?: string | null;
};

type RequestSnapshot = {
  prompt: string;
  historySnapshot: AssistantConversationMessage[];
  forceNewConversation: boolean;
};

type PersistedAssistantChatState = {
  messages: ChatMessage[];
  conversationId: string | null;
  model: string | null;
};

const STORAGE_KEY = "actify-assistant-chat-v4";
const MAX_MESSAGES = 24;

const QUICK_PROMPTS = [
  "Give me a backup activity",
  "Reword this progress note: Resident attended bingo, needed encouragement at first, then smiled and talked with peers.",
  "Write a 1:1 note",
  "Help me plan next week’s calendar",
  "Give me a 1:1 idea for a bed-bound resident"
];

function parsePersistedChatState(raw: string | null): PersistedAssistantChatState {
  const emptyState: PersistedAssistantChatState = {
    messages: [],
    conversationId: null,
    model: null
  };

  if (!raw) return emptyState;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return {
        messages: parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const typed = item as { id?: unknown; role?: unknown; text?: unknown };
            return {
              id: typeof typed.id === "string" ? typed.id : crypto.randomUUID(),
              role: typed.role === "user" ? "user" : "assistant",
              text: typeof typed.text === "string" ? typed.text : ""
            } satisfies ChatMessage;
          })
          .filter((item) => item.text.trim().length > 0)
          .slice(-MAX_MESSAGES),
        conversationId: null,
        model: null
      };
    }

    if (!parsed || typeof parsed !== "object") return emptyState;
    const typed = parsed as {
      messages?: unknown;
      conversationId?: unknown;
      model?: unknown;
    };

    const messages = Array.isArray(typed.messages)
      ? typed.messages
          .filter((item) => item && typeof item === "object")
          .map((item) => {
            const value = item as {
              id?: unknown;
              role?: unknown;
              text?: unknown;
              intent?: unknown;
              sourcePrompt?: unknown;
              model?: unknown;
            };

            return {
              id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
              role: value.role === "user" ? "user" : "assistant",
              text: typeof value.text === "string" ? value.text : "",
              intent: typeof value.intent === "string" ? (value.intent as AssistantIntent) : undefined,
              sourcePrompt: typeof value.sourcePrompt === "string" ? value.sourcePrompt : undefined,
              model: typeof value.model === "string" ? value.model : null
            } satisfies ChatMessage;
          })
          .filter((item) => item.text.trim().length > 0)
          .slice(-MAX_MESSAGES)
      : [];

    return {
      messages,
      conversationId: typeof typed.conversationId === "string" ? typed.conversationId : null,
      model: typeof typed.model === "string" ? typed.model : null
    };
  } catch {
    return emptyState;
  }
}

function mapMessagesToConversationHistory(messages: ChatMessage[]): AssistantConversationMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      content: message.text
    }))
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-MAX_MESSAGES);
}

function isAssistantApiError(data: AssistantApiResponse): data is AssistantApiErrorResponse {
  return data.ok === false;
}

async function requestAssistantResponse(payload: AssistantApiRequest) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json().catch(() => null)) as AssistantApiResponse | null;
  if (!data) {
    throw new Error("We couldn’t generate a response right now. Please try again.");
  }

  if (!response.ok) {
    if (isAssistantApiError(data)) {
      throw new Error(data.error || "We couldn’t generate a response right now. Please try again.");
    }
    throw new Error("We couldn’t generate a response right now. Please try again.");
  }

  if (isAssistantApiError(data)) {
    throw new Error(data.error || "We couldn’t generate a response right now. Please try again.");
  }

  return data as AssistantApiSuccessResponse;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<RequestSnapshot | null>(null);
  const [lastAssistantSnapshot, setLastAssistantSnapshot] = useState<RequestSnapshot | null>(null);
  const [copyStateByMessageId, setCopyStateByMessageId] = useState<Record<string, "idle" | "copied">>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const persisted = parsePersistedChatState(window.sessionStorage.getItem(STORAGE_KEY));
    if (persisted.messages.length > 0) {
      setMessages(persisted.messages);
    }
    if (persisted.conversationId) {
      setConversationId(persisted.conversationId);
    }
    if (persisted.model) {
      setActiveModel(persisted.model);
    }

    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const payload: PersistedAssistantChatState = {
      messages: messages.slice(-MAX_MESSAGES),
      conversationId,
      model: activeModel
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [messages, conversationId, activeModel]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSubmitting, errorMessage]);

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  const sendPrompt = async (
    value: string,
    options?: {
      appendUserMessage?: boolean;
      historySnapshot?: AssistantConversationMessage[];
      forceNewConversation?: boolean;
    }
  ) => {
    const content = value.trim();
    if (!content) {
      setErrorMessage("Please enter a prompt before sending.");
      return;
    }
    if (isSubmitting) return;

    const appendUserMessage = options?.appendUserMessage ?? true;
    const historySnapshot = options?.historySnapshot ?? mapMessagesToConversationHistory(messages);
    const forceNewConversation = options?.forceNewConversation ?? false;

    if (appendUserMessage) {
      const nextUserMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: content
      };
      setMessages((current) => [...current, nextUserMessage].slice(-MAX_MESSAGES));
      setPrompt("");
    }

    const snapshot: RequestSnapshot = {
      prompt: content,
      historySnapshot,
      forceNewConversation
    };

    setLastAttempt(snapshot);
    setIsSubmitting(true);
    setErrorMessage(null);
    setActivePrompt(content);

    try {
      const apiResponse = await requestAssistantResponse({
        message: content,
        conversationHistory: historySnapshot,
        mode: "auto",
        conversationId: forceNewConversation ? null : conversationId
      });

      const assistantReply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: apiResponse.message,
        intent: apiResponse.meta.intent,
        sourcePrompt: content,
        model: apiResponse.meta.model ?? null
      };

      setMessages((current) => [...current, assistantReply].slice(-MAX_MESSAGES));
      setLastAssistantSnapshot(snapshot);
      setConversationId(apiResponse.meta.conversationId ?? null);

      if (apiResponse.meta.model) {
        setActiveModel(apiResponse.meta.model);
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("We couldn’t generate a response right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
      setActivePrompt(null);
    }
  };

  const retryLastAttempt = async () => {
    if (!lastAttempt || isSubmitting) return;
    await sendPrompt(lastAttempt.prompt, {
      appendUserMessage: false,
      historySnapshot: lastAttempt.historySnapshot,
      forceNewConversation: lastAttempt.forceNewConversation
    });
  };

  const regenerateLastAssistant = async () => {
    if (!lastAssistantSnapshot || isSubmitting) return;
    await sendPrompt(lastAssistantSnapshot.prompt, {
      appendUserMessage: false,
      historySnapshot: lastAssistantSnapshot.historySnapshot,
      forceNewConversation: true
    });
  };

  const copyMessage = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStateByMessageId((current) => ({ ...current, [messageId]: "copied" }));
      window.setTimeout(() => {
        setCopyStateByMessageId((current) => ({ ...current, [messageId]: "idle" }));
      }, 1200);
    } catch {
      setCopyStateByMessageId((current) => ({ ...current, [messageId]: "idle" }));
    }
  };

  return (
    <div className="space-y-4">
      <PromptChips
        prompts={quickPrompts}
        activePrompt={activePrompt}
        onPickPrompt={(selectedPrompt) => {
          setPrompt(selectedPrompt);
          void sendPrompt(selectedPrompt);
        }}
      />

      <div
        ref={scrollRef}
        className="h-[440px] overflow-y-auto rounded-[1.6rem] border border-slate-200 bg-white/75 p-4 md:h-[540px]"
        aria-live="polite"
      >
        {messages.length === 0 && !isSubmitting ? (
          <EmptyState
            icon={Sparkles}
            title="What do you need help with today?"
            description="Ask for activity ideas, note rewording, planning support, or resident-focused suggestions."
          />
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isLastAssistant =
                message.role === "assistant" &&
                messages.slice(index + 1).every((later) => later.role !== "assistant");

              return (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  isLastAssistant={isLastAssistant}
                  isLoading={isSubmitting}
                  copyState={copyStateByMessageId[message.id] || "idle"}
                  onCopy={copyMessage}
                  onRegenerate={() => {
                    void regenerateLastAssistant();
                  }}
                />
              );
            })}

            {isSubmitting ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Actify is drafting a response...
              </div>
            ) : null}
          </div>
        )}
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              void retryLastAttempt();
            }}
            disabled={isSubmitting || !lastAttempt}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      ) : null}

      <AssistantComposer
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => {
          void sendPrompt(prompt);
        }}
        disabled={isSubmitting}
      />

      <p className="text-xs text-slate-500">
        Engine: <span className="font-medium text-slate-700">Mistral Agent</span>
        {activeModel ? (
          <>
            {" "}
            <span className="text-slate-400">({activeModel})</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
