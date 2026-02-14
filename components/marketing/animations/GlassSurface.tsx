"use client";

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type GlassSurfaceVariant = "default" | "warm" | "dense";

type GlassSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: GlassSurfaceVariant;
};

export function GlassSurface({ className, children, variant = "default", ...props }: GlassSurfaceProps) {
  const variantClass = variant === "warm" ? "glass-warm" : variant === "dense" ? "glass-dense" : "glass";

  return (
    <div
      className={cn("relative overflow-hidden rounded-3xl p-6 md:p-7", variantClass, className)}
      {...props}
    >
      <div className="glass-content relative z-10">{children}</div>
    </div>
  );
}
