import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function IconBadge({
  icon: Icon,
  className,
  tone = "blue",
  gradientClassName
}: {
  icon: LucideIcon;
  className?: string;
  tone?: "blue" | "mint" | "violet" | "amber" | "rose" | "slate";
  gradientClassName?: string;
}) {
  const toneClass =
    gradientClassName ??
    (tone === "mint"
      ? "from-emerald-400/35 to-cyan-300/10 text-emerald-700"
      : tone === "violet"
        ? "from-violet-400/35 to-fuchsia-300/10 text-violet-700"
        : tone === "amber"
          ? "from-amber-400/35 to-orange-300/10 text-amber-700"
          : tone === "rose"
            ? "from-rose-400/35 to-pink-300/10 text-rose-700"
            : tone === "slate"
              ? "from-slate-400/35 to-slate-300/10 text-slate-700"
              : "from-sky-400/35 to-indigo-300/10 text-sky-700");

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)]",
        toneClass,
        className
      )}
      aria-hidden
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
