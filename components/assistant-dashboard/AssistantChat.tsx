"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/assistant-dashboard/EmptyState";
import { PromptChip } from "@/components/assistant-dashboard/PromptChip";
import type { AssistantMessage } from "@/components/assistant-dashboard/types";

const QUICK_PROMPTS = [
  "Give me a 15-minute group activity for low-energy residents",
  "Write a progress note for bingo participation",
  "Help me plan next week’s calendar",
  "Give me a 1:1 idea for a bed-bound resident",
  "Create a holiday activity backup plan"
];

const EXAMPLE_RESPONSES = [
  "Music Match Mini-Round: Pair residents into teams and use short 30-second clips to spark memory and conversation.",
  "Progress note draft with mood, cueing level, response, and follow-up phrasing already structured.",
  "Week theme option: Spring Story Week with daily low-budget alternates in case attendance dips."
];

function createAssistantResponse(prompt: string): AssistantMessage {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("progress note") || normalized.includes("note")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "Here’s a polished draft you can edit and paste into your charting system:",
      bullets: [
        "Resident attended bingo group for 35 minutes with moderate verbal cueing.",
        "Affect remained calm and engaged throughout activity; resident responded positively to peer interaction.",
        "Follow-up: Offer afternoon social groups this week to support continued engagement."
      ],
      tags: ["Progress Note", "Moderate participation", "Follow-up included"]
    };
  }

  if (normalized.includes("calendar") || normalized.includes("week")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "Next-week planning structure ready. You can copy this straight into your planning worksheet:",
      bullets: [
        "Monday: Music & Movement warmup + seated rhythm circles",
        "Wednesday: Memory lane trivia with sensory objects",
        "Friday: Card social with one-to-one backup bins for low turnout"
      ],
      tags: ["Themed week", "Backup ideas", "Low mental load"]
    };
  }

  if (normalized.includes("bed-bound") || normalized.includes("1:1")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "Try this 1:1 bedside sequence designed for low-energy residents:",
      bullets: [
        "2 minutes: preferred music intro with conversational prompt",
        "8 minutes: choice-based sensory activity (fabric cards, scent jar, photo card)",
        "5 minutes: short reflection and positive close to reinforce participation"
      ],
      tags: ["1:1 support", "Bedside-ready", "Sensory-friendly"]
    };
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    text: "Great prompt. Here’s a fast, practical starting structure:",
    bullets: [
      "Lead with one low-friction option and one higher-energy option.",
      "Document resident response in plain language with cueing and mood.",
      "End with one follow-up step so tomorrow starts easier."
    ],
    tags: ["Practical", "Ready to use"]
  };
}

export function AssistantChat() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSend = prompt.trim().length > 0 && !isLoading;

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const quickPrompts = useMemo(() => QUICK_PROMPTS, []);

  const submitPrompt = (nextPrompt?: string) => {
    const content = (nextPrompt ?? prompt).trim();
    if (!content || isLoading) return;

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        text: content
      }
    ]);
    setPrompt("");
    setIsLoading(true);
    setActivePrompt(content);

    window.setTimeout(() => {
      setMessages((current) => [...current, createAssistantResponse(content)]);
      setIsLoading(false);
      setActivePrompt(null);
    }, 640);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Quick prompts">
        {quickPrompts.map((chip) => (
          <PromptChip key={chip} label={chip} active={activePrompt === chip} onClick={() => setPrompt(chip)} />
        ))}
      </div>

      <div
        ref={scrollRef}
        className="h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/80 p-3 md:h-[500px]"
        aria-live="polite"
      >
        {messages.length === 0 && !isLoading ? (
          <div className="space-y-3">
            <EmptyState
              icon={Sparkles}
              title="What do you need help with today?"
              description="Ask for activity ideas, note drafts, planning support, or quick resident-focused suggestions."
            />
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Example responses</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {EXAMPLE_RESPONSES.map((example) => (
                  <li key={example} className="rounded-xl bg-white px-3 py-2 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.7)]">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-sky-200 bg-sky-50 px-3 py-2.5"
                    : "max-w-[90%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2.5"
                }
              >
                <p className="text-sm leading-relaxed text-slate-800">{message.text}</p>
                {message.bullets?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {message.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {message.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {isLoading ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Thinking through a practical draft...
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submitPrompt();
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
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_30px_-20px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          aria-label="Send prompt"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
