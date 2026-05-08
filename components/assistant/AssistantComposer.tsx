import { useState } from "react";
import { ArrowUp, CalendarDays, ChevronDown, FilePenLine, HeartHandshake, ScrollText, SlidersHorizontal, Square } from "lucide-react";

import {
  buildCalendarIdeasPrompt,
  buildOneToOneNotePrompt,
  buildProgressNotePrompt,
  buildRefusalNotePrompt
} from "@/lib/actifyPromptHelpers";
import { cn } from "@/lib/utils";

type AssistantComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onQuickInsert?: (value: string) => void;
  placeholder?: string;
  centered?: boolean;
  className?: string;
  hideHint?: boolean;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
};

const TOOL_PRESETS = [
  { id: "progress-note", label: "Progress Note", insert: buildProgressNotePrompt(), icon: FilePenLine },
  { id: "one-to-one-note", label: "1:1 Note", insert: buildOneToOneNotePrompt(), icon: HeartHandshake },
  { id: "refusal-note", label: "Refusal Note", insert: buildRefusalNotePrompt(), icon: ScrollText },
  { id: "calendar-ideas", label: "Calendar Ideas", insert: buildCalendarIdeasPrompt(), icon: CalendarDays }
] as const;

export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onQuickInsert,
  placeholder = "Ask for a progress note, 1:1 note, activity idea, care plan wording, or calendar help...",
  centered = false,
  className,
  hideHint = false,
  disabled = false,
  isStreaming = false,
  onStop
}: AssistantComposerProps) {
  const canSend = value.trim().length > 0 && !disabled;
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <form
      className={cn(
        "rounded-[1.85rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f9faff_58%,#f6fbff_100%)] p-3 shadow-[0_34px_60px_-42px_rgba(15,23,42,0.82)] backdrop-blur transition duration-200 focus-within:border-violet-300 focus-within:shadow-[0_36px_66px_-42px_rgba(124,58,237,0.4)]",
        centered ? "rounded-[2rem] p-3.5 md:p-4" : "",
        className
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        onSubmit();
      }}
    >
      <label className="flex items-end gap-2.5">
        <span className="sr-only">Ask Actify Assistant</span>
        <div className="flex-1 rounded-[1.35rem] border border-slate-200/90 bg-white/92 px-3 py-2.5 shadow-inner shadow-slate-100/70">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={centered ? 2 : 1}
            placeholder={placeholder}
            className={cn(
              "w-full resize-y bg-transparent px-1 py-1 text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none",
              centered ? "min-h-[5.2rem] max-h-52" : "min-h-[3.4rem] max-h-44"
            )}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!canSend) return;
                onSubmit();
              }
            }}
          />
          {!hideHint ? (
            <p className="mt-1 px-1 text-[11px] text-slate-500">Press Enter to send, Shift+Enter for a new line.</p>
          ) : null}
        </div>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-rose-300/70 bg-[linear-gradient(145deg,#7f1d1d_0%,#be123c_100%)] text-white shadow-[0_14px_28px_-18px_rgba(190,24,93,0.7)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(190,24,93,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            aria-label="Stop response"
            title="Stop response"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-sky-300/60 bg-[linear-gradient(145deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_14px_28px_-18px_rgba(14,116,144,0.75)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(14,116,144,0.85)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            aria-label="Send prompt"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="mt-3 flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => setToolsOpen((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          More tools
          <ChevronDown className={`h-3.5 w-3.5 transition ${toolsOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      {toolsOpen ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
          {TOOL_PRESETS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onQuickInsert?.(tool.insert)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tool.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </form>
  );
}
