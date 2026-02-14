"use client";

import { motion } from "framer-motion";

import type { AuthShellProps } from "@/components/auth/types";
import { CenterStage } from "@/components/auth/variants/CenterStage";
import { FloatingStack } from "@/components/auth/variants/FloatingStack";
import { SplitGlassPanel } from "@/components/auth/variants/SplitGlassPanel";
import { useReducedMotionPreference } from "@/lib/hooks/useReducedMotionPreference";

export function AuthShell({ mode, variant, userReducedMotion, children }: AuthShellProps) {
  const { reducedMotion } = useReducedMotionPreference(userReducedMotion);

  const content =
    variant === "stack" ? (
      <FloatingStack mode={mode} reducedMotion={reducedMotion}>
        {children}
      </FloatingStack>
    ) : variant === "center" ? (
      <CenterStage mode={mode} reducedMotion={reducedMotion}>
        {children}
      </CenterStage>
    ) : (
      <SplitGlassPanel mode={mode} reducedMotion={reducedMotion}>
        {children}
      </SplitGlassPanel>
    );

  return (
    <div className="relative min-h-screen bg-actify-dashboard">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-6 h-72 w-72 rounded-full bg-actifyBlue/14 blur-3xl" />
        <div className="absolute -right-20 top-16 h-72 w-72 rounded-full bg-actifyMint/14 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-actifyCoral/10 blur-3xl" />
      </div>
      <a
        href="#auth-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to authentication form
      </a>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    </div>
  );
}
