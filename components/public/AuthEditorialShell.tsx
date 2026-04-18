import Link from "next/link";
import { CalendarDays, ClipboardCheck, FileText, Users } from "lucide-react";

import { ActifyLogo } from "@/components/branding/ActifyLogo";
import {
  AccentTag,
  Eyebrow,
  MattePanel,
  PrimaryCta,
  PublicContainer,
  SecondaryCta
} from "@/components/public/PublicPrimitives";

export function AuthEditorialShell({
  mode,
  children
}: {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
}) {
  const heading = mode === "sign-in" ? "Welcome back." : "Create your workspace.";
  const subcopy =
    mode === "sign-in"
      ? "Pick up where your department left off."
      : "Get your activity department organized in one place.";

  return (
    <div className="min-h-screen bg-transparent text-zinc-100">
      <PublicContainer className="py-6 md:py-10">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <ActifyLogo variant="icon" size={34} />
            <span className="font-[var(--font-brand)] text-sm tracking-[0.14em]">ACTIFY</span>
          </Link>
          <SecondaryCta
            href="/"
            className="h-10 border-zinc-700 bg-zinc-800 px-4 text-xs uppercase tracking-[0.12em]"
          >
            Back Home
          </SecondaryCta>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <MattePanel className="border-zinc-800 bg-zinc-900 p-7 text-zinc-100 md:p-9">
            <div className="space-y-4">
              <Eyebrow className="text-zinc-400">Actify Access</Eyebrow>
              <h1 className="font-[var(--font-display)] text-4xl leading-[1.02] md:text-6xl">
                {heading}
              </h1>
              <p className="max-w-xl text-base leading-7 text-zinc-300">{subcopy}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <MattePanel className="border-zinc-800 bg-zinc-800 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Calendar + Attendance
                  </p>
                  <p className="mt-2 text-sm text-zinc-200">
                    Run the day, mark participation, and close documentation faster.
                  </p>
                </MattePanel>
                <MattePanel className="border-zinc-800 bg-zinc-800 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Notes + Care Plans
                  </p>
                  <p className="mt-2 text-sm text-zinc-200">
                    Keep 1:1 follow-up, barriers, and care plan evidence aligned.
                  </p>
                </MattePanel>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <AccentTag icon={CalendarDays} label="Scheduling" className="border-zinc-700 bg-zinc-800 text-zinc-200" />
                <AccentTag icon={ClipboardCheck} label="Attendance" className="border-zinc-700 bg-zinc-800 text-zinc-200" />
                <AccentTag icon={FileText} label="Documentation" className="border-zinc-700 bg-zinc-800 text-zinc-200" />
                <AccentTag icon={Users} label="Residents" className="border-zinc-700 bg-zinc-800 text-zinc-200" />
              </div>
            </div>
          </MattePanel>

          <MattePanel className="border-zinc-200 bg-[#f4f1ea] p-5 text-zinc-900 md:p-7">
            <div id="auth-content" className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {mode === "sign-in" ? "Sign In" : "Sign Up"}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Secure access for facility teams. Your workflow and data stay exactly where you left them.
                </p>
              </div>
              {children}
              {mode === "sign-in" ? (
                <PrimaryCta href="/sign-up" className="w-full justify-center">
                  Request Access
                </PrimaryCta>
              ) : (
                <PrimaryCta href="/sign-in" className="w-full justify-center">
                  Already have access? Sign in
                </PrimaryCta>
              )}
            </div>
          </MattePanel>
        </div>
      </PublicContainer>
    </div>
  );
}
