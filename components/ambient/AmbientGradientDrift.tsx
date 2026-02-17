import { cn } from "@/lib/utils";

export function AmbientGradientDrift({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("ambient-bg", className)}>
      <span className="ambient-blob ambient-blob-a" />
      <span className="ambient-blob ambient-blob-b" />
      <span className="ambient-blob ambient-blob-c" />
      <span className="ambient-blob ambient-blob-d" />
    </div>
  );
}

