import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type GlassTone = "default" | "strong";

function getToneClass(tone: GlassTone) {
  if (tone === "strong") {
    return "bg-zinc-900 text-zinc-50 border-zinc-700";
  }
  return "bg-white text-zinc-900 border-zinc-200";
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
        "rounded-2xl border shadow-[0_18px_36px_-28px_rgba(15,23,42,0.4)]",
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
        "rounded-3xl border p-6 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.4)] md:p-8",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/35",
        "hover:-translate-y-[2px]",
        variant === "primary"
          ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_22px_-16px_rgba(15,23,42,0.55)]"
          : "border-zinc-300 bg-zinc-100 text-zinc-900 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.3)]",
        className
      )}
      {...props}
    />
  );
}
