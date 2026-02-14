import * as React from "react";

import { cn } from "@/lib/utils";
import { getGlassVariantClass, type GlassVariant } from "@/components/glass/variants";

interface GlassSidebarProps extends React.HTMLAttributes<HTMLElement> {
  variant?: GlassVariant;
}

export function GlassSidebar({ className, variant = "dense", children, ...props }: GlassSidebarProps) {
  return (
    <aside className={cn("rounded-2xl p-4", getGlassVariantClass(variant), className)} {...props}>
      <div className="glass-content">{children}</div>
    </aside>
  );
}
