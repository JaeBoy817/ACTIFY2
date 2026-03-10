import { GlowProgressBar } from "@/components/dashboard/v4/GlowProgressBar";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DashboardKPIBlock({
  label,
  value,
  helper,
  progress,
  icon: Icon,
  tone = "blue",
  className
}: {
  label: string;
  value: string | number;
  helper?: string;
  progress?: number;
  icon?: LucideIcon;
  tone?: "blue" | "violet" | "sky" | "emerald" | "orange" | "rose";
  className?: string;
}) {
  const iconTone = {
    blue: "from-blue-400 to-indigo-500 shadow-blue-600/30",
    violet: "from-violet-400 to-fuchsia-500 shadow-violet-600/30",
    sky: "from-sky-400 to-cyan-500 shadow-sky-600/30",
    emerald: "from-emerald-400 to-teal-500 shadow-emerald-600/30",
    orange: "from-orange-400 to-amber-500 shadow-orange-600/30",
    rose: "from-rose-400 to-pink-500 shadow-rose-600/30"
  }[tone];

  return (
    <article
      className={cn(
        "rounded-2xl border border-[#2b3e68] bg-[linear-gradient(180deg,#111c34_0%,#0e172d_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">{label}</p>
        {Icon ? (
          <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-[0_10px_18px_-12px]", iconTone)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-3xl font-black leading-none text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[#8ca0c7]">{helper}</p> : null}
      {typeof progress === "number" ? <GlowProgressBar value={progress} tone={tone} className="mt-3" /> : null}
    </article>
  );
}
