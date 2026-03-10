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
        "inline-flex items-center rounded-full border border-[#2f3b5c] bg-[linear-gradient(180deg,#0f182a_0%,#0b1423_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
            item.active
              ? "bg-[linear-gradient(180deg,#3558b8_0%,#284896_100%)] text-white shadow-[0_10px_16px_-12px_rgba(37,99,235,0.95)]"
              : "text-[#a9bbdf] hover:bg-white/5 hover:text-[#dbe7ff]"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
