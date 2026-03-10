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
    neutral: "border-[#3a4364] bg-[linear-gradient(180deg,#171f33_0%,#121b2d_100%)] text-[#d8e3ff] hover:border-[#55608d]",
    blue: "border-blue-500/50 bg-[linear-gradient(180deg,#1d2b4d_0%,#15213c_100%)] text-blue-100 hover:border-blue-400/70",
    sky: "border-sky-500/50 bg-[linear-gradient(180deg,#1a2f45_0%,#112437_100%)] text-sky-100 hover:border-sky-400/70",
    violet: "border-violet-500/50 bg-[linear-gradient(180deg,#2a2247_0%,#1e1838_100%)] text-violet-100 hover:border-violet-400/75",
    emerald: "border-emerald-500/45 bg-[linear-gradient(180deg,#1a302a_0%,#142721_100%)] text-emerald-100 hover:border-emerald-400/70",
    orange: "border-orange-500/45 bg-[linear-gradient(180deg,#35261f_0%,#2a1f18_100%)] text-orange-100 hover:border-orange-400/75",
    rose: "border-rose-500/45 bg-[linear-gradient(180deg,#34202a_0%,#271924_100%)] text-rose-100 hover:border-rose-400/75"
  }[tone];

  const sizeClass = size === "md" ? "h-11 px-4 text-sm" : "h-9 px-3 text-xs";

  const content = (
    <>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      <span>{label}</span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2 rounded-full border font-semibold tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-14px_rgba(99,102,241,0.65)] transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
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
