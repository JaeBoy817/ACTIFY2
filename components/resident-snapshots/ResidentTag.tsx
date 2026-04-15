import { cn } from "@/lib/utils";

export function ResidentTag({
  label,
  tone = "neutral",
  className
}: {
  label: string;
  tone?: "neutral" | "accent" | "soft";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tone === "accent" && "border-teal-200 bg-teal-50 text-teal-700",
        tone === "soft" && "border-slate-200 bg-slate-50 text-slate-600",
        tone === "neutral" && "border-slate-200 bg-white text-slate-700",
        className
      )}
    >
      {label}
    </span>
  );
}
