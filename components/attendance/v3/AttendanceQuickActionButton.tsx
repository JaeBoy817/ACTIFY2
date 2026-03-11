import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AttendanceQuickActionButtonProps = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  tone?: "neutral" | "blue" | "sky" | "violet" | "emerald" | "amber" | "rose";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
};

const TONE_CLASS: Record<NonNullable<AttendanceQuickActionButtonProps["tone"]>, string> = {
  neutral: "border-[#2d3f66] bg-[#101b32] text-[#d6e5ff] hover:border-[#4e6da8] hover:bg-[#13223e]",
  blue: "border-blue-500/45 bg-[#122446] text-blue-100 hover:border-blue-300/70 hover:bg-[#17305a]",
  sky: "border-sky-500/45 bg-[#112b46] text-sky-100 hover:border-sky-300/70 hover:bg-[#17385a]",
  violet: "border-violet-500/45 bg-[#22163d] text-violet-100 hover:border-violet-300/70 hover:bg-[#2c1f4d]",
  emerald: "border-emerald-500/45 bg-[#113430] text-emerald-100 hover:border-emerald-300/70 hover:bg-[#16433d]",
  amber: "border-amber-500/45 bg-[#3c2a13] text-amber-100 hover:border-amber-300/70 hover:bg-[#4b3317]",
  rose: "border-rose-500/45 bg-[#3a1a2a] text-rose-100 hover:border-rose-300/70 hover:bg-[#472036]"
};

export function AttendanceQuickActionButton({
  label,
  icon: Icon,
  href,
  onClick,
  tone = "neutral",
  size = "sm",
  disabled,
  className
}: AttendanceQuickActionButtonProps) {
  const sharedClassName = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold tracking-[0.01em] transition duration-200",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_24px_-20px_rgba(37,99,235,0.62)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/45",
    "disabled:cursor-not-allowed disabled:opacity-55",
    size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
    TONE_CLASS[tone],
    className
  );

  const content = (
    <>
      {Icon ? <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden /> : null}
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={sharedClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={sharedClassName} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
