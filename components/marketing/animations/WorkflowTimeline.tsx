"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

type WorkflowStep = {
  key: string;
  title: string;
  body: string;
};

const defaultSteps: WorkflowStep[] = [
  { key: "setup", title: "Setup", body: "Create today’s schedule with templates and resident preferences." },
  { key: "invite", title: "Invite", body: "Notify residents and line up support for smooth attendance." },
  { key: "run", title: "Run activity", body: "Track participation quality while the event is in progress." },
  { key: "document", title: "Document", body: "Capture notes and barriers in a structured, fast flow." },
  { key: "report", title: "Report", body: "Export a polished monthly summary with outcomes and trends." }
];

export function WorkflowTimeline({ steps = defaultSteps }: { steps?: WorkflowStep[] }) {
  const { reducedMotion } = useReducedMotionPreference();

  return (
    <div className="relative rounded-2xl border border-white/65 bg-white/55 p-4 md:p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground/65">Built for one person to run smoothly</div>
      <div className="relative space-y-3">
        <div aria-hidden className="absolute bottom-2 left-[14px] top-1 w-px bg-slate-300/80" />
        {steps.map((step, index) => (
          <WorkflowTimelineItem
            key={step.key}
            step={step}
            index={index}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    </div>
  );
}

function WorkflowTimelineItem({
  step,
  index,
  reducedMotion
}: {
  step: WorkflowStep;
  index: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: "-12% 0px -18% 0px", once: true });
  const isActive = reducedMotion ? true : inView;

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative ml-8 rounded-xl border border-white/70 bg-white/75 p-3",
        isActive ? "shadow-[0_10px_25px_-18px_rgba(17,24,39,0.35)]" : ""
      )}
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={isActive ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <div className="absolute -left-[30px] top-3 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white shadow-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <motion.path
            d="M4 12.5 L9.5 18 L20 6.5"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: isActive ? 1 : 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{step.title}</p>
        <motion.span
          className="rounded-full border border-white/65 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/70"
          initial={reducedMotion ? false : { scale: 0.95, opacity: 0 }}
          animate={isActive ? { scale: [1, 1.04, 1], opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          Completed
        </motion.span>
      </div>
      <p className="mt-1 text-sm leading-6 text-foreground/75">{step.body}</p>
    </motion.div>
  );
}
