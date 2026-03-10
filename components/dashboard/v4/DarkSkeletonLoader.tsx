import { cn } from "@/lib/utils";

export function DarkSkeletonLoader({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-[#18233a]", className)} aria-hidden />;
}
