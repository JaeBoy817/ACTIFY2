import { cn } from "@/lib/utils";

type ActivityTagProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function ActivityTag({ label, active = false, onClick }: ActivityTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1",
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
