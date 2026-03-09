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
        "nb-surface nb-panel rounded-3xl p-6 md:p-8",
        getGlassVariantClass(variant),
        hover && "nb-hover-lift",
        className
      )}
      {...props}
    >
      <div className="glass-content">{children}</div>
    </section>
  );
}
