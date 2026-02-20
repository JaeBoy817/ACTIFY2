import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/marketing/AuthPageShell";
import { GlassButton, GlassCard } from "@/components/marketing/Glass";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";

function ClerkUnavailable() {
  return (
    <GlassCard className="bg-gradient-to-br from-sky-200/22 via-white/14 to-violet-200/14 p-5">
      <h2 className="text-lg font-semibold text-foreground">Clerk keys required</h2>
      <p className="mt-2 text-sm text-foreground/72">
        Add valid Clerk keys in your environment variables to enable sign-in.
      </p>
      <GlassButton asChild variant="secondary" className="mt-3">
        <Link href="/sign-up" prefetch>
          Create an account
        </Link>
      </GlassButton>
    </GlassCard>
  );
}

export default function SignInPage() {
  return (
    <AuthPageShell mode="sign-in">
      {isClerkConfigured ? (
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          forceRedirectUrl="/app"
          appearance={actifyClerkAppearance}
        />
      ) : (
        <ClerkUnavailable />
      )}
    </AuthPageShell>
  );
}
