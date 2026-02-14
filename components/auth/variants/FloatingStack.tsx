"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { ActifyLogo } from "@/components/ActifyLogo";
import type { AuthVariantProps } from "@/components/auth/types";
import { GlassSurface } from "@/components/marketing/animations/GlassSurface";

type PaperRect = {
  x: number;
  y: number;
  rotate: number;
  width: number;
  height: number;
  tone: string;
};

const paperRects: PaperRect[] = [
  { x: -210, y: -170, rotate: -9, width: 140, height: 88, tone: "bg-actifyBlue/12" },
  { x: 196, y: -154, rotate: 8, width: 138, height: 84, tone: "bg-actifyMint/12" },
  { x: -244, y: 10, rotate: -6, width: 158, height: 96, tone: "bg-white/55" },
  { x: 224, y: 18, rotate: 7, width: 154, height: 94, tone: "bg-white/55" },
  { x: -160, y: 178, rotate: -8, width: 144, height: 88, tone: "bg-actifyCoral/10" },
  { x: 162, y: 184, rotate: 6, width: 144, height: 86, tone: "bg-actifyBlue/10" }
];

const alignedRects = [
  { x: -110, y: -112, rotate: 0 },
  { x: 38, y: -112, rotate: 0 },
  { x: -110, y: 2, rotate: 0 },
  { x: 38, y: 2, rotate: 0 },
  { x: -110, y: 116, rotate: 0 },
  { x: 38, y: 116, rotate: 0 }
] as const;

export function FloatingStack({ mode, reducedMotion, children }: AuthVariantProps) {
  const pathname = usePathname();
  const [aligning, setAligning] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    setAligning(true);
    const timer = window.setTimeout(() => setAligning(false), 340);
    return () => window.clearTimeout(timer);
  }, [pathname, reducedMotion]);

  const title = mode === "sign-in" ? "Sign in to ACTIFY" : "Create your ACTIFY account";
  const subtitle =
    mode === "sign-in"
      ? "Everything you need for notes, attendance, and reports."
      : "Start with one clean workflow, add tools as your team grows.";
  const authSwitchHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const authSwitchText = mode === "sign-in" ? "Don't have an account?" : "Already have an account?";
  const authSwitchCta = mode === "sign-in" ? "Sign up" : "Sign in";

  return (
    <div className="relative mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-10 md:min-h-screen md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-8 h-72 w-72 rounded-full bg-actifyBlue/16 blur-3xl" />
        <div className="absolute -right-16 top-20 h-72 w-72 rounded-full bg-actifyMint/16 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-actifyCoral/10 blur-3xl" />
      </div>

      <section id="auth-content" className="relative z-10 w-full max-w-xl">
        <div className="relative mb-5 flex items-center gap-3 px-1">
          <ActifyLogo variant="icon" size={38} />
          <div>
            <h1 className="text-2xl text-foreground">{title}</h1>
            <p className="text-sm text-foreground/68">{subtitle}</p>
          </div>
        </div>

        <div className="relative">
          {paperRects.map((rect, index) => {
            const aligned = alignedRects[index];
            const target = aligning
              ? { x: aligned.x, y: aligned.y, rotate: aligned.rotate }
              : reducedMotion
                ? { x: rect.x, y: rect.y, rotate: rect.rotate }
                : {
                    x: [rect.x - 4, rect.x + 4, rect.x - 4],
                    y: [rect.y - 3, rect.y + 3, rect.y - 3],
                    rotate: [rect.rotate - 1, rect.rotate + 1, rect.rotate - 1]
                  };

            return (
              <motion.div
                key={`floating-paper-${index}`}
                aria-hidden
                className={`pointer-events-none absolute left-1/2 top-1/2 hidden rounded-2xl border border-white/65 shadow-sm md:block ${rect.tone}`}
                style={{ width: rect.width, height: rect.height }}
                animate={target}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : aligning
                      ? { duration: 0.28, ease: "easeOut" as const }
                      : { duration: 12, ease: "easeInOut" as const, repeat: Infinity }
                }
              />
            );
          })}

          <GlassSurface variant="dense" className="relative rounded-3xl border border-white/75 p-4 md:p-6">
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
        </div>

        <div className="mt-3 px-1 text-xs text-foreground/65">
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
  );
}
