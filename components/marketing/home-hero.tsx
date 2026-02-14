"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { GlassHeroCard } from "@/components/marketing/animations/GlassHeroCard";
import { HeatmapPulseBackground } from "@/components/marketing/animations/HeatmapPulseBackground";
import { useReducedMotionPreference } from "@/components/marketing/animations/useReducedMotionPreference";

export function HomeHero() {
  const { reducedMotion } = useReducedMotionPreference();
  const statPreview = [
    { label: "Active Residents", value: "64", tone: "text-[#1D4ED8]", help: "Pulled from the Residents tab so census changes update this card." },
    { label: "Activities This Week", value: "18", tone: "text-[#0F766E]", help: "Counts scheduled items from Calendar for the current week." },
    { label: "Attendance Entries", value: "242", tone: "text-[#BE123C]", help: "Shows recent attendance logs submitted by staff." },
    { label: "Low Stock Alerts", value: "7", tone: "text-[#A16207]", help: "Combines low-stock items from Inventory and Prize Cart." }
  ];
  const schedulePreview = [
    "10:00 AM Chair Exercise - Dining Room",
    "1:30 PM Trivia 90s - Main Lounge",
    "3:00 PM Music Social - Activity Hall"
  ];
  const activityPreview = [
    "Added attendance for Trivia 90s",
    "Created one-to-one progress note",
    "Updated inventory: Bingo cards restocked"
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#FFF7ED]">
      <div aria-hidden className="absolute inset-0">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <HeatmapPulseBackground
          rows={6}
          cols={12}
          className="absolute inset-0 opacity-[0.28]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.55),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <GlassHeroCard className="hero-glass rounded-3xl p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-3 py-1 text-sm text-slate-900">
              <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
              Built for SNF, ALF, &amp; Memory Care Activities Directors
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Turn activities into impact,
              <span className="block">
                not{" "}
                <span className="relative">
                  paperwork
                  <span className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#2DD4BF_100%)] opacity-25" />
                </span>
                .
              </span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-700 md:text-lg">
              ACTIFY helps you plan programs, track attendance, and generate progress notes fast. Clean templates, goal
              tracking, and resident preferences, all in one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Progress notes in minutes",
                "Calendar + attendance linked",
                "Goal tracking by resident"
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/40 bg-white/25 px-3 py-1 text-sm text-slate-800"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div
                whileHover={reducedMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Link
                  href="/sign-up"
                  className="group relative inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB]"
                >
                  <span className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#2DD4BF_100%)]" />
                  <span className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,#2563EB_0%,#FB7185_100%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <span className="relative">Start free trial</span>
                </Link>
              </motion.div>

              <span className="text-xs text-slate-600 sm:ml-1">
                No credit card to explore
              </span>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-slate-700">
              <div className="hero-glass-soft rounded-2xl p-3">
                <div className="font-semibold text-slate-900">HIPAA-minded</div>
                <div className="mt-1 opacity-80">Privacy-first workflows</div>
              </div>
              <div className="hero-glass-soft rounded-2xl p-3">
                <div className="font-semibold text-slate-900">Templates</div>
                <div className="mt-1 opacity-80">Bingo, trivia, 1:1s</div>
              </div>
              <div className="hero-glass-soft rounded-2xl p-3">
                <div className="font-semibold text-slate-900">Fast logging</div>
                <div className="mt-1 opacity-80">Attendance to notes</div>
              </div>
            </div>
          </GlassHeroCard>

          <div className="relative">
            <GlassHeroCard className="hero-glass rounded-3xl p-5 md:p-6">
              <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Dashboard Preview</div>
                <span className="rounded-full bg-white/35 px-3 py-1 text-xs text-slate-800">
                  Hover a section to see what it does
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white/45 bg-white/55 p-3">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/70 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-900">ACTIFY Workspace</div>
                  <div className="rounded-full bg-actify-brand px-2 py-1 text-[10px] font-semibold text-white">Live</div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {statPreview.map((card) => (
                    <div
                      key={card.label}
                      tabIndex={0}
                      className="group/stat relative min-h-[86px] rounded-xl border border-white/70 bg-white/75 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      <div className="transition duration-200 group-hover/stat:blur-[1.5px] group-focus-visible/stat:blur-[1.5px]">
                        <div className="text-[11px] uppercase tracking-[0.06em] text-slate-600">{card.label}</div>
                        <div className={`mt-1 text-2xl font-semibold ${card.tone}`}>{card.value}</div>
                      </div>
                      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 translate-y-2 rounded-lg border border-white/80 bg-white/95 p-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-sm transition-all duration-200 group-hover/stat:translate-y-0 group-hover/stat:opacity-100 group-focus-visible/stat:translate-y-0 group-focus-visible/stat:opacity-100">
                        {card.help}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div
                    tabIndex={0}
                    className="group/attendance relative rounded-xl border border-white/70 bg-white/75 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <div className="transition duration-200 group-hover/attendance:blur-[1.5px] group-focus-visible/attendance:blur-[1.5px]">
                      <div className="text-xs font-semibold text-slate-900">Attendance Snapshot</div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                        <span>Participation Rate</span>
                        <span className="font-semibold">84%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-200">
                        <div className="h-full w-[84%] rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#2DD4BF_100%)]" />
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 translate-y-2 rounded-lg border border-white/80 bg-white/95 p-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-sm transition-all duration-200 group-hover/attendance:translate-y-0 group-hover/attendance:opacity-100 group-focus-visible/attendance:translate-y-0 group-focus-visible/attendance:opacity-100">
                      Tracks present/active/leading trends from daily attendance checklists.
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    className="group/schedule relative rounded-xl border border-white/70 bg-white/75 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <div className="transition duration-200 group-hover/schedule:blur-[1.5px] group-focus-visible/schedule:blur-[1.5px]">
                      <div className="text-xs font-semibold text-slate-900">Today&apos;s Schedule</div>
                      <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                        {schedulePreview.map((entry) => (
                          <div key={entry} className="truncate rounded-md bg-slate-100/80 px-2 py-1">{entry}</div>
                        ))}
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 translate-y-2 rounded-lg border border-white/80 bg-white/95 p-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-sm transition-all duration-200 group-hover/schedule:translate-y-0 group-hover/schedule:opacity-100 group-focus-visible/schedule:translate-y-0 group-focus-visible/schedule:opacity-100">
                      Mirrors the Calendar so directors can run the day from one view.
                    </div>
                  </div>
                </div>

                <div
                  tabIndex={0}
                  className="group/recent relative mt-3 rounded-xl border border-white/70 bg-white/75 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <div className="transition duration-200 group-hover/recent:blur-[1.5px] group-focus-visible/recent:blur-[1.5px]">
                    <div className="text-xs font-semibold text-slate-900">Recent Activity</div>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                      {activityPreview.map((entry) => (
                        <div key={entry} className="rounded-md bg-slate-100/80 px-2 py-1">{entry}</div>
                      ))}
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 translate-y-2 rounded-lg border border-white/80 bg-white/95 p-2 text-[11px] leading-relaxed text-slate-700 opacity-0 shadow-sm transition-all duration-200 group-hover/recent:translate-y-0 group-hover/recent:opacity-100 group-focus-visible/recent:translate-y-0 group-focus-visible/recent:opacity-100">
                    Audit-style feed showing team updates and workflow progress in real time.
                  </div>
                </div>
              </div>
              </div>
            </GlassHeroCard>

            <motion.div
              className="hero-glass-soft absolute -bottom-6 left-6 rounded-2xl px-4 py-3"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20% 0px -10% 0px" }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <div className="text-xs font-semibold text-slate-900">
                Preview mirrors ACTIFY dashboard sections.
              </div>
              <div className="mt-1 text-[11px] text-slate-700">
                Hover each block for quick guidance
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-glass {
          background: rgba(255,255,255,0.22);
          border: 1px solid rgba(255,255,255,0.40);
          box-shadow: 0 18px 50px rgba(17,24,39,0.10);
          backdrop-filter: blur(22px) saturate(140%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          position: relative;
        }
        .hero-glass::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.05));
          opacity: 0.35;
          pointer-events: none;
        }
        .hero-glass::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%);
          transform: rotate(10deg);
          opacity: 0.35;
          pointer-events: none;
        }
        .hero-glass-soft {
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: 0 10px 30px rgba(17,24,39,0.08);
          backdrop-filter: blur(18px) saturate(135%);
          -webkit-backdrop-filter: blur(18px) saturate(135%);
        }

        .hero-orb {
          position: absolute;
          filter: blur(40px);
          opacity: 0.35;
          border-radius: 999px;
          transform: translateZ(0);
          animation: hero-drift 16s ease-in-out infinite alternate;
        }
        .hero-orb-1 {
          width: 520px;
          height: 520px;
          left: -120px;
          top: -140px;
          background: radial-gradient(circle at 30% 30%, rgba(37,99,235,0.65), transparent 60%);
        }
        .hero-orb-2 {
          width: 520px;
          height: 520px;
          right: -160px;
          top: 60px;
          background: radial-gradient(circle at 30% 30%, rgba(45,212,191,0.70), transparent 60%);
          animation-duration: 18s;
        }
        .hero-orb-3 {
          width: 420px;
          height: 420px;
          left: 25%;
          bottom: -220px;
          background: radial-gradient(circle at 30% 30%, rgba(251,113,133,0.40), transparent 60%);
          animation-duration: 20s;
        }
        @keyframes hero-drift {
          0% { transform: translate3d(0,0,0) scale(1); }
          100% { transform: translate3d(28px,-18px,0) scale(1.05); }
        }

        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .hero-glass, .hero-glass-soft {
            background: rgba(255,255,255,0.78);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-orb {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
