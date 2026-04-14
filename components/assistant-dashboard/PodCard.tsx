import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PodCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: "sky" | "mint" | "indigo" | "teal" | "neutral";
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
};

const toneMap: Record<NonNullable<PodCardProps["tone"]>, string> = {
  sky: "from-sky-100 via-sky-50 to-white text-sky-800",
  mint: "from-emerald-100 via-emerald-50 to-white text-emerald-800",
  indigo: "from-indigo-100 via-indigo-50 to-white text-indigo-800",
  teal: "from-teal-100 via-cyan-50 to-white text-teal-800",
  neutral: "from-slate-100 via-slate-50 to-white text-slate-700"
};

export function PodCard({
  title,
  description,
  icon: Icon,
  tone = "neutral",
  children,
  className,
  headerAction
}: PodCardProps) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-34px_rgba(15,23,42,0.4)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/70" />
      <header className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm", toneMap[tone])}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>
        {headerAction}
      </header>
      <div className="relative z-10">{children}</div>
    </article>
  );
}
