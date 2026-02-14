"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, ClipboardCheck, ListChecks } from "lucide-react";

import { GlassButton } from "@/components/glass/GlassButton";
import { HeatmapPulseBackground } from "@/components/marketing/animations/HeatmapPulseBackground";
import { GlassSurface } from "@/components/marketing/animations/GlassSurface";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { HeroDashboardPreview } from "@/components/marketing/home/HeroDashboardPreview";

const heroBullets = [
  {
    label: "Progress notes in 30 seconds",
    icon: ClipboardCheck
  },
  {
    label: "Templates + printables in one click",
    icon: CalendarDays
  },
  {
    label: "Attendance + barriers you can actually use",
    icon: ListChecks
  }
] as const;

export function HomeHero() {
  const { reducedMotion } = useReducedMotionPreference();

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#FFF7ED] px-5 py-10 md:px-8 md:py-14">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-actifyBlue/22 blur-3xl" />
        <div className="absolute -right-28 top-8 h-[26rem] w-[26rem] rounded-full bg-actifyMint/22 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-96 w-96 rounded-full bg-actifyCoral/15 blur-3xl" />
        <HeatmapPulseBackground rows={5} cols={12} className="absolute inset-0 opacity-[0.24]" />
      </div>

      <div className="relative grid items-center gap-6 lg:grid-cols-[1.03fr_1fr] lg:gap-8">
        <GlassSurface variant="warm" className="rounded-[30px] p-6 md:p-8">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="space-y-5"
          >
            <p className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/75">
              Built for SNF, ALF, &amp; Memory Care Activities Directors
            </p>

            <div className="space-y-3">
              <h1 className="text-4xl leading-tight text-foreground md:text-5xl">
                Documentation that doesn&apos;t feel like paperwork.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-foreground/75 md:text-lg">
                ACTIFY helps SNF, ALF, and Memory Care Activity Directors schedule programs, log outcomes, and report clearly in one workflow.
              </p>
            </div>

            <ul className="space-y-2.5">
              {heroBullets.map((bullet) => {
                const Icon = bullet.icon;
                return (
                  <li
                    key={bullet.label}
                    className="flex items-center gap-2.5 rounded-xl border border-white/65 bg-white/62 px-3 py-2 text-sm text-foreground/85"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-actify-brand text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{bullet.label}</span>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <GlassButton asChild size="lg" magnetic>
                <Link href="/sign-up" className="inline-flex items-center gap-2">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </GlassButton>
              <GlassButton asChild variant="dense" size="lg">
                <a href="#feature-notes">See how notes work</a>
              </GlassButton>
            </div>

            <p className="text-sm text-foreground/65">Because you&apos;re one person.</p>
          </motion.div>
        </GlassSurface>

        <HeroDashboardPreview />
      </div>
    </section>
  );
}
