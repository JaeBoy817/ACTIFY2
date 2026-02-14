"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";

type HeatmapPulseBackgroundProps = {
  rows: number;
  cols: number;
  className?: string;
};

export function HeatmapPulseBackground({ rows, cols, className }: HeatmapPulseBackgroundProps) {
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();
  const totalCells = rows * cols;
  const [activeCells, setActiveCells] = useState<number[]>([]);
  const [freezeMessageVisible, setFreezeMessageVisible] = useState(false);
  const freezeUntilRef = useRef<number>(0);
  const hideMessageTimerRef = useRef<number | null>(null);

  const cells = useMemo(() => Array.from({ length: totalCells }, (_, index) => index), [totalCells]);

  useEffect(() => {
    if (reducedMotion || !isPageVisible) {
      setActiveCells([]);
      return;
    }

    const tick = window.setInterval(() => {
      if (Date.now() < freezeUntilRef.current) return;

      const pulseCount = Math.random() > 0.6 ? 2 : 1;
      const next = new Set<number>();
      while (next.size < pulseCount) {
        next.add(Math.floor(Math.random() * totalCells));
      }
      setActiveCells(Array.from(next));
    }, 900);

    return () => window.clearInterval(tick);
  }, [isPageVisible, reducedMotion, totalCells]);

  useEffect(() => {
    return () => {
      if (hideMessageTimerRef.current) window.clearTimeout(hideMessageTimerRef.current);
    };
  }, []);

  const handleFreezePulse = () => {
    if (reducedMotion) return;
    freezeUntilRef.current = Date.now() + 2000;
    setFreezeMessageVisible(true);

    if (hideMessageTimerRef.current) window.clearTimeout(hideMessageTimerRef.current);
    hideMessageTimerRef.current = window.setTimeout(() => setFreezeMessageVisible(false), 1200);
  };

  return (
    <div
      aria-hidden
      className={className}
      onMouseEnter={handleFreezePulse}
      onFocus={handleFreezePulse}
    >
      <div
        className="grid h-full w-full gap-1 rounded-[24px] p-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {cells.map((cellIndex) => {
          const isActive = activeCells.includes(cellIndex);
          return (
            <motion.div
              key={cellIndex}
              className="rounded-[6px] border border-white/30 bg-white/10"
              animate={
                reducedMotion
                  ? { opacity: 0.18, scale: 1 }
                  : isActive
                    ? { opacity: [0.18, 0.36, 0.2], scale: [1, 1.03, 1] }
                    : { opacity: 0.14, scale: 1 }
              }
              transition={{ duration: isActive ? 1.1 : 0.3, ease: "easeInOut" }}
            />
          );
        })}
      </div>
      {!reducedMotion && freezeMessageVisible ? (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/60 bg-white/80 px-2.5 py-1 text-[10px] font-medium text-slate-700 shadow-sm">
          Pulse paused
        </div>
      ) : null}
    </div>
  );
}
