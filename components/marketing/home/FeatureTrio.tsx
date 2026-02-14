"use client";

import { type ComponentType, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ClipboardCheck, ListFilter } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FeatureKey = "notes" | "templates" | "attendance";

type FeatureItem = {
  key: FeatureKey;
  title: string;
  description: string;
  points: string[];
  icon: ComponentType<{ className?: string }>;
};

const features: FeatureItem[] = [
  {
    key: "notes",
    title: "Progress Note Builder",
    description: "Structured fields + quick phrases keep notes clean and complete without slowing your day down.",
    points: ["Pick resident", "Tap quick phrase", "Save to timeline"],
    icon: ClipboardCheck
  },
  {
    key: "templates",
    title: "Template Library + Printables",
    description: "Reuse your best activities in one click, then print daily, weekly, or monthly schedules fast.",
    points: ["Drop template", "Set time", "Print PDF"],
    icon: CalendarDays
  },
  {
    key: "attendance",
    title: "Attendance + Barriers",
    description: "Track who attended, why residents missed, and what changed so programming gets stronger each week.",
    points: ["Checklist entry", "Barrier trend", "Monthly compare"],
    icon: ListFilter
  }
];

function NotesMiniDemo({ reducedMotion }: { reducedMotion: boolean }) {
  const chips = ["Engaged well", "Minimal cues", "Positive mood"];

  return (
    <div className="rounded-xl border border-white/70 bg-white/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/62">Quick phrases</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((chip, index) => (
          <motion.span
            key={chip}
            className="rounded-full border border-white/70 bg-white/90 px-2 py-0.5 text-[11px] text-foreground/78"
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.2, delay: reducedMotion ? 0 : index * 0.08 }}
          >
            {chip}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function TemplatesMiniDemo({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/62">Drag to schedule</p>
      <div className="mt-2 grid grid-cols-[1fr_1.4fr] gap-2">
        <div className="rounded-lg border border-white/70 bg-white/88 px-2 py-1 text-[11px] text-foreground/75">
          Trivia: 90s
        </div>
        <div className="relative rounded-lg border border-white/70 bg-white/86 p-1.5">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={`mini-cell-${index}`} className="h-4 rounded-sm bg-slate-100/90" />
            ))}
          </div>
          {!reducedMotion ? (
            <motion.div
              className="pointer-events-none absolute left-1 top-1 rounded bg-actify-brand px-1.5 py-0.5 text-[10px] font-semibold text-white"
              animate={{ x: [0, 38, 38, 0], y: [0, 0, 20, 20] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
            >
              Bingo
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AttendanceMiniDemo({ reducedMotion }: { reducedMotion: boolean }) {
  const rows = [
    { label: "Present / Active", count: 56, width: "78%", tone: "bg-actifyBlue" },
    { label: "Leading", count: 18, width: "34%", tone: "bg-actifyMint" },
    { label: "Refused", count: 14, width: "24%", tone: "bg-actifyCoral" }
  ];

  return (
    <div className="rounded-xl border border-white/70 bg-white/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/62">Barrier ranking</p>
      <div className="mt-2 space-y-2">
        {rows.map((row, index) => (
          <div key={row.label} className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-foreground/75">
              <span>{row.label}</span>
              <motion.span
                initial={reducedMotion ? false : { opacity: 0.5, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2, delay: reducedMotion ? 0 : index * 0.07 }}
                className="font-semibold"
              >
                {row.count}
              </motion.span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200">
              <div className={cn("h-full rounded-full", row.tone)} style={{ width: row.width }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureMiniDemo({ featureKey, reducedMotion }: { featureKey: FeatureKey; reducedMotion: boolean }) {
  if (featureKey === "notes") return <NotesMiniDemo reducedMotion={reducedMotion} />;
  if (featureKey === "templates") return <TemplatesMiniDemo reducedMotion={reducedMotion} />;
  return <AttendanceMiniDemo reducedMotion={reducedMotion} />;
}

export function FeatureTrio() {
  const { reducedMotion } = useReducedMotionPreference();
  const [openKey, setOpenKey] = useState<FeatureKey | null>(null);

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/62">Core workflow</p>
        <h2 className="text-2xl text-foreground md:text-3xl">The three workflows teams use every day.</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Dialog
              key={feature.key}
              open={openKey === feature.key}
              onOpenChange={(open) => setOpenKey(open ? feature.key : null)}
            >
              <DialogTrigger asChild>
                <button
                  id={feature.key === "notes" ? "feature-notes" : undefined}
                  type="button"
                  className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                >
                  <GlassCard
                    hover
                    variant="dense"
                    className="h-full cursor-pointer rounded-2xl border border-white/75 p-4 transition-transform duration-200 group-hover:-translate-y-0.5"
                  >
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-actify-brand text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-lg text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/72">{feature.description}</p>
                    <div className="mt-3">
                      <FeatureMiniDemo featureKey={feature.key} reducedMotion={reducedMotion} />
                    </div>
                  </GlassCard>
                </button>
              </DialogTrigger>
              <DialogContent className="glass w-[min(640px,92vw)] rounded-2xl border-white/70 p-0">
                <div className="glass-content p-5 md:p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-foreground">{feature.title}</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-foreground/72">
                      30-second walkthrough
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <FeatureMiniDemo featureKey={feature.key} reducedMotion={reducedMotion} />
                    <div className="rounded-xl border border-white/70 bg-white/72 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/62">What happens next</p>
                      <ol className="mt-2 space-y-1.5 text-sm text-foreground/78">
                        {feature.points.map((point, index) => (
                          <li key={point} className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-actifyBlue/15 text-[11px] font-semibold text-actifyBlue">
                              {index + 1}
                            </span>
                            {point}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    </section>
  );
}
