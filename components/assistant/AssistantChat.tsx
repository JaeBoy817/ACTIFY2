"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { AssistantMessage } from "@/components/assistant/AssistantMessage";
import { PromptChips } from "@/components/assistant/PromptChips";
import { EmptyState } from "@/components/assistant-dashboard/EmptyState";
import { getAssistantResponseFromPrompt } from "@/lib/assistant/getAssistantResponse";
import type { AssistantResponseIntent } from "@/lib/assistant/getAssistantResponse";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  intent?: AssistantResponseIntent;
  responseId?: string;
  sourcePrompt?: string;
};

const STORAGE_KEY = "actify-assistant-chat-v3";
const MAX_MESSAGES = 24;
const RESPONSE_DELAY_MS = 180;

const QUICK_PROMPTS = [
  "Give me a 15-minute group activity for low-energy residents",
  "Write a progress note for bingo participation",
  "Reword this progress note: Resident came to bingo and played some. Needed encouragement at first but got more into it later. Was smiling and talking to other residents.",
  "Help me plan next week’s calendar",
  "Give me a 1:1 idea for a bed-bound resident",
  "Reword this 1:1 note: Met with resident in room because she didnt want to come out. We talked about her family and she looked at magazines with me. Seemed calm."
];

function safeParseStoredMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const typed = item as {
          id?: unknown;
          role?: unknown;
          text?: unknown;
          intent?: unknown;
          responseId?: unknown;
          sourcePrompt?: unknown;
        };
        const role: ChatRole = typed.role === "user" ? "user" : "assistant";
        return {
          id: typeof typed.id === "string" ? typed.id : crypto.randomUUID(),
          role,
          text: typeof typed.text === "string" ? typed.text : "",
          intent: typeof typed.intent === "string" ? (typed.intent as AssistantResponseIntent) : undefined,
          responseId: typeof typed.responseId === "string" ? typed.responseId : undefined,
          sourcePrompt: typeof typed.sourcePrompt === "string" ? typed.sourcePrompt : undefined
        } satisfies ChatMessage;
      })
      .filter((item) => item.text.trim().length > 0)
      .slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAssistantMeta, setLastAssistantMeta] = useState<{
    prompt: string;
    intent: AssistantResponseIntent;
    responseId: string;
  } | null>(null);
  const [copyStateByMessageId, setCopyStateByMessageId] = useState<Record<string, "idle" | "copied">>({});

  const scrollRef = useRef<HTMLDivElement>(null);
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

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  const waitForPolish = async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, RESPONSE_DELAY_MS);
    });
  };

  const sendPrompt = async (value: string) => {
    const content = value.trim();
    if (!content) {
      setErrorMessage("Please enter a prompt or choose a quick action.");
      return;
    }
    if (isSubmitting) return;

    const nextUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: content
    };

    setMessages((current) => [...current, nextUserMessage].slice(-MAX_MESSAGES));
    setPrompt("");
    setIsSubmitting(true);
    setErrorMessage(null);
    setActivePrompt(content);

    try {
      await waitForPolish();

      const result = getAssistantResponseFromPrompt({
        prompt: content,
        excludeResponseId: undefined
      });

      const assistantReply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: result.formattedMessage,
        intent: result.intent,
        responseId: result.responseId,
        sourcePrompt: content
      };

      setMessages((current) => [...current, assistantReply].slice(-MAX_MESSAGES));
      setLastAssistantMeta({
        prompt: content,
        intent: result.intent,
        responseId: result.responseId
      });
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

  const retryLastPrompt = async () => {
    if (!lastAssistantMeta || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setActivePrompt(lastAssistantMeta.prompt);

    try {
      await waitForPolish();

      const result = getAssistantResponseFromPrompt({
        prompt: lastAssistantMeta.prompt,
        forceIntent: lastAssistantMeta.intent,
        excludeResponseId: lastAssistantMeta.responseId
      });

      const assistantReply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: result.formattedMessage,
        intent: result.intent,
        responseId: result.responseId,
        sourcePrompt: lastAssistantMeta.prompt
      };

      setMessages((current) => [...current, assistantReply].slice(-MAX_MESSAGES));
      setLastAssistantMeta({
        prompt: lastAssistantMeta.prompt,
        intent: result.intent,
        responseId: result.responseId
      });
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
                Pulling a practical response...
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
            disabled={isSubmitting || !lastAssistantMeta}
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
        Engine: <span className="font-medium text-slate-700">Local Preset Assistant</span>
      </p>
    </div>
  );
}
