import { cn } from "@/lib/utils";

export function AttendanceMetricCard({
  label,
  value,
  helpText,
  tone = "blue"
}: {
  label: string;
  value: string;
  helpText: string;
  tone?: "blue" | "violet" | "sky" | "emerald" | "amber";
}) {
  const toneClass = {
    blue: "from-blue-500/24 via-indigo-500/12 to-transparent text-blue-100",
    violet: "from-violet-500/24 via-fuchsia-500/12 to-transparent text-violet-100",
    sky: "from-sky-500/26 via-cyan-500/12 to-transparent text-sky-100",
    emerald: "from-emerald-500/24 via-teal-500/12 to-transparent text-emerald-100",
    amber: "from-amber-500/28 via-orange-500/12 to-transparent text-amber-100"
  }[tone];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#1f3152] bg-[linear-gradient(180deg,#0a1224_0%,#0b1528_100%)] p-4 shadow-[0_18px_36px_-26px_rgba(37,99,235,0.72)]">
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b", toneClass)} />
      <div className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/10" />
      <div className="relative z-10 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9cb2d8]">{label}</p>
        <p className="text-3xl font-black leading-none text-white">{value}</p>
        <p className="text-xs text-[#9cb2d8]">{helpText}</p>
      </div>
    </article>
  );
}

