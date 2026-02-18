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
        "rounded-2xl p-5 shadow-xl shadow-black/15",
        getGlassVariantClass(variant),
        hover && "glass-hover hover-lift hover-specular",
        className
      )}
      {...props}
    >
      <div className="glass-content">{children}</div>
    </div>
  );
}
