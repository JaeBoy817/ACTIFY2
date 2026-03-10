import { cn } from "@/lib/utils";

export function GlowCard({
  title,
  subtitle,
  action,
  icon,
  accent,
  className,
  bodyClassName,
  children
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "blue" | "violet" | "sky" | "emerald" | "rose" | "amber" | "zinc";
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const accentClass = {
    blue: "from-blue-500/26 via-indigo-500/12 to-transparent",
    violet: "from-violet-500/24 via-fuchsia-500/12 to-transparent",
    sky: "from-cyan-500/24 via-blue-500/12 to-transparent",
    emerald: "from-emerald-500/24 via-teal-500/12 to-transparent",
    rose: "from-rose-500/24 via-orange-500/12 to-transparent",
    amber: "from-amber-500/26 via-yellow-500/12 to-transparent",
    zinc: "from-zinc-500/20 via-slate-500/10 to-transparent"
  }[accent ?? "blue"];

  const iconToneClass = {
    blue: "from-blue-400 to-indigo-500 text-white shadow-blue-600/35",
    violet: "from-violet-400 to-fuchsia-500 text-white shadow-violet-600/35",
    sky: "from-cyan-400 to-blue-500 text-white shadow-cyan-600/35",
    emerald: "from-emerald-400 to-teal-500 text-white shadow-emerald-600/35",
    rose: "from-rose-400 to-orange-500 text-white shadow-rose-600/35",
    amber: "from-amber-300 to-orange-400 text-zinc-950 shadow-amber-500/35",
    zinc: "from-zinc-300 to-zinc-500 text-zinc-950 shadow-zinc-600/30"
  }[accent ?? "blue"];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.7rem] border border-[#1f2f4f] bg-[linear-gradient(180deg,#091021_0%,#080d19_100%)] shadow-[0_28px_56px_-34px_rgba(2,6,23,0.95),0_16px_40px_-30px_rgba(59,130,246,0.42)]",
        className
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b", accentClass)} />
      <div className="pointer-events-none absolute inset-[1px] rounded-[1.65rem] border border-white/8" />
      <div className="relative z-10 p-5 md:p-6">
        {title || subtitle || action ? (
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {icon ? (
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-[0_10px_24px_-14px]",
                    iconToneClass
                  )}
                >
                  {icon}
                </span>
              ) : null}
              <div>
                {subtitle ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fb4da]">{subtitle}</p>
                ) : null}
                {title ? <h2 className="mt-1 text-lg font-bold text-white">{title}</h2> : null}
              </div>
            </div>
            {action ? <div>{action}</div> : null}
          </header>
        ) : null}
        <div className={cn("space-y-3", bodyClassName)}>{children}</div>
      </div>
    </section>
  );
}
