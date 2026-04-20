"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { AssistantEmptyState } from "@/components/assistant/AssistantEmptyState";
import { AssistantMessage } from "@/components/assistant/AssistantMessage";
import { type AssistantExampleCard } from "@/components/assistant/AssistantExampleCardGrid";
import { AssistantTopBar } from "@/components/assistant/AssistantTopBar";
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

type AssistantHistoryThread = {
  id: string;
  createdAt: string;
  conversationId: string | null;
  model: string | null;
  title: string;
  messages: ChatMessage[];
};

type PersistedAssistantStore = {
  current: PersistedAssistantChatState;
  history: AssistantHistoryThread[];
};

const STORAGE_KEY = "actify-assistant-chat-v5";
const MAX_MESSAGES = 24;
const MAX_HISTORY_THREADS = 14;
const ASSISTANT_PREFILL_QUERY_PARAM = "assistantPrompt";

const QUICK_PROMPTS: AssistantExampleCard[] = [
  {
    id: "note-reword",
    title: "Reword a progress note for bingo participation",
    prompt: "Reword this progress note: Resident attended bingo, needed encouragement at first, then smiled and talked with peers.",
    kind: "notes"
  },
  {
    id: "one-to-one",
    title: "Generate a 1:1 idea for a bed-bound resident",
    prompt: "Give me a 1:1 idea for a bed-bound resident.",
    kind: "one-to-one"
  },
  {
    id: "fill-days",
    title: "Help me fill empty activity days this week",
    prompt: "Help me fill empty activity days this week with low-prep ideas.",
    kind: "calendar"
  },
  {
    id: "draft-note",
    title: "Draft a 1:1 note for a room visit",
    prompt: "Draft a 1:1 note for a room visit with a resident who was initially withdrawn but became conversational.",
    kind: "notes"
  },
  {
    id: "themed-week",
    title: "Build a themed week for next month",
    prompt: "Build a themed activity week for next month with daily anchor activities and one backup option each day.",
    kind: "calendar"
  }
];

function toEmptyCurrentState(): PersistedAssistantChatState {
  return {
    messages: [],
    conversationId: null,
    model: null
  };
}

function toEmptyPersistedStore(): PersistedAssistantStore {
  return {
    current: toEmptyCurrentState(),
    history: []
  };
}

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
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
    .slice(-MAX_MESSAGES);
}

function sanitizeHistoryThreads(input: unknown): AssistantHistoryThread[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const value = item as {
        id?: unknown;
        createdAt?: unknown;
        conversationId?: unknown;
        model?: unknown;
        title?: unknown;
        messages?: unknown;
      };

      return {
        id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
        createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
        conversationId: typeof value.conversationId === "string" ? value.conversationId : null,
        model: typeof value.model === "string" ? value.model : null,
        title: typeof value.title === "string" && value.title.trim().length > 0 ? value.title : "Assistant Conversation",
        messages: sanitizeMessages(value.messages)
      } satisfies AssistantHistoryThread;
    })
    .filter((thread) => thread.messages.length > 0)
    .slice(0, MAX_HISTORY_THREADS);
}

function buildHistoryTitle(messages: ChatMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "Assistant Conversation";
  const title = firstUser.text.trim();
  if (title.length <= 72) return title;
  return `${title.slice(0, 72).trimEnd()}...`;
}

function parsePersistedChatState(raw: string | null): PersistedAssistantStore {
  const emptyState = toEmptyPersistedStore();
  if (!raw) return emptyState;

  try {
    const parsed: unknown = JSON.parse(raw);

    // Legacy storage shape: raw message array.
    if (Array.isArray(parsed)) {
      return {
        current: {
          messages: sanitizeMessages(parsed),
          conversationId: null,
          model: null
        },
        history: []
      };
    }

    if (!parsed || typeof parsed !== "object") return emptyState;
    const typed = parsed as Record<string, unknown>;

    // Current storage shape.
    if (typed.current && typeof typed.current === "object") {
      const current = typed.current as Record<string, unknown>;
      return {
        current: {
          messages: sanitizeMessages(current.messages),
          conversationId: typeof current.conversationId === "string" ? current.conversationId : null,
          model: typeof current.model === "string" ? current.model : null
        },
        history: sanitizeHistoryThreads(typed.history)
      };
    }

    // Legacy object shape with direct messages/conversationId/model.
    const currentMessages = sanitizeMessages(typed.messages);

    return {
      current: {
        messages: currentMessages,
        conversationId: typeof typed.conversationId === "string" ? typed.conversationId : null,
        model: typeof typed.model === "string" ? typed.model : null
      },
      history: sanitizeHistoryThreads(typed.history)
    };
  } catch {
    return emptyState;
  }
}

function areConversationsEquivalent(a: ChatMessage[], b: ChatMessage[]) {
  if (a.length !== b.length) return false;
  return a.every((message, index) => {
    const other = b[index];
    if (!other) return false;
    return message.role === other.role && message.text.trim() === other.text.trim();
  });
}

