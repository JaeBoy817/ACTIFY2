"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

interface HeroHeadlineProps {
  text: string;
  className?: string;
}

export function HeroHeadline({ text, className }: HeroHeadlineProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <h1 className={cn("text-reveal-fallback", className)}>
        {text}
      </h1>
    );
  }

  return (
    <h1 className={cn("headline-mask-reveal", className)}>
      <span className="headline-mask-inner">{text}</span>
      <span aria-hidden className="headline-cursor" />
    </h1>
  );
}
