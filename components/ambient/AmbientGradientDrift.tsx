import { cn } from "@/lib/utils";

export function AmbientGradientDrift({ className }: { className?: string }) {
  return <div aria-hidden className={cn("actify-global-background", className)} />;
}
