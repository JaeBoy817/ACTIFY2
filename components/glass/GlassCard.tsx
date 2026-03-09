import * as React from "react";

import { cn } from "@/lib/utils";
import { getGlassVariantClass, type GlassVariant } from "@/components/glass/variants";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  hover?: boolean;
}

export function GlassCard({ className, variant = "default", hover = false, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "nb-surface nb-card rounded-2xl p-5",
        getGlassVariantClass(variant),
        hover && "nb-hover-lift",
        className
      )}
      {...props}
    >
      <div className="glass-content">{children}</div>
    </div>
  );
}
