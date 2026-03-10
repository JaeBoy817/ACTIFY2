import Link from "next/link";

import { cn } from "@/lib/utils";

export type SegmentItem = {
  id: string;
  label: string;
  href: string;
  active?: boolean;
};

export function PremiumSegmentControl({
  items,
  className
}: {
  items: SegmentItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-emerald-900/65 bg-[linear-gradient(180deg,#11251c_0%,#0c1b14_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
            item.active
              ? "bg-[linear-gradient(180deg,#1e9f76_0%,#187457_100%)] text-white shadow-[0_10px_16px_-12px_rgba(16,185,129,0.95)]"
              : "text-emerald-100/75 hover:bg-white/5 hover:text-emerald-50"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
