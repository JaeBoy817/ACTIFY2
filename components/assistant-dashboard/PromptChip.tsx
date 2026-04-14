import { cn } from "@/lib/utils";

type PromptChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function PromptChip({ label, active = false, onClick }: PromptChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1",
        active
          ? "border-sky-300 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}
