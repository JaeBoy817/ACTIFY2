"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Clipboard,
  Loader2,
  OctagonX,
  RefreshCcw,
  Sparkles
} from "lucide-react";

import { EmptyState } from "@/components/assistant-dashboard/EmptyState";
import { PromptChip } from "@/components/assistant-dashboard/PromptChip";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

const STORAGE_KEY = "actify-assistant-chat-v2";
const MAX_MESSAGES = 24;

const QUICK_PROMPTS = [
  "Give me a 15-minute backup activity for low-energy residents",
  "Write a progress note for bingo participation with moderate engagement",
  "Give me 1:1 ideas for a bed-bound resident who likes country music",
  "Help me fill 5 empty calendar days for next month",
  "Create a low-budget themed week for spring"
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

function extractDelta(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const maybeChoices = (payload as { choices?: unknown }).choices;
  if (Array.isArray(maybeChoices) && maybeChoices.length > 0) {
    const delta = (maybeChoices[0] as { delta?: { content?: unknown } })?.delta?.content;
    if (typeof delta === "string") return delta;
    if (Array.isArray(delta)) {
      return delta
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
  }

  const maybeDelta = (payload as { delta?: unknown }).delta;
  if (typeof maybeDelta === "string") return maybeDelta;
  return "";
}

function toApiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "assistant" || message.role === "user")
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.text
    }));
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState<string | null>(null);
  const [copyStateByMessageId, setCopyStateByMessageId] = useState<Record<string, "idle" | "copied">>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const stored = safeParseStoredMessages(window.sessionStorage.getItem(STORAGE_KEY));
    if (stored.length > 0) {
      setMessages(stored);
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  }, [messages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSubmitting, errorMessage]);

  const canSubmit = prompt.trim().length > 0 && !isSubmitting;
  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  const startGeneration = async (baseMessages: ChatMessage[], sourcePrompt: string) => {
    const assistantMessageId = crypto.randomUUID();
    setMessages([...baseMessages, { id: assistantMessageId, role: "assistant", text: "" }]);
    setIsSubmitting(true);
    setErrorMessage(null);
    setLastSubmittedPrompt(sourcePrompt);
    setActivePrompt(sourcePrompt);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "general_assistant",
          messages: toApiMessages(baseMessages)
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.error || "Something went wrong generating that response. Please try again.";
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Something went wrong generating that response. Please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;

          const parsed = JSON.parse(data);
          const delta = extractDelta(parsed);
          if (!delta) continue;

          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, text: `${message.text}${delta}` }
                : message
            )
          );
        }
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId && !message.text.trim()
            ? {
                ...message,
                text: "I wasn’t able to generate a response yet. Try running that prompt again."
              }
            : message
        )
      );
    } catch (error) {
      if (controller.signal.aborted) {
        setErrorMessage("Generation stopped. You can retry whenever you’re ready.");
      } else {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong generating that response. Please try again.";
        setErrorMessage(message);
      }

      setMessages((current) =>
        current.filter((message) => !(message.id === assistantMessageId && !message.text.trim()))
      );
    } finally {
      abortRef.current = null;
      setIsSubmitting(false);
      setActivePrompt(null);
    }
  };

  const submitPrompt = async (value: string) => {
    const content = value.trim();
    if (!content || isSubmitting) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: content
    };
    const nextBaseMessages = [...messages, userMessage].slice(-MAX_MESSAGES);
    setPrompt("");
    await startGeneration(nextBaseMessages, content);
  };

  const retryLastPrompt = async () => {
    if (isSubmitting || !lastSubmittedPrompt) return;
    await startGeneration(messages.slice(-MAX_MESSAGES), lastSubmittedPrompt);
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
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
      <div className="flex flex-wrap gap-2" aria-label="Quick prompts">
        {quickPrompts.map((chip) => (
          <PromptChip
            key={chip}
            label={chip}
            active={activePrompt === chip}
            onClick={() => setPrompt(chip)}
          />
        ))}
      </div>

      <div
        ref={scrollRef}
        className="h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/80 p-3 md:h-[500px]"
        aria-live="polite"
      >
        {messages.length === 0 && !isSubmitting ? (
          <EmptyState
            icon={Sparkles}
            title="What do you need help with today?"
            description="Ask for activity ideas, note drafts, planning support, or resident-specific engagement suggestions."
          />
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant";
              const isLastAssistant =
                isAssistant &&
                messages
                  .slice(index + 1)
                  .every((later) => later.role !== "assistant");

              return (
                <article
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-sky-200 bg-sky-50 px-3 py-2.5"
                      : "max-w-[92%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2.5"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {message.text}
                  </p>
                  {isAssistant ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyMessage(message.id, message.text)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        <Clipboard className="h-3.5 w-3.5" aria-hidden />
                        {copyStateByMessageId[message.id] === "copied" ? "Copied" : "Copy Response"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        Use in Note Studio
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        Send to Calendar Builder
                      </button>
                      {isLastAssistant ? (
                        <button
                          type="button"
                          onClick={retryLastPrompt}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                          Regenerate
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}

            {isSubmitting ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
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
            onClick={retryLastPrompt}
            disabled={isSubmitting || !lastSubmittedPrompt}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </div>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitPrompt(prompt);
        }}
      >
        <label className="flex-1">
          <span className="sr-only">Ask Actify Assistant</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={2}
            placeholder="Ask for activity ideas, notes, planning help, and resident support."
            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.8)] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          />
        </label>

        {isSubmitting ? (
          <button
            type="button"
            onClick={stopGeneration}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            aria-label="Stop generation"
          >
            <OctagonX className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_30px_-20px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Send prompt"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
