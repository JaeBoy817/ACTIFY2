import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { AuthEditorialShell } from "@/components/public/AuthEditorialShell";
import { MattePanel } from "@/components/public/PublicPrimitives";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";

function ClerkUnavailable() {
  return (
    <MattePanel className="border-zinc-300 bg-white p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Authentication is not configured</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Add valid Clerk keys in environment variables to enable sign in.
      </p>
      <Link href="/sign-up" className="mt-4 inline-flex text-sm font-semibold text-zinc-900 underline underline-offset-4">
        Create an account
      </Link>
    </MattePanel>
  );
}

export default function SignInPage() {
  return (
    <AuthEditorialShell mode="sign-in">
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
    </AuthEditorialShell>
  );
}
