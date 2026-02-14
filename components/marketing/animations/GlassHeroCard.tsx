"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

type GlassHeroCardProps = {
  children: React.ReactNode;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function GlassHeroCard({ children, className }: GlassHeroCardProps) {
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();
  const frameRef = useRef<number | null>(null);
  const [isDesktopPointer, setIsDesktopPointer] = useState(false);
  const [highlightOffset, setHighlightOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) {
      setIsDesktopPointer(false);
      return;
    }

    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setIsDesktopPointer(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [reducedMotion]);

  const updateHighlightOffset = useCallback((x: number, y: number) => {
    setHighlightOffset({ x, y });
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDesktopPointer || reducedMotion) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      const nextX = clamp(px * 10, -10, 10);
      const nextY = clamp(py * 10, -10, 10);

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => updateHighlightOffset(nextX, nextY));
    },
    [isDesktopPointer, reducedMotion, updateHighlightOffset]
  );

  const handlePointerLeave = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    updateHighlightOffset(0, 0);
  }, [updateHighlightOffset]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <motion.div
      className={cn("relative overflow-hidden", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      animate={
        reducedMotion || !isPageVisible
          ? { scale: 1, opacity: 1 }
          : {
              scale: [1, 1.012, 1],
              opacity: [1, 0.985, 1]
            }
      }
      transition={
        reducedMotion || !isPageVisible
          ? { duration: 0.2 }
          : { duration: 7.5, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {!reducedMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-[-25%] z-0 rounded-[26px]"
          animate={
            isPageVisible
              ? {
                  x: [-22 + highlightOffset.x, 20 + highlightOffset.x, -22 + highlightOffset.x],
                  y: [highlightOffset.y, highlightOffset.y * 0.6, highlightOffset.y],
                  opacity: [0.12, 0.2, 0.12]
                }
              : { x: highlightOffset.x, y: highlightOffset.y, opacity: 0.12 }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background:
              "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.42) 50%, transparent 63%)"
          }}
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
