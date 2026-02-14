"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { ActifyLogo } from "@/components/ActifyLogo";
import type { AuthVariantProps } from "@/components/auth/types";
import { GlassSurface } from "@/components/marketing/animations/GlassSurface";

export function CenterStage({ mode, reducedMotion, children }: AuthVariantProps) {
  const title = mode === "sign-in" ? "Welcome back to ACTIFY" : "Create your ACTIFY account";
  const subtitle =
    mode === "sign-in"
      ? "Sign in to continue your activity workflow."
      : "Get your workspace ready for scheduling, notes, and monthly reports.";
  const authSwitchHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const authSwitchText = mode === "sign-in" ? "Don't have an account?" : "Already have an account?";
  const authSwitchCta = mode === "sign-in" ? "Sign up" : "Sign in";

  return (
    <div className="relative mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[12%] h-60 w-60 rounded-full bg-actifyBlue/14 blur-3xl" />
        <div className="absolute right-[10%] top-[18%] h-64 w-64 rounded-full bg-actifyMint/14 blur-3xl" />
      </div>

      <section id="auth-content" className="relative z-10 w-full max-w-[480px] space-y-4">
        <div className="inline-flex items-center gap-3">
          <ActifyLogo variant="icon" size={42} />
          <div className="space-y-0.5">
            <h1 className="text-2xl text-foreground">{title}</h1>
            <p className="text-sm text-foreground/68">{subtitle}</p>
          </div>
        </div>

        <GlassSurface variant="dense" className="rounded-3xl border border-white/75 p-4 md:p-6">
          {!reducedMotion ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-[40%] opacity-[0.14]"
              style={{
                background:
                  "linear-gradient(122deg, transparent 38%, rgba(255,255,255,0.45) 50%, transparent 62%)"
              }}
              animate={{ x: ["-60%", "52%"] }}
              transition={{ duration: 10.5, ease: "linear", repeat: Infinity, repeatDelay: 2 }}
            />
          ) : null}
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

        <div className="flex items-center justify-between px-1 text-xs text-foreground/65">
          <span>ACTIFY</span>
          <div className="inline-flex items-center gap-3">
            <Link href="/privacy" className="hover:text-actifyBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-actifyBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
