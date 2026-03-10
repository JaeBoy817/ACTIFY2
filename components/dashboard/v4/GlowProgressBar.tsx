import { cn } from "@/lib/utils";

export function GlowProgressBar({
  value,
  tone = "blue",
  className
}: {
  value: number;
  tone?: "blue" | "violet" | "sky" | "emerald" | "orange" | "rose";
  className?: string;
}) {
  const palette = {
    blue: "from-emerald-300 via-teal-400 to-emerald-500",
    violet: "from-emerald-300 via-emerald-400 to-teal-500",
    sky: "from-teal-300 via-emerald-400 to-teal-500",
    emerald: "from-emerald-300 via-teal-400 to-emerald-500",
    orange: "from-lime-300 via-emerald-400 to-lime-500",
    rose: "from-emerald-300 via-lime-400 to-emerald-500"
  }[tone];

  const width = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("h-2.5 w-full rounded-full bg-[#0a130f] ring-1 ring-emerald-900/50", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_rgba(16,185,129,0.45)] transition-all duration-500", palette)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
