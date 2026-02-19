import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function IconBadge({
  icon: Icon,
  className,
  size = "md"
}: {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md";
}) {
  const isSmall = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/35 bg-gradient-to-br shadow-sm shadow-black/10",
        isSmall ? "h-8 w-8" : "h-10 w-10",
        className
      )}
    >
      <Icon className={cn(isSmall ? "h-4 w-4" : "h-5 w-5")} />
    </span>
  );
}
