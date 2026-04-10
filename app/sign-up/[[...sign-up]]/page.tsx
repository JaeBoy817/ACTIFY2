import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, CalendarDays, ClipboardCheck, Users2 } from "lucide-react";

import { ForceClerkReauth } from "@/components/auth/ForceClerkReauth";
import { MattePanel } from "@/components/public/PublicPrimitives";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import {
  clerkSignInUrl,
  clerkSignUpFallbackRedirectUrl,
  isClerkBackendConfigured,
  isClerkConfigured
} from "@/lib/clerk-config";

function ClerkUnavailableCard() {
  return (
    <MattePanel className="border-zinc-700 bg-zinc-900 p-6 text-zinc-100">
      <h2 className="text-xl font-semibold">Account creation is currently unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Clerk is not configured in this environment. Add Clerk keys to enable sign-up.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
        >
          Back Home
        </Link>
      </div>
    </MattePanel>
  );
}

export default async function SignUpPage() {
  if (isClerkBackendConfigured) {
    try {
      const { userId } = await auth();
      if (userId) {
        return <ForceClerkReauth redirectTo="/sign-up" mode="sign-up" />;
      }
    } catch (error) {
      console.error("[sign-up] auth precheck failed; rendering sign-up page", {
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100">
      <div className="mx-auto grid w-full max-w-[1260px] gap-6 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-zinc-700 bg-[linear-gradient(160deg,#111724_0%,#0c111b_62%,#0a0d14_100%)] p-7 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)] md:p-10">
          <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Actify Onboarding</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-[1.03] text-white md:text-6xl">
              Create your
              <br />
              Actify account.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300">
              Set up your account and jump straight into scheduling, attendance, and resident documentation.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Calendar + Attendance</p>
              <p className="mt-2 text-sm text-zinc-200">Plan activities and track participation in one workflow.</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Notes + Care Plans</p>
              <p className="mt-2 text-sm text-zinc-200">Document daily notes and care updates quickly.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <CalendarDays className="h-3.5 w-3.5 text-blue-300" />
              Activity scheduling
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <Users2 className="h-3.5 w-3.5 text-emerald-300" />
              Resident workflows
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <ClipboardCheck className="h-3.5 w-3.5 text-violet-300" />
              Documentation ready
            </span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-[#f6f2e9] p-6 text-zinc-900 shadow-[0_30px_64px_-42px_rgba(15,23,42,0.8)] md:p-8">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Get Started</p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-950">Create account</h2>
              <p className="mt-2 text-sm text-zinc-600">Enter your details to create your Actify login.</p>
            </div>

            {isClerkConfigured && isClerkBackendConfigured ? (
              <SignUp
                path="/sign-up"
                routing="path"
                signInUrl={clerkSignInUrl}
                fallbackRedirectUrl={clerkSignUpFallbackRedirectUrl}
                appearance={actifyClerkAppearance}
              />
            ) : (
              <ClerkUnavailableCard />
            )}

            <div className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Already have an account?</p>
              <p className="mt-1">Sign in and continue where you left off.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={clerkSignInUrl}
                  className="inline-flex items-center gap-2 rounded-xl border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
