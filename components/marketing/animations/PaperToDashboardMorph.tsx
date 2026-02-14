"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { GlassCard } from "@/components/glass/GlassCard";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

const panelLabels = ["Progress Notes", "Attendance Heatmap", "Barriers", "Monthly Report"] as const;

type GsapTimelineLike = {
  to: (...args: unknown[]) => GsapTimelineLike;
  kill: () => void;
  pause: () => void;
  resume: () => void;
  scrollTrigger?: {
    kill: () => void;
  } | null;
};

export function PaperToDashboardMorph() {
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const paperRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [ready, setReady] = useState(false);

  const paperOffsets = useMemo(
    () => [
      { x: -140, y: -70, rotate: -14 },
      { x: 130, y: -88, rotate: 11 },
      { x: -165, y: 65, rotate: -8 },
      { x: 145, y: 82, rotate: 9 },
      { x: -10, y: -120, rotate: -5 },
      { x: 8, y: 122, rotate: 6 }
    ],
    []
  );

  useEffect(() => {
    if (reducedMotion || !sectionRef.current || !stageRef.current || !dashboardRef.current) return;

    let timeline: GsapTimelineLike | null = null;
    let trigger: { kill: () => void } | null = null;
    let removeVisibility: (() => void) | null = null;
    let isCancelled = false;

    const setup = async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      if (isCancelled) return;

      const gsap = gsapModule.gsap ?? gsapModule.default ?? gsapModule;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const papers = paperRefs.current.filter(Boolean) as HTMLDivElement[];
      if (papers.length === 0) return;

      gsap.set(dashboardRef.current, { opacity: 0, y: 26, scale: 0.92 });

      timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top+=64",
          end: "+=900",
          scrub: 1,
          pin: true,
          anticipatePin: 1
        }
      }) as unknown as GsapTimelineLike;
      trigger = timeline.scrollTrigger ?? null;

      papers.forEach((paper, index) => {
        timeline?.to(
          paper,
          {
            x: (index % 3) * 104 - 104,
            y: Math.floor(index / 3) * 112 - 56,
            rotate: 0,
            scale: 1
          },
          0
        );
      });

      timeline
        ?.to(
          papers,
          {
            opacity: 0.18,
            scale: 0.9,
            stagger: 0.04
          },
          0.52
        )
        .to(
          dashboardRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1
          },
          0.82
        );

      const onVisibility = () => {
        if (!timeline) return;
        if (document.visibilityState === "hidden") {
          timeline.pause();
        } else {
          timeline.resume();
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      removeVisibility = () => document.removeEventListener("visibilitychange", onVisibility);
      setReady(true);
    };

    void setup();

    return () => {
      isCancelled = true;
      removeVisibility?.();
      trigger?.kill();
      timeline?.kill();
      setReady(false);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !dashboardRef.current) return;
    if (!isPageVisible) {
      dashboardRef.current.style.filter = "none";
      return;
    }
    dashboardRef.current.style.filter = "drop-shadow(0 10px 24px rgba(17,24,39,0.16))";
  }, [isPageVisible, reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-foreground/65">Paperwork to proof</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard variant="dense" className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Paper stack</p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`paper-static-${index}`} className="h-16 rounded-lg border border-white/70 bg-white/75" />
              ))}
            </div>
          </GlassCard>
          <GlassCard variant="dense" className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Dashboard proof</p>
            <div className="grid grid-cols-2 gap-2">
              {panelLabels.map((label) => (
                <div key={label} className="rounded-lg border border-white/70 bg-white/75 p-3 text-xs text-foreground/75">
                  {label}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative min-h-[130vh] overflow-hidden rounded-3xl">
      <div
        ref={stageRef}
        className="relative flex min-h-[70vh] items-center justify-center rounded-3xl border border-white/65 bg-white/45 px-6 py-10 shadow-[0_30px_80px_-40px_rgba(17,24,39,0.35)]"
      >
        <div className="absolute left-5 top-5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
          Paperwork to proof
        </div>

        {paperOffsets.map((paper, index) => (
          <div
            key={`paper-${index}`}
            ref={(node) => {
              paperRefs.current[index] = node;
            }}
            className="absolute h-40 w-28 rounded-xl border border-white/80 bg-white/80 shadow-[0_8px_18px_-10px_rgba(17,24,39,0.22)]"
            style={{
              transform: `translate(${paper.x}px, ${paper.y}px) rotate(${paper.rotate}deg)`
            }}
          >
            <div className="px-3 py-2">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="mt-2 h-1.5 w-16 rounded-full bg-slate-200" />
              <div className="mt-2 h-1.5 w-10 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}

        <div
          ref={dashboardRef}
          className={cn(
            "absolute w-full max-w-2xl rounded-2xl border border-white/70 bg-white/80 p-5",
            ready ? "will-change-transform" : ""
          )}
        >
          <div className="mb-3 text-sm font-semibold text-foreground">ACTIFY Dashboard</div>
          <div className="grid grid-cols-2 gap-3">
            {panelLabels.map((label, index) => (
              <div key={label} className="rounded-xl border border-white/70 bg-white/75 p-3">
                <div className="text-xs text-foreground/65">{label}</div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#2DD4BF_100%)]"
                    style={{ width: `${58 + index * 8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
