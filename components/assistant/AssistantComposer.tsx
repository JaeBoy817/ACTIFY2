import { ArrowUp } from "lucide-react";

type AssistantComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  disabled = false
}: AssistantComposerProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form
      className="rounded-[1.85rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-2.5 shadow-[0_16px_42px_-28px_rgba(15,23,42,0.65)] backdrop-blur"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        onSubmit();
      }}
    >
      <label className="flex items-end gap-2.5">
        <span className="sr-only">Ask Actify Assistant</span>
        <div className="flex-1 rounded-[1.25rem] border border-slate-200/90 bg-white/90 px-3 py-2 shadow-inner shadow-slate-100/70">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={1}
            placeholder="Ask for a backup activity, note rewrite, or planning help…"
            className="min-h-[3.4rem] max-h-44 w-full resize-y bg-transparent px-1 py-1 text-[15px] leading-7 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!canSend) return;
                onSubmit();
              }
            }}
          />
          <p className="mt-1 px-1 text-[11px] text-slate-500">Press Enter to send, Shift+Enter for a new line.</p>
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
    </form>
  );
}
