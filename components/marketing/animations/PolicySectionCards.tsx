"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

export type PolicySection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

type PolicySectionCardsProps = {
  sections: PolicySection[];
  className?: string;
};

export function PolicySectionCards({ sections, className }: PolicySectionCardsProps) {
  const { reducedMotion } = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const index = Number((visible[0].target as HTMLElement).dataset.index ?? "0");
          setActiveIndex(Number.isNaN(index) ? 0 : index);
        }
      },
      {
        rootMargin: "-20% 0px -40% 0px",
        threshold: [0.15, 0.35, 0.6]
      }
    );

    refs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [sections.length]);

  const stepperItems = useMemo(() => sections.map((section) => section.title), [sections]);

  return (
    <div className={cn("relative grid gap-4 lg:grid-cols-[1fr_180px]", className)}>
      <div className="space-y-4">
        {sections.map((section, index) => (
          <motion.section
            key={section.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            data-index={index}
            id={section.id}
            className="scroll-mt-20"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
            transition={{ duration: 0.35 }}
          >
            <GlassPanel
              variant="dense"
              className={cn(
                "rounded-2xl p-5 transition",
                index === activeIndex ? "border-white/85 bg-white/80" : "bg-white/65"
              )}
              style={
                reducedMotion
                  ? undefined
                  : {
                      transform: index === activeIndex ? "scale(1.01)" : "scale(1)"
                    }
              }
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                <span className="rounded-full border border-white/70 bg-white/75 px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/65">
                  Section {index + 1}
                </span>
              </div>
              <div className="text-sm leading-6 text-foreground/80">{section.content}</div>
            </GlassPanel>
          </motion.section>
        ))}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-white/70 bg-white/70 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/60">Policy progress</div>
          <div className="space-y-2">
            {stepperItems.map((label, index) => (
              <a
                key={`${label}-${index}`}
                href={`#${sections[index]?.id ?? ""}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition",
                  index === activeIndex ? "bg-actifyBlue/10 text-foreground" : "text-foreground/70 hover:bg-white/70"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    index === activeIndex ? "bg-actifyBlue" : "bg-slate-300"
                  )}
                />
                {label}
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
