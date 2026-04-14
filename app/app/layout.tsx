import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Bell, Search, Settings2 } from "lucide-react";

import { ActifyLogo } from "@/components/ActifyLogo";
import { redirectIfNoAppAccessForUser } from "@/lib/access-control";
import { ensureUserAndFacility } from "@/lib/auth";
import { actifyUserButtonAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";

export const dynamic = "force-dynamic";

function firstNameFromName(name: string | null | undefined) {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function formatToday(timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timeZone || "America/Chicago"
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUserAndFacility();
  await redirectIfNoAppAccessForUser(user, { blockedRedirectPath: "/subscribe" });

  const firstName = firstNameFromName(user.name);
  const todayLabel = formatToday(user.facility.timezone);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_8%,rgba(186,230,253,0.45),transparent_35%),radial-gradient(circle_at_88%_15%,rgba(187,247,208,0.36),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-8 pt-4 md:px-6 lg:px-8">
        <header className="mb-5 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_28px_58px_-42px_rgba(15,23,42,0.5)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-[220px] items-center gap-3">
              <Link href="/app" className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                <ActifyLogo variant="icon" size={38} aria-label="Actify home" />
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actify Assistant Workspace</p>
                <p className="text-lg font-semibold text-slate-900">Good morning, {firstName}</p>
              </div>
            </div>

            <div className="flex min-w-[260px] flex-1 items-center gap-2 md:max-w-md">
              <label className="relative w-full">
                <span className="sr-only">Quick search</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  placeholder="Quick search prompts, tools, residents..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                />
              </label>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:inline-flex">
                {todayLabel}
              </span>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
              <Link
                href="/app/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                aria-label="Open settings"
              >
                <Settings2 className="h-4 w-4" />
              </Link>
              {isClerkConfigured ? (
                <UserButton afterSignOutUrl="/signed-out" appearance={actifyUserButtonAppearance} />
              ) : (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Auth setup needed
                </span>
              )}
            </div>
          </div>
        </header>

        <main id="app-main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
