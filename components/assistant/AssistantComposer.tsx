import { ArrowUp, CalendarDays, Paperclip, ScrollText, UsersRound } from "lucide-react";

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
};

const TOOL_PRESETS = [
  { id: "note", label: "Note Mode", insert: "Reword this note:", icon: ScrollText },
  { id: "calendar", label: "Calendar Help", insert: "Help me plan this week:", icon: CalendarDays },
  { id: "resident", label: "Residents Context", insert: "Suggest ideas for this resident:", icon: UsersRound }
] as const;

export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  onQuickInsert,
  placeholder = "Ask for activity ideas, note help, resident support, or calendar planning…",
  centered = false,
  className,
  hideHint = false,
  disabled = false
}: AssistantComposerProps) {
  const canSend = value.trim().length > 0 && !disabled;

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

        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-sky-300/60 bg-[linear-gradient(145deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_14px_28px_-18px_rgba(14,116,144,0.75)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(14,116,144,0.85)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          aria-label="Send prompt"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </label>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickInsert?.("Add context: ")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            Attach
          </button>

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

        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          Smart Mode
        </span>
      </div>
    </form>
  );
}
