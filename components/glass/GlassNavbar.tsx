import * as React from "react";

import { cn } from "@/lib/utils";
import { getGlassVariantClass, type GlassVariant } from "@/components/glass/variants";

interface GlassNavbarProps extends React.HTMLAttributes<HTMLElement> {
  variant?: GlassVariant;
}

export function GlassNavbar({ className, variant = "dense", children, ...props }: GlassNavbarProps) {
  return (
    <header className={cn("rounded-2xl px-5 py-3", getGlassVariantClass(variant), className)} {...props}>
      <div className="glass-content">{children}</div>
    </header>
  );
}
