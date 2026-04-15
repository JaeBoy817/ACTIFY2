import { Sparkles } from "lucide-react";

export function AIActionButton({
  label,
  description,
  onClick,
  compact = false
}: {
  label: string;
  description?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-teal-200 bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md hover:shadow-teal-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold text-slate-800">{label}</span>
          {!compact && description ? <span className="mt-0.5 block text-xs text-slate-600">{description}</span> : null}
        </span>
      </div>
    </button>
  );
}
