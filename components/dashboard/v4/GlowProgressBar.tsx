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
    blue: "from-blue-300 via-indigo-400 to-blue-500",
    violet: "from-violet-300 via-fuchsia-400 to-violet-500",
    sky: "from-cyan-300 via-sky-400 to-blue-500",
    emerald: "from-emerald-300 via-teal-400 to-emerald-500",
    orange: "from-amber-300 via-orange-400 to-rose-500",
    rose: "from-rose-300 via-pink-400 to-rose-500"
  }[tone];

  const width = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("h-2.5 w-full rounded-full bg-[#0a1222] ring-1 ring-[#2a3b63]/80", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r shadow-[0_0_14px_rgba(59,130,246,0.55)] transition-all duration-500", palette)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
