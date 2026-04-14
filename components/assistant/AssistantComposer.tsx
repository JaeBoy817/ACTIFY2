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
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        onSubmit();
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Ask Actify Assistant</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={2}
          placeholder="Ask for activity ideas, notes, planning help, and resident support."
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.8)] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!canSend) return;
              onSubmit();
            }
          }}
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
  );
}
