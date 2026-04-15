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
      className="rounded-[1.65rem] border border-slate-200 bg-white p-2 shadow-[0_20px_34px_-30px_rgba(15,23,42,0.85)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        onSubmit();
      }}
    >
      <label className="flex items-end gap-2">
        <span className="sr-only">Ask Actify Assistant</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          placeholder="Ask for activity ideas, notes, planning help, and resident support."
          className="min-h-[3rem] max-h-40 w-full resize-y rounded-[1.15rem] border border-transparent bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!canSend) return;
              onSubmit();
            }
          }}
        />

        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.95)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          aria-label="Send prompt"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </label>
    </form>
  );
}
