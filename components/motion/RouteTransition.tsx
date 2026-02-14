"use client";

import { usePathname } from "next/navigation";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

export function RouteTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <div key={pathname} className={cn(!reducedMotion && "route-transition-enter", className)}>
      {children}
    </div>
  );
}
