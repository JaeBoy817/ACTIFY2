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
    neutral: "border-[#2b3f68] bg-[linear-gradient(180deg,#0f1a30_0%,#0b1426_100%)] text-[#d8e6ff] hover:border-[#47669f]",
    blue: "border-blue-500/50 bg-[linear-gradient(180deg,#182a4b_0%,#11203b_100%)] text-blue-100 hover:border-blue-300/80",
    sky: "border-sky-500/50 bg-[linear-gradient(180deg,#15344f_0%,#102a41_100%)] text-sky-100 hover:border-sky-300/80",
    violet: "border-violet-500/50 bg-[linear-gradient(180deg,#2c1f4a_0%,#21173a_100%)] text-violet-100 hover:border-violet-300/80",
    emerald: "border-emerald-500/50 bg-[linear-gradient(180deg,#173a38_0%,#122f2d_100%)] text-emerald-100 hover:border-emerald-300/80",
    orange: "border-orange-500/50 bg-[linear-gradient(180deg,#472b1b_0%,#372012_100%)] text-orange-100 hover:border-orange-300/80",
    rose: "border-rose-500/50 bg-[linear-gradient(180deg,#452036_0%,#33182a_100%)] text-rose-100 hover:border-rose-300/80"
  }[tone];

  const sizeClass = size === "md" ? "h-11 px-4 text-sm" : "h-9 px-3 text-xs";

  const content = (
    <>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      <span>{label}</span>
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2 rounded-full border font-semibold tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_20px_-14px_rgba(37,99,235,0.55)] transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50",
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
