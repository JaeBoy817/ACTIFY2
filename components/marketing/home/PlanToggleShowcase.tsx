"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";

import { GlassSurface } from "@/components/marketing/animations/GlassSurface";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { cn } from "@/lib/utils";

type ModeKey = "core" | "full";

const coreFeatures = [
  "Progress Note Builder",
  "Template Library + Printables",
  "Attendance + Barriers",
  "Monthly Report Export"
];

const fullOnlyFeatures = [
  "Care plan tracking",
  "Assessments with suggestions",
  "Inventory + prize cart",
  "Resident Council tracker",
  "Volunteer scheduling",
  "Advanced analytics"
];

const allFeatures = [...coreFeatures, ...fullOnlyFeatures];
const firstWeekFlow = ["Schedule", "Invite", "Run", "Document", "Report"];

export function PlanToggleShowcase() {
  const { reducedMotion } = useReducedMotionPreference();
  const [mode, setMode] = useState<ModeKey>("core");

  const featurePairs = useMemo(() => {
    const midpoint = Math.ceil(allFeatures.length / 2);
    return [allFeatures.slice(0, midpoint), allFeatures.slice(midpoint)] as const;
  }, []);

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground/62">Packaging</p>
        <h2 className="text-2xl text-foreground md:text-3xl">Start with Core Workflow, unlock Full Toolkit when ready.</h2>
      </div>

      <GlassSurface variant="default" className="rounded-[26px] p-5 md:p-6">
        <div className="flex flex-col gap-5">
          <div className="relative inline-grid w-full max-w-md grid-cols-2 rounded-xl border border-white/75 bg-white/66 p-1">
            <motion.div
              className="absolute bottom-1 top-1 w-[calc(50%_-_4px)] rounded-lg bg-actify-brand"
              initial={false}
              animate={{ x: mode === "core" ? 0 : "100%" }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            />
            <button
              type="button"
              className={cn(
                "relative z-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                mode === "core" ? "text-white" : "text-foreground/78"
              )}
              onClick={() => setMode("core")}
            >
              Core Workflow
            </button>
            <button
              type="button"
              className={cn(
                "relative z-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                mode === "full" ? "text-white" : "text-foreground/78"
              )}
              onClick={() => setMode("full")}
            >
              Full Toolkit
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {featurePairs.map((column, columnIndex) => (
                <div key={`feature-col-${columnIndex}`} className="space-y-2 rounded-xl border border-white/70 bg-white/68 p-3">
                  {column.map((feature) => {
                    const enabled = coreFeatures.includes(feature) || mode === "full";
                    return (
                      <div key={feature} className="flex items-start gap-2 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border",
                            enabled
                              ? "border-actifyBlue/35 bg-actifyBlue/15 text-actifyBlue"
                              : "border-foreground/20 bg-white/70 text-foreground/35"
                          )}
                        >
                          {enabled ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        </span>
                        <span className={cn(enabled ? "text-foreground/82" : "text-foreground/45")}>{feature}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/70 bg-white/68 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/62">What you get first week</p>
              <ol className="mt-3 space-y-2.5">
                {firstWeekFlow.map((step, index) => (
                  <li key={step} className="flex items-center gap-2 text-sm text-foreground/80">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-actifyMint/20 text-xs font-semibold text-foreground">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </GlassSurface>
    </section>
  );
}
