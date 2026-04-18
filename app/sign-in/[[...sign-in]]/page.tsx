import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AlertTriangle, Bug, Mail } from "lucide-react";

import { ForceClerkReauth } from "@/components/auth/ForceClerkReauth";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
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
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function ClerkUnavailableCard() {
  return (
    <article className="rounded-2xl border border-amber-200/45 bg-amber-50/90 p-4 text-amber-950 shadow-[0_18px_40px_-26px_rgba(146,64,14,0.45)]">
      <h2 className="text-base font-semibold">Authentication is unavailable right now</h2>
      <p className="mt-1.5 text-sm leading-6 text-amber-900/90">
        Clerk is not configured for this environment yet. Add keys and reload to enable sign in.
      </p>
      {clerkDiagnostics.length ? (
        <ul className="mt-3 space-y-1.5 text-xs text-amber-900/90">
          {clerkDiagnostics.map((item) => (
            <li key={item.message}>
              <span className="font-semibold">{item.level.toUpperCase()}:</span> {item.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-xl border border-amber-300/60 bg-white px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Back Home
        </Link>
        <Link
          href="mailto:actifysupport@gmail.com?subject=Actify%20Auth%20Support"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-300/60 bg-white px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <Mail className="h-4 w-4" />
          Email Support
        </Link>
      </div>
    </article>
  );
}

function DevAuthDebugCard({ redirectUrl, authFlag }: { redirectUrl: string; authFlag: string }) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <article className="rounded-2xl border border-white/25 bg-slate-950/58 p-4 text-xs text-slate-100/90 shadow-[0_20px_50px_-32px_rgba(2,6,23,0.9)] backdrop-blur-xl">
      <p className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.13em] text-cyan-100/80">
        <Bug className="h-3.5 w-3.5" />
        Auth Debug
      </p>
      <ul className="mt-2.5 space-y-1.5 text-[11px]">
        <li>path: /sign-in</li>
        <li>clerk configured: {String(isClerkConfigured)}</li>
        <li>clerk backend configured: {String(isClerkBackendConfigured)}</li>
        <li>redirect_url: {redirectUrl || "(none)"}</li>
        <li>auth flag: {authFlag || "(none)"}</li>
      </ul>
    </article>
  );
}

export default async function SignInPage({ searchParams }: { searchParams?: SearchParams }) {
  const redirectUrl = paramToString(searchParams?.redirect_url);
  const authFlag = paramToString(searchParams?.auth);

  if (isClerkBackendConfigured) {
    try {
      const { userId } = await auth();
      if (userId) {
        const nextParams = new URLSearchParams();
        nextParams.set("fresh", "1");
        if (redirectUrl) nextParams.set("redirect_url", redirectUrl);
        if (authFlag) nextParams.set("auth", authFlag);
        const redirectTo = `/sign-in?${nextParams.toString()}`;
        return <ForceClerkReauth redirectTo={redirectTo} mode="sign-in" />;
      }
    } catch (error) {
      console.error("[sign-in] auth precheck failed; rendering sign-in page", {
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  const statusBanner =
    authFlag === "unconfigured" ? (
      <div className="inline-flex w-full items-start gap-2 rounded-2xl border border-amber-200/45 bg-amber-50/95 px-3.5 py-2.5 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        Authentication keys are missing for this environment. Configure Clerk and reload.
      </div>
    ) : null;

  return (
    <AuthPageShell
      mode="sign-in"
      eyebrow="Actify Workspace"
      title="Welcome back to Actify"
      description="Sign in to your AI workspace for residents, calendar planning, participation tracking, and faster documentation."
      statusBanner={statusBanner}
      debugCard={<DevAuthDebugCard redirectUrl={redirectUrl} authFlag={authFlag} />}
    >
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
    </AuthPageShell>
  );
}
