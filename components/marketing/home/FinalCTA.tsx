"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { motion } from "framer-motion";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassSurface } from "@/components/marketing/animations/GlassSurface";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function FinalCTA() {
  const { reducedMotion } = useReducedMotionPreference();

  return (
    <section className="pb-2">
      <GlassSurface variant="warm" className="rounded-[28px] p-6 md:p-8">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12% 0px -10% 0px" }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <h2 className="text-2xl text-foreground md:text-3xl">Run your activity program from one calm workspace.</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-foreground/74 md:text-base">
              Schedule, document, and report in the same place so your month-end story is ready when leadership asks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <GlassButton asChild size="lg" magnetic>
              <Link href="/sign-up" className="inline-flex items-center gap-2">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </GlassButton>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="glass-button glass-button-hover inline-flex h-11 items-center gap-2 rounded-xl border border-white/60 bg-white/75 px-6 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <FileText className="h-4 w-4" />
                  View sample monthly report
                </button>
              </DialogTrigger>
              <DialogContent className="glass w-[min(720px,94vw)] rounded-2xl border-white/70 p-0">
                <div className="glass-content p-5 md:p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-foreground">Sample monthly report layout</DialogTitle>
                    <DialogDescription className="text-sm text-foreground/72">
                      Same format directors use for attendance, barriers, and outcomes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 rounded-xl border border-white/70 bg-white/75 p-4">
                    <div className="rounded-lg border border-white/70 bg-actify-brand px-3 py-2 text-sm font-semibold text-white">
                      Monthly Activities Report
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      {["Total Activities", "Attendance Marks", "1:1 Notes", "Avg Engagement"].map((metric) => (
                        <div key={metric} className="rounded-lg border border-white/70 bg-white/82 p-2 text-xs text-foreground/72">
                          <p className="font-semibold text-foreground/88">{metric}</p>
                          <p className="mt-1 text-lg text-foreground">—</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/70 bg-white/82 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/62">Attendance snapshot</p>
                        <div className="mt-2 h-2 rounded-full bg-slate-200">
                          <div className="h-full w-[72%] rounded-full bg-actifyBlue" />
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/70 bg-white/82 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/62">Top programs</p>
                        <div className="mt-2 space-y-1 text-xs text-foreground/75">
                          <p>Bingo • Trivia • Music Social</p>
                          <p>Barriers: At appointment, Refused</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
      </GlassSurface>
    </section>
  );
}
