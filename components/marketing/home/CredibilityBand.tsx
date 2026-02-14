"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

import { GlassSurface } from "@/components/marketing/animations/GlassSurface";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";

const proofBullets = [
  "Resident-centered",
  "Survey-friendly outputs",
  "Made for one-person departments"
] as const;

export function CredibilityBand() {
  const { reducedMotion, isPageVisible } = useReducedMotionPreference();

  return (
    <section>
      <GlassSurface variant="dense" className="rounded-[24px] p-4 md:p-5">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: "easeOut" }}
          className="space-y-3"
        >
          <div className="relative inline-block">
            <p className="text-lg text-foreground md:text-xl">Built for Activity Directors in Skilled Nursing.</p>
            {!reducedMotion ? (
              <motion.span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-[linear-gradient(90deg,transparent_0%,#2563EB_30%,#2DD4BF_70%,transparent_100%)] opacity-60"
                animate={isPageVisible ? { x: ["-8%", "8%", "-8%"] } : { x: 0 }}
                transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {proofBullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/72 px-3 py-2 text-sm text-foreground/78">
                <CheckCircle2 className="h-4 w-4 text-actifyMint" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </GlassSurface>
    </section>
  );
}
