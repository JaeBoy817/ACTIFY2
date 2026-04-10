import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AlertTriangle, ArrowRight, Building2, Bug, Mail, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { MattePanel } from "@/components/public/PublicPrimitives";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import {
  clerkDiagnostics,
  clerkSignInFallbackRedirectUrl,
  clerkSignUpUrl,
  isClerkBackendConfigured,
  isClerkConfigured
} from "@/lib/clerk-config";

type SearchParams = Record<string, string | string[] | undefined>;

function paramToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function ClerkUnavailableCard() {
  return (
    <MattePanel className="border-zinc-700 bg-zinc-900 p-6 text-zinc-100">
      <h2 className="text-xl font-semibold">Authentication is currently unavailable</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Clerk is not configured in this environment. Add your Clerk keys and try again.
      </p>
      {clerkDiagnostics.length ? (
        <ul className="mt-3 space-y-1 text-sm text-zinc-300">
          {clerkDiagnostics.map((item) => (
            <li key={item.message} className="flex gap-2">
              <span className={item.level === "error" ? "text-rose-300" : "text-amber-300"}>{item.level.toUpperCase()}:</span>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
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

function DevAuthDebugCard({ redirectUrl, authFlag }: { redirectUrl: string; authFlag: string }) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <MattePanel className="mt-4 border-zinc-700 bg-zinc-900 p-4 text-zinc-100">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
        <Bug className="h-3.5 w-3.5 text-blue-300" />
        Auth Debug (Development Only)
      </p>
      <ul className="mt-3 space-y-1 text-xs text-zinc-300">
        <li>Path: /sign-in</li>
        <li>Clerk configured: {String(isClerkConfigured)}</li>
        <li>Clerk backend configured: {String(isClerkBackendConfigured)}</li>
        <li>redirect_url: {redirectUrl || "(none)"}</li>
        <li>auth flag: {authFlag || "(none)"}</li>
      </ul>
      <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-300">
        If Clerk still renders a Request Access state, update Clerk dashboard settings:
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Enable Email + Password under Sign-in methods.</li>
          <li>Disable waitlist/restricted sign-up for this environment.</li>
          <li>Confirm this deploy uses the same Clerk instance keys as your dashboard settings.</li>
        </ol>
      </div>
    </MattePanel>
  );
}

export default async function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  if (isClerkBackendConfigured) {
    try {
      const { userId } = await auth();
      if (userId) {
        redirect("/dashboard");
      }
    } catch (error) {
      console.error("[sign-in] auth precheck failed; rendering sign-in page", {
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  const redirectUrl = paramToString(searchParams?.redirect_url);
  const authFlag = paramToString(searchParams?.auth);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100">
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
              <p className="mt-2 text-sm text-zinc-200">Use email + password to access your dashboard immediately.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              HIPAA-minded workflow
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-semibold text-zinc-200">
              <Building2 className="h-3.5 w-3.5 text-blue-300" />
              Multi-facility ready
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

            {authFlag === "unconfigured" ? (
              <div className="inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                Authentication keys are missing for this environment. Configure Clerk keys and reload.
              </div>
            ) : null}

            {isClerkConfigured && isClerkBackendConfigured ? (
              <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl={clerkSignUpUrl}
                fallbackRedirectUrl={clerkSignInFallbackRedirectUrl}
                appearance={actifyClerkAppearance}
              />
            ) : (
              <ClerkUnavailableCard />
            )}

            <div className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">Need an account?</p>
              <p className="mt-1">Sign up now and start your workspace setup.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={clerkSignUpUrl}
                  className="inline-flex items-center gap-2 rounded-xl border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
                >
                  Sign Up
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

            <DevAuthDebugCard redirectUrl={redirectUrl} authFlag={authFlag} />
          </div>
        </section>
      </div>
    </div>
  );
}
