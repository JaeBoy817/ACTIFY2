import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/marketing/AuthPageShell";
import { GlassButton, GlassCard } from "@/components/marketing/Glass";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";

function ClerkUnavailable() {
  return (
    <GlassCard className="bg-gradient-to-br from-violet-200/22 via-white/14 to-sky-200/14 p-5">
      <h2 className="text-lg font-semibold text-foreground">Clerk keys required</h2>
      <p className="mt-2 text-sm text-foreground/72">
        Add valid Clerk keys in your environment variables to enable sign-up.
      </p>
      <GlassButton asChild variant="secondary" className="mt-3">
        <Link href="/sign-in" prefetch>
          Already have an account? Sign in
        </Link>
      </GlassButton>
    </GlassCard>
  );
}

export default function SignUpPage() {
  return (
    <AuthPageShell mode="sign-up">
      {isClerkConfigured ? (
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          forceRedirectUrl="/app"
          appearance={actifyClerkAppearance}
        />
      ) : (
        <ClerkUnavailable />
      )}
    </AuthPageShell>
  );
}
