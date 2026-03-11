import { cn } from "@/lib/utils";

export function AttendanceDarkSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-white/10 bg-[linear-gradient(120deg,#0b1326_0%,#101b33_50%,#0a1224_100%)]",
        className
      )}
    />
  );
}

