"use client";

import Link from "next/link";
import { Activity, ClipboardCheck, FileText, ListChecks, Users } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/app/attendance",
    label: "Quick Take",
    icon: ClipboardCheck
  },
  {
    href: "/app/attendance/sessions",
    label: "Sessions",
    icon: ListChecks
  },
  {
    href: "/app/attendance/residents",
    label: "Residents",
    icon: Users
  },
  {
    href: "/app/attendance/reports",
    label: "Reports",
    icon: FileText
  }
] as const;

export function AttendanceSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Attendance sections">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
              "border-white/35 bg-white/60 backdrop-blur hover:bg-white/80",
              active && "bg-[color:var(--actify-accent)]/15 text-foreground ring-1 ring-[color:var(--actify-accent)]/40"
            )}
          >
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full",
                active ? "bg-[color:var(--actify-accent)] text-white" : "bg-emerald-100 text-emerald-700"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            {item.label}
          </Link>
        );
      })}
      <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-300/70 bg-emerald-100/80 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Activity className="h-3.5 w-3.5" />
        Fresh Mint
      </span>
    </nav>
  );
}

