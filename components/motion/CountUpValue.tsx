"use client";

import { useEffect, useMemo, useState } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";

interface CountUpValueProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function CountUpValue({ value, durationMs = 760, decimals = 0, prefix = "", suffix = "" }: CountUpValueProps) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();

    const step = (time: number) => {
      const progress = Math.min((time - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplay(value);
        setPopped(true);
        window.setTimeout(() => setPopped(false), 180);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, reducedMotion, value]);

  const formatted = useMemo(() => `${prefix}${display.toFixed(decimals)}${suffix}`, [decimals, display, prefix, suffix]);

  return <span className={popped ? "count-pop" : undefined}>{formatted}</span>;
}
