import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TopContentHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accentGradientClasses?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function TopContentHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  accentGradientClasses,
  actions,
  children,
  className
}: TopContentHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.8rem] border border-[#2a3f67] bg-[linear-gradient(180deg,#091327_0%,#0b1428_46%,#090f1f_100%)] p-4 shadow-[0_32px_52px_-36px_rgba(37,99,235,0.65)] md:p-5",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-[1px] rounded-[1.7rem] border border-white/10" />
      <div className="pointer-events-none absolute inset-x-4 top-2 h-6 rounded-full bg-blue-300/10 blur-md" />
      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
                  accentGradientClasses ?? "from-cyan-300 to-blue-500"
                )}
              >
                <Icon className="h-5 w-5 text-zinc-950" />
              </span>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9bb3db]">{eyebrow}</p>
              ) : null}
              <h1 className="mt-1 truncate text-3xl font-black leading-none text-white md:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-3xl text-sm text-[#bdd0f0]">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
