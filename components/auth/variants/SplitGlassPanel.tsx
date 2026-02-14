"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarCheck2, FileCheck2, NotebookPen, ShieldCheck, UserCog } from "lucide-react";

import { ActifyLogo } from "@/components/ActifyLogo";
import { HeatmapGridOverlay } from "@/components/auth/HeatmapGridOverlay";
import type { AuthVariantProps } from "@/components/auth/types";
import { GlassSurface } from "@/components/marketing/animations/GlassSurface";

const signInValuePills = [
  { label: "Progress notes in seconds", icon: NotebookPen },
  { label: "Templates + printables in one click", icon: CalendarCheck2 },
  { label: "Attendance + barriers that inform care", icon: FileCheck2 }
] as const;

const signUpValuePills = [
  { label: "Set your activity workflow in minutes", icon: NotebookPen },
  { label: "Keep attendance and notes connected", icon: CalendarCheck2 },
  { label: "Export-ready reports for leadership", icon: FileCheck2 }
] as const;

const trustItems = [
  { label: "Role-based access", icon: UserCog },
  { label: "Audit trail", icon: ShieldCheck },
  { label: "Export-ready", icon: FileCheck2 }
] as const;

export function SplitGlassPanel({ mode, reducedMotion, children }: AuthVariantProps) {
  const title = mode === "sign-in" ? "Welcome back." : "Create your ACTIFY account.";
  const subtitle =
    mode === "sign-in"
      ? "Sign in to continue with your daily activity workflow."
      : "Set up your workspace for calm scheduling, documentation, and reporting.";
  const valuePills = mode === "sign-in" ? signInValuePills : signUpValuePills;
  const authSwitchHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const authSwitchText = mode === "sign-in" ? "Don't have an account?" : "Already have an account?";
  const authSwitchCta = mode === "sign-in" ? "Sign up" : "Sign in";

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:py-10">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.14fr)_minmax(420px,0.9fr)]">
        <GlassSurface variant="warm" className="relative min-h-[220px] overflow-hidden rounded-3xl p-6 md:p-8 lg:min-h-[560px]">
          <div className="absolute inset-0 bg-[#FFF7ED]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(37,99,235,0.2)_0%,rgba(37,99,235,0.14)_36%,rgba(45,212,191,0.16)_70%,rgba(251,113,133,0.12)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,255,255,0.34)_0%,transparent_56%),radial-gradient(circle_at_84%_82%,rgba(255,255,255,0.2)_0%,transparent_52%)]" />
          <HeatmapGridOverlay reducedMotion={reducedMotion} className="opacity-35" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_52%)]" />
          {!reducedMotion ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-[38%] opacity-[0.1]"
              style={{
                background:
                  "linear-gradient(118deg, transparent 36%, rgba(255,255,255,0.3) 50%, transparent 64%)"
              }}
              animate={{ x: ["-62%", "56%"] }}
              transition={{ duration: 9.4, ease: "linear", repeat: Infinity, repeatDelay: 1.8 }}
            />
          ) : null}

          <div className="relative z-10 flex h-full flex-col gap-6">
            <div className="space-y-4">
              <div className="inline-flex w-fit items-center rounded-full border border-white/50 bg-white/48 px-3 py-1 text-xs font-medium text-foreground/78">
                {mode === "sign-in" ? "Secure Sign In" : "Create Workspace Access"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/46 px-3 py-2 text-foreground/82">
                <ActifyLogo variant="icon" size={32} aria-label="ACTIFY logo" />
                <span className="font-[var(--font-brand)] text-sm tracking-[0.12em] text-foreground/84">ACTIFY</span>
              </div>
              <div className="max-w-xl space-y-2 text-foreground">
                <h1 className="text-3xl leading-tight md:text-4xl text-foreground">{title}</h1>
                <p className="text-sm leading-relaxed text-foreground/72 md:text-base">{subtitle}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {valuePills.map((pill) => (
                <div key={pill.label} className="inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/56 px-3 py-2 text-sm text-foreground/78">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-actifyBlue/14 text-actifyBlue">
                    <pill.icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{pill.label}</span>
                </div>
              ))}
            </div>
            <div className="hidden rounded-2xl border border-white/60 bg-white/54 p-4 lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/72">Today in ACTIFY</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-xl border border-white/60 bg-white/56 px-3 py-2">
                  <p className="text-[11px] text-foreground/62">Scheduled activities</p>
                  <p className="mt-1 text-lg text-foreground">10</p>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/56 px-3 py-2">
                  <p className="text-[11px] text-foreground/62">Attendance marked</p>
                  <p className="mt-1 text-lg text-foreground">56</p>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/56 px-3 py-2">
                  <p className="text-[11px] text-foreground/62">1:1 notes completed</p>
                  <p className="mt-1 text-lg text-foreground">22</p>
                </div>
              </div>
            </div>
          </div>
        </GlassSurface>

        <section id="auth-content" className="flex flex-col justify-center gap-3 lg:pl-1 lg:max-w-[560px] lg:justify-self-end">
          <GlassSurface variant="dense" className="rounded-3xl border border-white/80 p-4 shadow-[0_26px_50px_-34px_rgba(17,24,39,0.45)] md:p-6">
            <div className="mb-4 flex items-center justify-between rounded-xl border border-white/70 bg-white/74 px-3 py-2.5 text-xs text-foreground/70">
              <span>{mode === "sign-in" ? "Sign in to your facility workspace" : "Create your facility workspace account"}</span>
              <span className="rounded-full bg-actifyBlue/12 px-2 py-0.5 font-medium text-actifyBlue">Secure</span>
            </div>
            <div className="actify-auth-clerk [&_.cl-badge]:!border [&_.cl-badge]:!border-actifyBlue/20 [&_.cl-badge]:!bg-actifyBlue/10 [&_.cl-badge]:!text-actifyBlue [&_.cl-card]:!bg-transparent [&_.cl-card]:!shadow-none [&_.cl-card]:!border-0 [&_.cl-cardBox]:!w-full [&_.cl-formButtonPrimary]:!font-semibold [&_.cl-footer]:!bg-transparent [&_.cl-footer]:!shadow-none [&_.cl-footer]:!border-0">
              {children}
            </div>
            <div className="mt-4 rounded-xl border border-white/70 bg-white/72 px-3 py-2.5 text-sm text-foreground/68">
              <span>{authSwitchText} </span>
              <Link href={authSwitchHref} className="font-semibold text-actifyBlue hover:text-actifyBlue/80">
                {authSwitchCta}
              </Link>
            </div>
          </GlassSurface>
          <GlassSurface variant="dense" className="rounded-2xl border border-white/70 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="inline-flex items-center gap-2 text-xs text-foreground/75">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-actifyBlue/15 text-actifyBlue">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </div>
                );
              })}
            </div>
          </GlassSurface>
          <div className="px-1 text-xs text-foreground/65">
            <Link href="/privacy" className="hover:text-actifyBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              Privacy
            </Link>
            <span className="px-1.5">•</span>
            <Link href="/terms" className="hover:text-actifyBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              Terms
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
