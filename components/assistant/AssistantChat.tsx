"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/assistant-dashboard/EmptyState";
import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { AssistantMessage } from "@/components/assistant/AssistantMessage";
import { PromptChips } from "@/components/assistant/PromptChips";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type AssistantApiResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  code?: string;
  model?: string;
  providerModel?: string | null;
};

const STORAGE_KEY = "actify-assistant-chat-v3";
const MAX_MESSAGES = 24;
const MAX_HISTORY_MESSAGES = 12;

const QUICK_PROMPTS = [
  "Give me a 15-minute group activity for low-energy residents",
  "Write a progress note for bingo participation",
  "Help me plan next week’s calendar",
  "Give me a 1:1 idea for a bed-bound resident",
  "Create a holiday activity backup plan"
];

function safeParseStoredMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const typed = item as { id?: unknown; role?: unknown; text?: unknown };
        const role: ChatRole = typed.role === "user" ? "user" : "assistant";
        return {
          id: typeof typed.id === "string" ? typed.id : crypto.randomUUID(),
          role,
          text: typeof typed.text === "string" ? typed.text : ""
        } satisfies ChatMessage;
      })
      .filter((item) => item.text.trim().length > 0)
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function getModeForPrompt(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("note") || normalized.includes("wording") || normalized.includes("uda")) {
    return "note_support" as const;
  }
  if (
    normalized.includes("calendar") ||
    normalized.includes("week") ||
    normalized.includes("month") ||
    normalized.includes("holiday")
  ) {
    return "calendar_planning" as const;
  }
  if (
    normalized.includes("resident") ||
    normalized.includes("bed-bound") ||
    normalized.includes("dementia") ||
    normalized.includes("1:1")
  ) {
    return "resident_support" as const;
  }
  if (normalized.includes("idea") || normalized.includes("activity") || normalized.includes("backup")) {
    return "ideas" as const;
  }
  return "general" as const;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState<string | null>(null);
  const [copyStateByMessageId, setCopyStateByMessageId] = useState<Record<string, "idle" | "copied">>({});
  const [activeModel, setActiveModel] = useState<string>("openrouter/free");

  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = safeParseStoredMessages(window.sessionStorage.getItem(STORAGE_KEY));
    if (stored.length > 0) {
      setMessages(stored);
    }
    hydratedRef.current = true;

    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  }, [messages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSubmitting, errorMessage]);

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  const sendPrompt = async (value: string) => {
    const content = value.trim();
    if (!content) {
      setErrorMessage("Please enter a prompt before sending.");
      return;
    }
    if (isSubmitting) return;

    const nextUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: content
    };
    const nextMessages = [...messages, nextUserMessage].slice(-MAX_MESSAGES);

    setMessages(nextMessages);
    setPrompt("");
    setIsSubmitting(true);
    setErrorMessage(null);
    setLastSubmittedPrompt(content);
    setActivePrompt(content);

    const conversationHistory = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.text
      }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: content,
          conversationHistory,
          mode: getModeForPrompt(content)
        }),
        signal: controller.signal
      });

      const payload = (await response.json().catch(() => null)) as AssistantApiResponse | null;

      if (!response.ok || !payload?.ok || !payload.message) {
        const detail = payload?.error || "We couldn’t generate a response right now. Please try again.";
        throw new Error(payload?.code ? `${detail} (${payload.code})` : detail);
      }

      setMessages((current) => {
        const assistantReply = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: payload.message ?? ""
        } satisfies ChatMessage;

        return [...current, assistantReply].slice(-MAX_MESSAGES);
      });
      setActiveModel(payload.providerModel || payload.model || "openrouter/free");
    } catch (error) {
      if (controller.signal.aborted) {
        setErrorMessage("The assistant is taking a little longer than expected.");
      } else if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("We couldn’t generate a response right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
      setActivePrompt(null);
      abortRef.current = null;
    }
  };

  const retryLastPrompt = async () => {
    if (!lastSubmittedPrompt || isSubmitting) return;
    await sendPrompt(lastSubmittedPrompt);
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
        onPickPrompt={(selectedPrompt) => setPrompt(selectedPrompt)}
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
            description="Ask for activity ideas, notes, planning support, or resident-focused suggestions."
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
                    void retryLastPrompt();
                  }}
                />
              );
            })}

            {isSubmitting ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Generating a practical response...
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
              void retryLastPrompt();
            }}
            disabled={isSubmitting || !lastSubmittedPrompt}
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
        Model: <span className="font-medium text-slate-700">{activeModel}</span>
      </p>
    </div>
  );
}
