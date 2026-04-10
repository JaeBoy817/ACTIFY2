import Link from "next/link";

import { cn } from "@/lib/utils";

type MarketingAuthCtasProps = {
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  primaryHref?: string;
  secondaryHref?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  size?: "sm" | "md";
  align?: "start" | "center";
};

const BASE_PRIMARY =
  "inline-flex items-center justify-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/85 to-blue-600/85 font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

const BASE_SECONDARY =
  "inline-flex items-center justify-center rounded-full border border-slate-500 bg-slate-900/90 font-semibold text-slate-100 transition hover:border-slate-300 hover:bg-slate-800/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300";

const SIZE_CLASS: Record<NonNullable<MarketingAuthCtasProps["size"]>, string> = {
  sm: "h-10 px-4 text-xs uppercase tracking-[0.12em]",
  md: "h-11 px-5 text-sm"
};

export function MarketingAuthCtas({
  className,
  primaryClassName,
  secondaryClassName,
  primaryHref = "/sign-up",
  secondaryHref = "/sign-in",
  primaryLabel = "Sign Up",
  secondaryLabel = "Sign In",
  size = "md",
  align = "start"
}: MarketingAuthCtasProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", align === "center" ? "justify-center" : "justify-start", className)}>
      <Link href={primaryHref} className={cn(BASE_PRIMARY, SIZE_CLASS[size], primaryClassName)}>
        {primaryLabel}
      </Link>
      <Link href={secondaryHref} className={cn(BASE_SECONDARY, SIZE_CLASS[size], secondaryClassName)}>
        {secondaryLabel}
      </Link>
    </div>
  );
}
