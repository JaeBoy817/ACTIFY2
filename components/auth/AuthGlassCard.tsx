import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthGlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "auth-card-entrance relative w-full max-w-[34rem] overflow-hidden rounded-[2rem] border border-white/30 bg-white/10 p-6 shadow-[0_40px_90px_-50px_rgba(15,23,42,0.75)] backdrop-blur-[18px] md:p-7",
        className
      )}
    >
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.03)_100%)]" />
      <div aria-hidden className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-cyan-200/22 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-indigo-300/18 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
