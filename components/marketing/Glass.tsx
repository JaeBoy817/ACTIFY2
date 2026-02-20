import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type GlassTone = "default" | "strong";

function getToneClass(tone: GlassTone) {
  if (tone === "strong") {
    return "bg-white/10 border-white/18";
  }
  return "bg-white/8 border-white/15";
}

export function GlassCard({
  className,
  tone = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: GlassTone }) {
  return (
    <div
      className={cn(
        "marketing-glass rounded-2xl border shadow-[0_12px_34px_-24px_rgba(15,23,42,0.4)] backdrop-blur-md",
        getToneClass(tone),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassPanel({
  className,
  tone = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: GlassTone }) {
  return (
    <section
      className={cn(
        "marketing-glass rounded-3xl border p-6 shadow-[0_12px_34px_-24px_rgba(15,23,42,0.4)] backdrop-blur-md md:p-8",
        getToneClass(tone),
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function GlassButton({
  className,
  asChild = false,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary";
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        "hover:-translate-y-[2px]",
        variant === "primary"
          ? "border-white/25 bg-slate-900 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.65)]"
          : "border-white/18 bg-white/12 text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]",
        className
      )}
      {...props}
    />
  );
}
