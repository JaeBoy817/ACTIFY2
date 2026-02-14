import Image from "next/image";

import { cn } from "@/lib/utils";

const ACTIFY_LOGO_SRC = "/actify-logo-liquid-glass-nodots.svg";

type ActifyLogoVariant = "icon" | "lockup" | "stacked";

interface ActifyLogoProps {
  size?: number;
  variant?: ActifyLogoVariant;
  className?: string;
  "aria-label"?: string;
}

function wordmarkClass(size: number) {
  if (size >= 64) return "text-3xl";
  if (size >= 52) return "text-2xl";
  if (size >= 40) return "text-xl";
  return "text-lg";
}

export function ActifyLogo({ size = 40, variant = "lockup", className, "aria-label": ariaLabel = "ACTIFY" }: ActifyLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src={ACTIFY_LOGO_SRC}
        alt={ariaLabel}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-[22%]", className)}
      />
    );
  }

  const sharedWordmark = (
    <span className={cn("font-[var(--font-brand)] font-semibold tracking-[0.14em] text-foreground", wordmarkClass(size))}>
      ACTIFY
    </span>
  );

  if (variant === "stacked") {
    return (
      <div role="img" aria-label={ariaLabel} className={cn("inline-flex flex-col items-center gap-2", className)}>
        <Image src={ACTIFY_LOGO_SRC} alt="" aria-hidden width={size} height={size} className="shrink-0 rounded-[22%]" />
        {sharedWordmark}
      </div>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel} className={cn("inline-flex items-center gap-2", className)}>
      <Image src={ACTIFY_LOGO_SRC} alt="" aria-hidden width={size} height={size} className="shrink-0 rounded-[22%]" />
      {sharedWordmark}
    </div>
  );
}
