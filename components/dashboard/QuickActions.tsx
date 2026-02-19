"use client";

import Link from "next/link";
import { useEffect, type ComponentType } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  ClipboardPenLine,
  FileText,
  HeartHandshake,
  Stethoscope,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/glass/GlassCard";
import type { DashboardPreferences } from "@/components/dashboard/DashboardSettingsPanel";
import { useDashboardPreferences } from "@/components/dashboard/DashboardSettingsPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type QuickActionIcon = "calendar" | "attendance" | "residents" | "new-note" | "one-on-one" | "care-plan" | "reports";

export type DashboardQuickAction = {
  href: string;
  label: string;
  hint: string;
  icon: QuickActionIcon;
  requiresPreference?: keyof DashboardPreferences;
};

const iconMap: Record<QuickActionIcon, ComponentType<{ className?: string }>> = {
  calendar: CalendarDays,
  attendance: ClipboardCheck,
  residents: Users,
  "new-note": ClipboardPenLine,
  "one-on-one": HeartHandshake,
  "care-plan": Stethoscope,
  reports: FileText
};

const colorMap: Record<QuickActionIcon, string> = {
  calendar: "from-blue-500/30 to-indigo-500/10 text-blue-700",
  attendance: "from-emerald-500/30 to-teal-500/10 text-emerald-700",
  residents: "from-violet-500/30 to-fuchsia-500/10 text-violet-700",
  "new-note": "from-rose-500/30 to-orange-400/10 text-rose-700",
  "one-on-one": "from-amber-500/30 to-orange-500/10 text-amber-700",
  "care-plan": "from-cyan-500/30 to-blue-500/10 text-cyan-700",
  reports: "from-slate-500/30 to-indigo-400/10 text-slate-700"
};

export function QuickActions({ actions }: { actions: DashboardQuickAction[] }) {
  const router = useRouter();
  const { preferences } = useDashboardPreferences();
  const visibleActions = actions.filter((action) => {
    if (!action.requiresPreference) return true;
    return Boolean(preferences[action.requiresPreference]);
  });

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const runPrefetch = () => {
      visibleActions.forEach((action, index) => {
        setTimeout(() => {
          router.prefetch(action.href);
        }, index * 90);
      });
    };

    if (typeof win.requestIdleCallback === "function") {
      const idleId = win.requestIdleCallback(runPrefetch, { timeout: 1200 });
      return () => {
        if (typeof win.cancelIdleCallback === "function") {
          win.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = setTimeout(runPrefetch, 220);
    return () => clearTimeout(timer);
  }, [router, visibleActions]);

  return (
    <GlassCard variant="dense" className="rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider delayDuration={120}>
          {visibleActions.map((action) => {
            const Icon = iconMap[action.icon];
            return (
              <Tooltip key={action.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={action.href}
                    onMouseEnter={() => router.prefetch(action.href)}
                    onFocus={() => router.prefetch(action.href)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/65 px-3 py-2 text-sm text-foreground transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br ${colorMap[action.icon]}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{action.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{action.hint}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </GlassCard>
  );
}