function archiveCurrentConversation(store: PersistedAssistantStore) {
  const current = store.current;
  if (current.messages.length === 0) {
    return { nextStore: store, didArchive: false };
  }

  const latestHistory = store.history[0];
  const shouldDedupe = latestHistory ? areConversationsEquivalent(current.messages, latestHistory.messages) : false;

  const archivedThread: AssistantHistoryThread = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    conversationId: current.conversationId,
    model: current.model,
    title: buildHistoryTitle(current.messages),
    messages: current.messages.slice(-MAX_MESSAGES)
  };

  return {
    nextStore: {
      current: toEmptyCurrentState(),
      history: (shouldDedupe ? store.history : [archivedThread, ...store.history]).slice(0, MAX_HISTORY_THREADS)
    },
    didArchive: true
  };
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
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyThreads, setHistoryThreads] = useState<AssistantHistoryThread[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
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

  const displayName = useMemo(() => {
    const fromFirstName = user?.firstName?.trim();
    if (fromFirstName) return fromFirstName;
    const fullName = user?.fullName?.trim();
    if (!fullName) return null;
    return fullName.split(" ")[0] || null;
  }, [user?.firstName, user?.fullName]);

  useEffect(() => {
    const parsedStore = parsePersistedChatState(window.sessionStorage.getItem(STORAGE_KEY));
    const { nextStore, didArchive } = archiveCurrentConversation(parsedStore);

    if (didArchive) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    }

    if (nextStore.current.messages.length > 0) {
      setMessages(nextStore.current.messages);
    }
    if (nextStore.history.length > 0) {
      setHistoryThreads(nextStore.history);
      if (nextStore.current.messages.length === 0) {
        setActiveTab("history");
      }
    }
    if (nextStore.current.conversationId) {
      setConversationId(nextStore.current.conversationId);
    }
    if (nextStore.current.model) {
      setActiveModel(nextStore.current.model);
    }

    const params = new URLSearchParams(window.location.search);
    const prefillPrompt = params.get(ASSISTANT_PREFILL_QUERY_PARAM);

    if (prefillPrompt && prefillPrompt.trim().length > 0) {
      setPrompt(prefillPrompt);
      setActiveTab("chat");
      params.delete(ASSISTANT_PREFILL_QUERY_PARAM);
      const query = params.toString();
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }

    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const payload: PersistedAssistantStore = {
      current: {
        messages: messages.slice(-MAX_MESSAGES),
        conversationId,
        model: activeModel
      },
      history: historyThreads.slice(0, MAX_HISTORY_THREADS)
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [messages, conversationId, activeModel, historyThreads]);

  useEffect(() => {
    if (activeTab !== "chat") return;
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSubmitting, errorMessage, activeTab]);

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);
  const lastAssistantMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === "assistant") return message.id;
    }
    return null;
  }, [messages]);

  const sendPrompt = useCallback(async (
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
      setActiveTab("chat");
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
  }, [conversationId, isSubmitting, messages]);

  const retryLastAttempt = useCallback(async () => {
    if (!lastAttempt || isSubmitting) return;
    await sendPrompt(lastAttempt.prompt, {
      appendUserMessage: false,
      historySnapshot: lastAttempt.historySnapshot,
      forceNewConversation: lastAttempt.forceNewConversation
    });
  }, [isSubmitting, lastAttempt, sendPrompt]);

  const regenerateLastAssistant = useCallback(async () => {
    if (!lastAssistantSnapshot || isSubmitting) return;
    await sendPrompt(lastAssistantSnapshot.prompt, {
      appendUserMessage: false,
      historySnapshot: lastAssistantSnapshot.historySnapshot,
      forceNewConversation: true
    });
  }, [isSubmitting, lastAssistantSnapshot, sendPrompt]);

  const copyMessage = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStateByMessageId((current) => ({ ...current, [messageId]: "copied" }));
      window.setTimeout(() => {
        setCopyStateByMessageId((current) => ({ ...current, [messageId]: "idle" }));
      }, 1200);
    } catch {
      setCopyStateByMessageId((current) => ({ ...current, [messageId]: "idle" }));
    }
  }, []);

  const handleRegenerate = useCallback(() => {
    void regenerateLastAssistant();
  }, [regenerateLastAssistant]);

  const startNewChat = useCallback(() => {
    const { nextStore } = archiveCurrentConversation({
      current: {
        messages,
        conversationId,
        model: activeModel
      },
      history: historyThreads
    });

    setMessages(nextStore.current.messages);
    setConversationId(nextStore.current.conversationId);
    setActiveModel(nextStore.current.model);
    setHistoryThreads(nextStore.history);
    setPrompt("");
    setErrorMessage(null);
    setLastAttempt(null);
    setLastAssistantSnapshot(null);
    setActivePrompt(null);
    setActiveTab("chat");
  }, [messages, conversationId, activeModel, historyThreads]);

  const insertToolPrompt = useCallback((prefix: string) => {
    setPrompt((current) => {
      if (!current.trim()) return prefix;
      if (current.toLowerCase().startsWith(prefix.toLowerCase())) return current;
      return `${prefix} ${current}`.trim();
    });
  }, []);

  const chatComposer = (
    <AssistantComposer
      value={prompt}
      onChange={setPrompt}
      onQuickInsert={insertToolPrompt}
      onSubmit={() => {
        void sendPrompt(prompt);
      }}
      disabled={isSubmitting}
    />
  );

  return (
    <div className="assistant-surface relative overflow-hidden rounded-[2rem] border border-slate-200/85 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8ff_100%)] p-4 shadow-[0_32px_54px_-40px_rgba(15,23,42,0.6)] sm:p-5">
      <div className="assistant-bg-blob assistant-bg-blob-a" />
      <div className="assistant-bg-blob assistant-bg-blob-b" />
      <div className="assistant-bg-blob assistant-bg-blob-c" />

      <div className="relative z-[1] space-y-4">
        <AssistantTopBar
          activeTab={activeTab}
          historyCount={historyThreads.length}
          activeModel={activeModel}
          onSelectTab={setActiveTab}
          onNewChat={startNewChat}
        />

        {activeTab === "history" ? (
          <section className="rounded-[1.7rem] border border-slate-200/90 bg-[linear-gradient(180deg,#fbfdff_0%,#ffffff_100%)] p-4 shadow-inner shadow-slate-100/80 md:p-5">
            {historyThreads.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No previous chats yet"
                description="After you send messages, refreshed sessions will appear here."
                className="rounded-3xl border-slate-200 bg-white/80 p-8"
              />
            ) : (
              <div className="space-y-3">
                {historyThreads.map((thread) => (
                  <article
                    key={thread.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/70"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="line-clamp-1 text-sm font-semibold text-slate-800">{thread.title}</h4>
                      <span className="shrink-0 text-[11px] text-slate-500">
                        {new Date(thread.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <p className="mb-3 text-xs text-slate-500">
                      {thread.messages.length} messages{thread.model ? ` • ${thread.model}` : ""}
                    </p>
                    <div className="space-y-2.5">
                      {thread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={
                            message.role === "user"
                              ? "ml-auto max-w-[88%] rounded-2xl border border-violet-200/70 bg-violet-50/70 px-3 py-2"
                              : "max-w-[96%] rounded-2xl border border-slate-200 bg-white px-3 py-2.5"
                          }
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : messages.length === 0 && !isSubmitting ? (
          <AssistantEmptyState
            name={displayName}
            activePrompt={activePrompt}
            cards={quickPrompts}
            onSelectPrompt={(selectedPrompt) => {
              setPrompt(selectedPrompt);
              setActiveTab("chat");
              void sendPrompt(selectedPrompt);
            }}
            composer={
              <AssistantComposer
                value={prompt}
                onChange={setPrompt}
                onQuickInsert={insertToolPrompt}
                onSubmit={() => {
                  void sendPrompt(prompt);
                }}
                placeholder="What can Actify help you with today?"
                centered
                disabled={isSubmitting}
              />
            }
          />
        ) : (
          <section className="rounded-[1.7rem] border border-slate-200/90 bg-[linear-gradient(180deg,#f8faff_0%,#ffffff_100%)] p-3.5 shadow-inner shadow-slate-100/80 md:p-4">
            <div
              ref={scrollRef}
              className="h-[460px] scroll-smooth overflow-y-auto rounded-[1.35rem] border border-white/90 bg-white/72 p-3.5 md:h-[540px] md:p-4"
              aria-live="polite"
            >
              <div className="space-y-4 pb-2">
                {messages.map((message) => {
                  const isLastAssistant = message.role === "assistant" && message.id === lastAssistantMessageId;

                  return (
                    <AssistantMessage
                      key={message.id}
                      message={message}
                      isLastAssistant={isLastAssistant}
                      isLoading={isSubmitting}
                      copyState={copyStateByMessageId[message.id] || "idle"}
                      onCopy={copyMessage}
                      onRegenerate={handleRegenerate}
                    />
                  );
                })}

                {isSubmitting ? (
                  <div className="max-w-[94%] rounded-[1.5rem] border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/70">
                    <div className="mb-3 h-3 w-28 animate-pulse rounded-full bg-slate-200/70" />
                    <div className="space-y-2">
                      <div className="h-3 w-full animate-pulse rounded-full bg-slate-200/70" />
                      <div className="h-3 w-11/12 animate-pulse rounded-full bg-slate-200/70" />
                      <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-200/70" />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">Actify is thinking…</p>
                  </div>
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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

            <div className="mt-3">{chatComposer}</div>
          </section>
        )}

        <p className="text-center text-xs text-slate-500">
          Engine: <span className="font-medium text-slate-700">Mistral Agent</span>
          {activeModel ? (
            <>
              {" "}
              <span className="text-slate-400">({activeModel})</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
