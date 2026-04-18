import Image from "next/image";

import {
  ACTIFY_LOGO_ASPECT_RATIO,
  ACTIFY_LOGO_HEIGHT,
  ACTIFY_LOGO_SRC,
  ACTIFY_LOGO_WIDTH
} from "@/lib/branding/constants";
import { cn } from "@/lib/utils";

export type ActifyLogoVariant = "icon" | "lockup" | "stacked";

export interface ActifyLogoProps {
  size?: number;
  variant?: ActifyLogoVariant;
  showWordmark?: boolean;
  className?: string;
  imageClassName?: string;
  wordmarkClassName?: string;
  priority?: boolean;
  "aria-label"?: string;
}

function wordmarkClass(size: number) {
  if (size >= 64) return "text-3xl";
  if (size >= 52) return "text-2xl";
  if (size >= 40) return "text-xl";
  return "text-lg";
}

function getImageSizeFromHeight(height: number) {
  return {
    width: Math.max(1, Math.round(height * ACTIFY_LOGO_ASPECT_RATIO)),
    height
  };
}

function LogoImage({
  size,
  priority,
  className,
  alt
}: {
  size: number;
  priority?: boolean;
  className?: string;
  alt: string;
}) {
  const dimensions = getImageSizeFromHeight(size);

  return (
    <Image
      src={ACTIFY_LOGO_SRC}
      alt={alt}
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      sizes={`${dimensions.width}px`}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
    />
  );
}

export function ActifyLogo({
  size = 40,
  variant = "lockup",
  showWordmark,
  className,
  imageClassName,
  wordmarkClassName,
  priority = false,
  "aria-label": ariaLabel = "ACTIFY"
}: ActifyLogoProps) {
  const showText = showWordmark ?? variant !== "icon";
  const logoImage = (
    <LogoImage
      size={size}
      priority={priority}
      className={imageClassName}
      alt={!showText ? ariaLabel : ""}
    />
  );

  const sharedWordmark = (
    <span
      className={cn(
        "font-[var(--font-brand)] font-semibold tracking-[0.14em] text-foreground",
        wordmarkClass(size),
        wordmarkClassName
      )}
    >
      ACTIFY
    </span>
  );

  if (!showText) {
    return (
      <span
        role="img"
        aria-label={ariaLabel}
        className={cn("inline-flex items-center justify-center", className)}
      >
        {logoImage}
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span
        role="img"
        aria-label={ariaLabel}
        className={cn("inline-flex flex-col items-center gap-2", className)}
      >
        {logoImage}
        {sharedWordmark}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-2", className)}
    >
      {logoImage}
      {sharedWordmark}
    </span>
  );
}

export const ACTIFY_LOGO_DIMENSIONS = {
  width: ACTIFY_LOGO_WIDTH,
  height: ACTIFY_LOGO_HEIGHT
};
