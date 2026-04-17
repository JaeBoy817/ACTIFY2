"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Sparkles, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

type WorkspaceTab = {
  href: string;
  label: string;
  helpText: string;
  icon: React.ComponentType<{ className?: string }>;
};

const WORKSPACE_TABS: WorkspaceTab[] = [
  {
    href: "/app",
    label: "AI Assistant",
    helpText: "Ask Actify for ideas, notes, and planning support.",
    icon: Sparkles
  },
  {
    href: "/residents",
    label: "Residents",
    helpText: "Quick resident snapshots and engagement planning.",
    icon: UserRound
  },
  {
    href: "/calendar-creation",
    label: "Calendar",
    helpText: "Plan activities by month, week, and day.",
    icon: CalendarDays
  }
];

export function MainTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary workspace tabs" className="mt-4">
      <ul className="flex flex-wrap gap-2">
        {WORKSPACE_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                title={tab.helpText}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
