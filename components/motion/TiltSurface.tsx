"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

interface TiltSurfaceProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function TiltSurface({ children, className, maxTilt = 5 }: TiltSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reducedMotion || typeof window === "undefined") {
      setEnabled(false);
      return;
    }

    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [reducedMotion]);

  const updateTilt = useCallback((x: number, y: number) => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const node = event.currentTarget;
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const tiltY = (px - 0.5) * maxTilt * 2;
      const tiltX = (0.5 - py) * maxTilt * 2;

      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => updateTilt(tiltX, tiltY));
    },
    [enabled, maxTilt, updateTilt]
  );

  const handlePointerLeave = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    updateTilt(0, 0);
  }, [updateTilt]);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("tilt-surface", enabled && "tilt-active", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </div>
  );
}
