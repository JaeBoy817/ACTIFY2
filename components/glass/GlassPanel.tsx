import * as React from "react";

import { cn } from "@/lib/utils";
import { getGlassVariantClass, type GlassVariant } from "@/components/glass/variants";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  hover?: boolean;
}

export function GlassPanel({ className, variant = "warm", hover = false, children, ...props }: GlassPanelProps) {
  return (
    <section
      className={cn(
        "liquid-shadow-float liquid-chroma-surface rounded-3xl p-6 shadow-xl shadow-black/15 md:p-8",
        getGlassVariantClass(variant),
        hover && "glass-hover hover-lift hover-specular",
        className
      )}
      {...props}
    >
      <div className="glass-content">{children}</div>
    </section>
  );
}
