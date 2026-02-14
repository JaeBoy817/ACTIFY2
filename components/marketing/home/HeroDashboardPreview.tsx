"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

const heatmapCells = [
  1, 2, 1, 3, 2, 1, 2, 3,
  2, 3, 2, 1, 2, 2, 3, 1,
  1, 2, 2, 3, 2, 1, 2, 2,
  3, 2, 1, 2, 3, 2, 1, 2
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getHeatmapClass(level: number) {
  if (level === 1) return "bg-actifyBlue/22";
  if (level === 2) return "bg-actifyMint/24";
  return "bg-actifyCoral/22";
}

export function HeroDashboardPreview() {
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();
  const frameRef = useRef<number | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [canParallax, setCanParallax] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setCanParallax(false);
      return;
    }

    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setCanParallax(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [reducedMotion]);

  useEffect(
    () => () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || !canParallax) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 20;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 20;

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(() => {
        setParallax({
          x: clamp(x, -10, 10),
          y: clamp(y, -10, 10)
        });
      });
    },
    [canParallax, reducedMotion]
  );

  const onPointerLeave = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    setParallax({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      className="glass relative overflow-hidden rounded-[28px] border border-white/65 bg-white/45 p-4 md:p-5"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      animate={
        reducedMotion || !isPageVisible
          ? { scale: 1 }
          : { scale: [1, 1.01, 1] }
      }
      transition={
        reducedMotion || !isPageVisible
          ? { duration: 0.2 }
          : { duration: 9.6, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`
        }}
      >
        {!reducedMotion ? (
          <motion.div
            className="absolute -inset-[45%] opacity-[0.2]"
            style={{
              background:
                "linear-gradient(115deg, transparent 37%, rgba(255,255,255,0.35) 50%, transparent 63%)"
            }}
            animate={isPageVisible ? { x: ["-58%", "52%"] } : { x: "-58%" }}
            transition={{
              duration: 7.4,
              ease: "linear",
              repeat: Infinity,
              repeatDelay: 1.1
            }}
          />
        ) : null}
        <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-actifyMint/20 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-actifyBlue/16 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/75 px-3 py-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60">Dashboard</p>
            <p className="text-sm font-semibold text-foreground">Today • 10 activities</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-white/70 bg-white/80 px-2.5 py-1 text-xs font-medium text-foreground/75"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/70 bg-white/72 p-2.5">
            <p className="text-[10px] uppercase tracking-[0.06em] text-foreground/60">Attendance</p>
            <div className="mt-1 h-1.5 rounded-full bg-slate-200">
              <div className="h-full w-[74%] rounded-full bg-actifyBlue" />
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground">74%</p>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/72 p-2.5">
            <p className="text-[10px] uppercase tracking-[0.06em] text-foreground/60">1:1 Notes</p>
            <p className="mt-2 text-lg font-semibold text-foreground">22</p>
            <p className="text-[10px] text-foreground/60">This month</p>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/72 p-2.5">
            <p className="text-[10px] uppercase tracking-[0.06em] text-foreground/60">Top Barrier</p>
            <p className="mt-2 text-sm font-semibold text-foreground">At appointment</p>
            <p className="text-[10px] text-foreground/60">12 entries</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/72 p-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/60">Engagement heatmap</p>
          <div className="grid grid-cols-8 gap-1">
            {heatmapCells.map((cell, index) => (
              <div
                key={`hero-heatmap-${index}`}
                className={cn("h-2.5 rounded-sm", getHeatmapClass(cell))}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/75 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/60">Progress Note</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-foreground/78">
            <div className="rounded-md bg-white/70 px-2 py-1">Type: Group</div>
            <div className="rounded-md bg-white/70 px-2 py-1">Mood: Bright</div>
            <div className="rounded-md bg-white/70 px-2 py-1">Cues: Minimal</div>
            <div className="rounded-md bg-white/70 px-2 py-1">Response: Engaged</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
