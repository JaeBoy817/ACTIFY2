import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ArrowRight, Building2, Mail, ShieldCheck, UserRound } from "lucide-react";

import { MattePanel } from "@/components/public/PublicPrimitives";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import { isClerkBackendConfigured, isClerkConfigured } from "@/lib/clerk-config";

function ClerkUnavailableCard() {
  return (
    <MattePanel className="border-zinc-700 bg-zinc-900 p-6 text-zinc-100">
      <h2 className="text-xl font-semibold">Authentication is currently unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Clerk is not configured in this environment. Add your Clerk keys and try again.
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

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_16%_0%,#23345d_0%,#101522_42%,#0a0d14_100%)] text-zinc-100">
      <div className="mx-auto grid w-full max-w-[1260px] gap-6 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-zinc-700 bg-[linear-gradient(160deg,#111724_0%,#0c111b_62%,#0a0d14_100%)] p-7 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)] md:p-10">
          <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Actify Access Control</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-[1.03] text-white md:text-6xl">
              Sign in to your
              <br />
              workspace.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300">
              Continue to your dashboard, calendar, attendance, and resident workflows.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Secure Sign In</p>
              <p className="mt-2 text-sm text-zinc-200">Facility data stays protected with role-based access controls.</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">Fast Access</p>
              <p className="mt-2 text-sm text-zinc-200">Create an account directly and start using Actify immediately.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              HIPAA-minded workflow
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <Building2 className="h-3.5 w-3.5 text-blue-300" />
              Facility-level approval
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <UserRound className="h-3.5 w-3.5 text-violet-300" />
              Role-based access
            </span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-[#f6f2e9] p-6 text-zinc-900 shadow-[0_30px_64px_-42px_rgba(15,23,42,0.8)] md:p-8">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Welcome Back</p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-950">Sign in</h2>
              <p className="mt-2 text-sm text-zinc-600">Use your account credentials to continue.</p>
            </div>

            {isClerkConfigured && isClerkBackendConfigured ? (
              <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl="/sign-up"
                forceRedirectUrl="/app"
                appearance={actifyClerkAppearance}
              />
            ) : (
              <ClerkUnavailableCard />
            )}

            <div className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Need an account?</p>
              <p className="mt-1">Create one now and start your workspace setup.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
                >
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="mailto:actifysupport@gmail.com?subject=Actify%20Access%20Request"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-200"
                >
                  <Mail className="h-4 w-4" />
                  Email Support
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
