"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ClipboardPen, FileChartColumnIncreasing, FileText, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  {
    href: "/app/documentation",
    label: "Overview",
    icon: ClipboardCheck
  },
  {
    href: "/app/documentation/progress-notes",
    label: "Progress Notes",
    icon: ClipboardPen
  },
  {
    href: "/app/documentation/one-to-one",
    label: "1:1 Notes",
    icon: UserRound
  },
  {
    href: "/app/documentation/uda",
    label: "UDA's",
    icon: FileText
  },
  {
    href: "/app/documentation/mds",
    label: "MDS",
    icon: FileChartColumnIncreasing
  }
] as const;

export function DocumentationSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation sections" className="flex flex-wrap gap-2">
      {LINKS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
              "border-[#2c4269] bg-[#0f1e36] text-[#bcd1f2] hover:border-[#4f6ea8] hover:text-white",
              active && "border-blue-300/45 bg-[linear-gradient(180deg,#203a6b_0%,#162d54_100%)] text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

