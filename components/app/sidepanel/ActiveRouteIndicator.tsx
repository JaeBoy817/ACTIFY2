import { cn } from "@/lib/utils";

export function ActiveRouteIndicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full transition-all duration-200",
        active ? "bg-emerald-300 opacity-100" : "bg-transparent opacity-0"
      )}
    />
  );
}
