import { cn } from "@/lib/utils";

type InsightTone = "violet" | "sky" | "emerald" | "amber" | "rose";

const toneClassMap: Record<InsightTone, string> = {
  violet: "border-violet-300/70 bg-violet-100/80 text-violet-800",
  sky: "border-sky-300/70 bg-sky-100/80 text-sky-800",
  emerald: "border-emerald-300/70 bg-emerald-100/80 text-emerald-800",
  amber: "border-amber-300/70 bg-amber-100/80 text-amber-800",
  rose: "border-rose-300/70 bg-rose-100/80 text-rose-800"
};

export function InsightChip({
  label,
  tone = "violet"
}: {
  label: string;
  tone?: InsightTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        toneClassMap[tone]
      )}
    >
      {label}
    </span>
  );
}
