"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface HeatmapGridOverlayProps {
  reducedMotion: boolean;
  className?: string;
}

const glowCells = [
  { top: "16%", left: "12%", color: "bg-actifyBlue/25" },
  { top: "32%", left: "46%", color: "bg-actifyMint/28" },
  { top: "54%", left: "28%", color: "bg-actifyCoral/20" },
  { top: "66%", left: "62%", color: "bg-actifyBlue/20" },
  { top: "78%", left: "20%", color: "bg-actifyMint/18" }
] as const;

export function HeatmapGridOverlay({ reducedMotion, className }: HeatmapGridOverlayProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:36px_36px]" />
      {glowCells.map((cell, index) => (
        <motion.div
          key={`auth-grid-cell-${index}`}
          className={cn("absolute h-10 w-10 rounded-lg blur-[1px]", cell.color)}
          style={{ top: cell.top, left: cell.left }}
          animate={
            reducedMotion
              ? { opacity: 0.6, scale: 1 }
              : { opacity: [0.25, 0.75, 0.3], scale: [1, 1.04, 1] }
          }
          transition={{
            duration: 7 + index,
            ease: "easeInOut",
            repeat: reducedMotion ? 0 : Infinity
          }}
        />
      ))}
    </div>
  );
}
