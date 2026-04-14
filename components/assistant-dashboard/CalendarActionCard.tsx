import { cn } from "@/lib/utils";

type CalendarActionCardProps = {
  title: string;
  hint: string;
  active?: boolean;
  onClick?: () => void;
};

export function CalendarActionCard({ title, hint, active = false, onClick }: CalendarActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-3 py-2.5 text-left transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1",
        active
          ? "border-indigo-300 bg-indigo-50 shadow-[0_16px_30px_-26px_rgba(79,70,229,0.9)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{hint}</p>
    </button>
  );
}
