"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ClipboardCheck, ClipboardPenLine, FileText, Package, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { GlassCard } from "@/components/glass/GlassCard";
import type { ModuleFlags } from "@/lib/module-flags";

type QuickAction = {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
};

const actions: QuickAction[] = [
  {
    href: "/app/notes/new?type=general",
    label: "New Note",
    hint: "General documentation",
    icon: ClipboardPenLine,
    colorClass: "from-rose-500/30 to-orange-300/10 text-rose-700"
  },
  {
    href: "/app/templates/new",
    label: "New Template",
    hint: "Save workflow shortcuts",
    icon: FileText,
    colorClass: "from-violet-500/30 to-fuchsia-300/10 text-violet-700"
  },
  {
    href: "/app/residents",
    label: "Add Resident",
    hint: "Resident workspace",
    icon: Users,
    colorClass: "from-indigo-500/30 to-sky-300/10 text-indigo-700"
  },
  {
    href: "/app/volunteers",
    label: "Add Volunteer",
    hint: "Volunteer hub",
    icon: UserPlus,
    colorClass: "from-emerald-500/30 to-teal-300/10 text-emerald-700"
  },
  {
    href: "/app/dashboard/budget-stock?tab=stock",
    label: "Inventory Log",
    hint: "Quick stock updates",
    icon: Package,
    colorClass: "from-amber-500/30 to-orange-300/10 text-amber-700"
  },
  {
    href: "/app/attendance",
    label: "Take Attendance",
    hint: "Quick attendance flow",
    icon: ClipboardCheck,
    colorClass: "from-cyan-500/30 to-blue-300/10 text-cyan-700"
  }
];

export function QuickActionsCard({
  moduleFlags
}: {
  moduleFlags?: ModuleFlags["modules"];
}) {
  const router = useRouter();
  const visibleActions = actions.filter((action) => {
    if (!moduleFlags) return true;
    if (action.href.startsWith("/app/attendance")) return moduleFlags.attendanceTracking;
    if (action.href.startsWith("/app/notes")) return moduleFlags.notes;
    if (action.href.startsWith("/app/templates")) return moduleFlags.templates;
    if (action.href.startsWith("/app/residents")) return true;
    if (action.href.startsWith("/app/volunteers")) return moduleFlags.volunteers;
    if (action.href.includes("/budget-stock")) return moduleFlags.inventory;
    return true;
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
        }, index * 85);
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
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="-mx-5 -mt-5 mb-4 rounded-t-3xl border-b border-white/35 bg-gradient-to-r from-violet-500/24 via-fuchsia-500/18 to-cyan-500/24 px-5 py-3">
        <p className="text-sm font-semibold text-foreground/80">Fast Launch</p>
      </div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <p className="text-sm text-foreground/70">One-click shortcuts for common tasks.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              onMouseEnter={() => router.prefetch(action.href)}
              onFocus={() => router.prefetch(action.href)}
              className="group rounded-2xl border border-white/45 bg-gradient-to-r from-white/84 via-violet-100/35 to-cyan-100/35 p-3 transition hover:brightness-105"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-gradient-to-br ${action.colorClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
              </div>
              <p className="text-xs text-foreground/65 group-hover:text-foreground/80">{action.hint}</p>
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

export function QuickActionsCardSkeleton() {
  return (
    <GlassCard variant="dense" className="rounded-3xl p-5">
      <div className="mb-3 space-y-2">
        <div className="skeleton shimmer h-5 w-32 rounded" />
        <div className="skeleton shimmer h-3 w-44 rounded" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/40 bg-white/65 p-3">
            <div className="skeleton shimmer h-4 w-24 rounded" />
            <div className="mt-2 skeleton shimmer h-3 w-32 rounded" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
