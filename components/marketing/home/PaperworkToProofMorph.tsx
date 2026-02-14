"use client";

import { useEffect, useRef } from "react";

import { GlassCard } from "@/components/glass/GlassCard";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

type GsapTimelineLike = {
  to: (...args: unknown[]) => GsapTimelineLike;
  kill: () => void;
  pause: () => void;
  resume: () => void;
  scrollTrigger?: {
    kill: () => void;
  } | null;
};

const paperSeed = [
  { label: "Calendar", x: -165, y: -74, rotate: -12 },
  { label: "Attendance", x: 148, y: -88, rotate: 11 },
  { label: "Notes", x: -182, y: 82, rotate: -9 },
  { label: "Barriers", x: 164, y: 96, rotate: 8 },
  { label: "1:1", x: -30, y: -132, rotate: -5 },
  { label: "Reports", x: 22, y: 132, rotate: 7 }
] as const;

const proofOutputs = ["Barriers summary", "Engagement trend", "Notable outcomes"] as const;

export function PaperworkToProofMorph() {
  const { reducedMotion } = useReducedMotionPreference();
  const sectionRef = useRef<HTMLElement | null>(null);
  const paperRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const outputRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (reducedMotion || !sectionRef.current || !dashboardRef.current) return;

    let timeline: GsapTimelineLike | null = null;
    let removeVisibility: (() => void) | null = null;
    let disposed = false;

    const setup = async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      if (disposed) return;

      const gsap = gsapModule.gsap ?? gsapModule.default ?? gsapModule;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const papers = paperRefs.current.filter(Boolean) as HTMLDivElement[];
      const outputs = outputRefs.current.filter(Boolean) as HTMLDivElement[];
      if (papers.length === 0 || outputs.length === 0) return;

      gsap.set(dashboardRef.current, { opacity: 0, y: 32, scale: 0.92 });
      gsap.set(outputs, { opacity: 0, y: 12 });

      timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top+=72",
          end: "+=1100",
          pin: true,
          scrub: 1,
          anticipatePin: 1
        }
      }) as unknown as GsapTimelineLike;

      papers.forEach((paper, index) => {
        timeline?.to(
          paper,
          {
            x: (index % 3) * 138 - 138,
            y: Math.floor(index / 3) * 124 - 62,
            rotate: 0
          },
          0
        );
      });

      timeline
        ?.to(
          papers,
          {
            opacity: 0.18,
            scale: 0.88,
            stagger: 0.03
          },
          0.47
        )
        .to(
          dashboardRef.current,
          {
            opacity: 1,
            y: 0,
            scale: 1
          },
          0.62
        )
        .to(
          outputs,
          {
            opacity: 1,
            y: 0,
            stagger: 0.09
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
    };

    void setup();

    return () => {
      disposed = true;
      removeVisibility?.();
      timeline?.scrollTrigger?.kill();
      timeline?.kill();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/60">Paperwork to proof</p>
          <h2 className="text-2xl text-foreground md:text-3xl">From scattered paperwork to one clear report.</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard variant="dense" className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Paper stack</p>
            <div className="grid grid-cols-2 gap-2">
              {paperSeed.slice(0, 4).map((paper) => (
                <div key={paper.label} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs text-foreground/72">
                  {paper.label}
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard variant="dense" className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Monthly report</p>
            <div className="space-y-2">
              {proofOutputs.map((output) => (
                <div key={output} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs text-foreground/72">
                  {output}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative min-h-[125vh] overflow-hidden rounded-[2rem]">
      <div className="glass relative flex min-h-[78vh] items-center justify-center rounded-[2rem] border border-white/65 bg-white/35 p-6 md:p-10">
        <div className="absolute left-5 top-5 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/65">
          Paperwork → Proof
        </div>

        {paperSeed.map((paper, index) => (
          <div
            key={paper.label}
            ref={(node) => {
              paperRefs.current[index] = node;
            }}
            className="absolute h-40 w-28 rounded-xl border border-white/80 bg-white/82 px-3 py-2 shadow-[0_14px_26px_-18px_rgba(17,24,39,0.36)]"
            style={{
              transform: `translate(${paper.x}px, ${paper.y}px) rotate(${paper.rotate}deg)`
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-foreground/60">{paper.label}</p>
            <div className="mt-2 space-y-2">
              <div className="h-1.5 rounded-full bg-slate-200" />
              <div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
              <div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
            </div>
          </div>
        ))}

        <div
          ref={dashboardRef}
          className={cn(
            "absolute w-full max-w-3xl rounded-[24px] border border-white/70 bg-white/80 p-5 md:p-6"
          )}
        >
          <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/75 px-3 py-2">
            <p className="text-sm font-semibold text-foreground">Monthly Report</p>
            <span className="rounded-full bg-actify-brand px-2.5 py-1 text-[10px] font-semibold text-white">Auto generated</span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {proofOutputs.map((output, index) => (
              <div
                key={output}
                ref={(node) => {
                  outputRefs.current[index] = node;
                }}
                className="rounded-xl border border-white/70 bg-white/75 p-3"
              >
                <div className="text-xs font-semibold text-foreground">{output}</div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-actify-brand"
                    style={{ width: `${58 + index * 11}%` }}
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
