import { cn } from "@/lib/utils";

export function GlowCard({
  title,
  subtitle,
  action,
  accent,
  className,
  bodyClassName,
  children
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  accent?: "blue" | "violet" | "sky" | "emerald" | "rose" | "amber" | "zinc";
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const accentClass = {
    blue: "from-emerald-500/28 via-emerald-400/12 to-transparent",
    violet: "from-emerald-500/24 via-teal-400/10 to-transparent",
    sky: "from-teal-500/26 via-emerald-500/12 to-transparent",
    emerald: "from-emerald-500/24 via-teal-500/10 to-transparent",
    rose: "from-emerald-500/20 via-lime-500/10 to-transparent",
    amber: "from-lime-500/24 via-emerald-500/10 to-transparent",
    zinc: "from-emerald-400/16 via-emerald-500/8 to-transparent"
  }[accent ?? "blue"];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.7rem] border border-emerald-900/65 bg-[linear-gradient(180deg,#0b1712_0%,#09130f_100%)] shadow-[0_26px_50px_-34px_rgba(2,6,23,0.95),0_14px_34px_-28px_rgba(16,185,129,0.36)]",
        className
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b", accentClass)} />
      <div className="pointer-events-none absolute inset-[1px] rounded-[1.65rem] border border-white/6" />
      <div className="relative z-10 p-5 md:p-6">
        {title || subtitle || action ? (
          <header className="mb-4 flex items-start justify-between gap-3">
            <div>
              {subtitle ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">{subtitle}</p>
              ) : null}
              {title ? <h2 className="mt-1 text-lg font-bold text-white">{title}</h2> : null}
            </div>
            {action ? <div>{action}</div> : null}
          </header>
        ) : null}
        <div className={cn("space-y-3", bodyClassName)}>{children}</div>
      </div>
    </section>
  );
}
