import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PremiumPillButtonProps = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "blue" | "sky" | "violet" | "emerald" | "orange" | "rose";
  size?: "sm" | "md";
  buttonType?: "button" | "submit" | "reset";
  className?: string;
};

export function PremiumPillButton({
  label,
  href,
  icon: Icon,
  tone = "neutral",
  size = "sm",
  buttonType = "button",
  className
}: PremiumPillButtonProps) {
  const toneClass = {
    neutral: "border-emerald-900/65 bg-[linear-gradient(180deg,#10231b_0%,#0d1d16_100%)] text-emerald-50 hover:border-emerald-600/55",
    blue: "border-emerald-500/50 bg-[linear-gradient(180deg,#173328_0%,#13291f_100%)] text-emerald-100 hover:border-emerald-400/70",
    sky: "border-teal-500/50 bg-[linear-gradient(180deg,#16342c_0%,#12281f_100%)] text-teal-100 hover:border-teal-400/70",
    violet: "border-emerald-500/45 bg-[linear-gradient(180deg,#153126_0%,#11261d_100%)] text-emerald-100 hover:border-emerald-300/75",
    emerald: "border-emerald-500/45 bg-[linear-gradient(180deg,#1a302a_0%,#142721_100%)] text-emerald-100 hover:border-emerald-400/70",
    orange: "border-lime-500/45 bg-[linear-gradient(180deg,#25311f_0%,#1e2718_100%)] text-lime-100 hover:border-lime-400/75",
    rose: "border-emerald-500/45 bg-[linear-gradient(180deg,#193025_0%,#14261e_100%)] text-emerald-100 hover:border-emerald-300/75"
  }[tone];

  const sizeClass = size === "md" ? "h-11 px-4 text-sm" : "h-9 px-3 text-xs";

  const content = (
    <>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      <span>{label}</span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2 rounded-full border font-semibold tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-14px_rgba(16,185,129,0.5)] transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
    sizeClass,
    toneClass,
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={buttonType} className={classes}>
      {content}
    </button>
  );
}
