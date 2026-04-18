import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Mail } from "lucide-react";

import { ForceClerkReauth } from "@/components/auth/ForceClerkReauth";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import {
  clerkSignInUrl,
  clerkSignUpFallbackRedirectUrl,
  isClerkBackendConfigured,
  isClerkConfigured
} from "@/lib/clerk-config";

function ClerkUnavailableCard() {
  return (
    <article className="rounded-2xl border border-amber-200/45 bg-amber-50/90 p-4 text-amber-950 shadow-[0_18px_40px_-26px_rgba(146,64,14,0.45)]">
      <h2 className="text-base font-semibold">Account creation is unavailable right now</h2>
      <p className="mt-1.5 text-sm leading-6 text-amber-900/90">
        Clerk is not configured for this environment yet. Add keys and reload to enable sign up.
      </p>
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
    <AuthPageShell
      mode="sign-up"
      eyebrow="Actify Onboarding"
      title="Start planning smarter with Actify"
      description="Create your account to manage residents, build schedules, track attendance, and use AI shortcuts without the clutter."
    >
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
    </AuthPageShell>
  );
}
