import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { CircleDot, Settings } from "lucide-react";

import { ActifyLogo } from "@/components/branding/ActifyLogo";
import { MainTabs } from "@/components/workspace/MainTabs";
import { actifyUserButtonAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";

export function WorkspaceLayoutShell({
  firstName,
  todayLabel,
  children
}: {
  firstName: string;
  todayLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_8%,rgba(186,230,253,0.45),transparent_35%),radial-gradient(circle_at_88%_15%,rgba(187,247,208,0.36),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <header className="mb-5 rounded-[2rem] border border-white/70 bg-white/82 p-4 shadow-[0_28px_58px_-42px_rgba(15,23,42,0.5)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-[240px] items-center gap-3">
              <Link href="/app" className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                <ActifyLogo variant="lockup" size={34} aria-label="Actify home" />
              </Link>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actify Workspace</p>
                <p className="text-sm text-slate-700">
                  Welcome back, <span className="font-semibold text-slate-900">{firstName}</span>
                </p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden />
                Settings
              </Link>
              <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:inline-flex">
                <CircleDot className="h-3 w-3 fill-current" aria-hidden />
                Live Assistant
              </span>
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:inline-flex">
                {todayLabel}
              </span>
              {isClerkConfigured ? (
                <UserButton afterSignOutUrl="/signed-out" appearance={actifyUserButtonAppearance} />
              ) : (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Auth setup needed
                </span>
              )}
            </div>
          </div>

          <MainTabs />
        </header>

        <main id="app-main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
