import Link from "next/link";
import { BellRing, CalendarDays, Search, Sparkles, UserRound } from "lucide-react";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { Input } from "@/components/ui/input";

export function DashboardHeader({
  welcomeText,
  dateLabel,
  statusLine
}: {
  welcomeText: string;
  dateLabel: string;
  statusLine: string;
}) {
  return (
    <GlassPanel variant="warm" className="relative overflow-hidden rounded-3xl p-4 md:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-cyan-500 to-violet-500" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/16 via-violet-400/10 to-emerald-300/14" />
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-fuchsia-400/38 via-violet-400/24 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-gradient-to-br from-cyan-400/35 via-emerald-300/24 to-transparent blur-3xl" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="font-[var(--font-display)] text-3xl text-foreground">{welcomeText}</h1>
          <p className="text-sm text-foreground/70">{dateLabel}</p>
          <p className="text-sm text-foreground/70">{statusLine}</p>
        </div>

        <form action="/app/residents" className="w-full max-w-xl">
          <label htmlFor="dashboard-search" className="sr-only">
            Search residents
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
            <Input
              id="dashboard-search"
              name="q"
              placeholder="Search residents, notes, or room..."
              className="h-11 rounded-2xl border-white/45 bg-gradient-to-r from-white/90 via-white/85 to-cyan-50/80 pl-10"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 self-end lg:self-center">
          <Link
            href="/app/calendar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-gradient-to-br from-blue-500/36 via-indigo-500/25 to-cyan-400/28 text-foreground transition hover:brightness-110"
            aria-label="Open calendar"
          >
            <CalendarDays className="h-4 w-4 text-blue-700" />
          </Link>
          <Link
            href="/app/notifications"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-gradient-to-br from-emerald-500/36 via-teal-500/25 to-cyan-400/28 text-foreground transition hover:brightness-110"
            aria-label="Open notifications"
          >
            <BellRing className="h-4 w-4 text-emerald-700" />
          </Link>
          <Link
            href="/app/residents"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-gradient-to-br from-violet-500/36 via-fuchsia-500/25 to-rose-400/24 text-foreground transition hover:brightness-110"
            aria-label="Open residents"
          >
            <UserRound className="h-4 w-4 text-violet-700" />
          </Link>
          <Link
            href="/app/analytics"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/45 bg-gradient-to-br from-rose-500/34 via-orange-500/22 to-amber-400/28 text-foreground transition hover:brightness-110"
            aria-label="Open analytics"
          >
            <Sparkles className="h-4 w-4 text-rose-700" />
          </Link>
        </div>
      </div>
    </GlassPanel>
  );
}
