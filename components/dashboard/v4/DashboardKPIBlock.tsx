import { GlowProgressBar } from "@/components/dashboard/v4/GlowProgressBar";
import { cn } from "@/lib/utils";

export function DashboardKPIBlock({
  label,
  value,
  helper,
  progress,
  tone = "blue",
  className
}: {
  label: string;
  value: string | number;
  helper?: string;
  progress?: number;
  tone?: "blue" | "violet" | "sky" | "emerald" | "orange" | "rose";
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-[#2c395b] bg-[linear-gradient(180deg,#111a2f_0%,#0f1628_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8ea4cf]">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[#8ca0c7]">{helper}</p> : null}
      {typeof progress === "number" ? <GlowProgressBar value={progress} tone={tone} className="mt-3" /> : null}
    </article>
  );
}
