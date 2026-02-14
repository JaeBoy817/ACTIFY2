"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { GlassCard } from "@/components/glass/GlassCard";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

type OrbitItem = {
  key: string;
  label: string;
  detail: string;
};

const defaultItems: OrbitItem[] = [
  { key: "music", label: "Music Choice", detail: "Schedules that honor personal music preferences and routines." },
  { key: "timing", label: "Best Timing", detail: "Programs match each resident’s strongest time of day." },
  { key: "social", label: "Social Fit", detail: "Activities balance group energy and one-to-one support." },
  { key: "adapt", label: "Adaptations", detail: "Bed-bound and sensory-friendly options stay built-in." },
  { key: "faith", label: "Values & Faith", detail: "Respect resident values, traditions, and comfort cues." },
  { key: "barrier", label: "Barrier Aware", detail: "Barriers are tracked and folded back into planning." }
];

export function OrbitFeatureShowcase({ items = defaultItems }: { items?: OrbitItem[] }) {
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();
  const [isCompact, setIsCompact] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsCompact(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || isCompact || !isPageVisible) return;
    const timer = window.setInterval(() => {
      setRotation((prev) => (prev + 0.4) % 360);
    }, 40);
    return () => window.clearInterval(timer);
  }, [isCompact, isPageVisible, reducedMotion]);

  const activeItem = items[activeIndex] ?? items[0];

  const orbitPoints = useMemo(() => {
    const radiusX = 170;
    const radiusY = 118;
    return items.map((item, index) => {
      const angle = ((360 / items.length) * index + rotation) * (Math.PI / 180);
      return {
        ...item,
        x: Math.cos(angle) * radiusX,
        y: Math.sin(angle) * radiusY
      };
    });
  }, [items, rotation]);

  if (reducedMotion || isCompact) {
    return (
      <GlassCard variant="dense" className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-foreground/65">Resident-centered choices</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition",
                index === activeIndex ? "border-actifyBlue/50 bg-actifyBlue/10" : "border-white/70 bg-white/75"
              )}
              onClick={() => setActiveIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-white/70 bg-white/75 p-4">
          <p className="text-sm font-semibold text-foreground">{activeItem.label}</p>
          <p className="mt-1 text-sm text-foreground/75">{activeItem.detail}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="dense" className="relative overflow-hidden py-10">
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-foreground/65">Resident-centered orbit</div>
      <div className="relative mt-6 h-[320px]">
        <div className="absolute left-1/2 top-1/2 h-[250px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/40" />
        {orbitPoints.map((item, index) => (
          <button
            key={item.key}
            type="button"
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition",
              index === activeIndex ? "border-actifyBlue/50 bg-white text-foreground" : "border-white/65 bg-white/70 text-foreground/75"
            )}
            style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onClick={() => setActiveIndex(index)}
          >
            {item.label}
          </button>
        ))}

        <div className="absolute left-1/2 top-1/2 w-[260px] -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.key}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-white/70 bg-white/85 p-4 text-center shadow-[0_16px_30px_-24px_rgba(17,24,39,0.35)]"
            >
              <p className="text-sm font-semibold text-foreground">{activeItem.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/75">{activeItem.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}
