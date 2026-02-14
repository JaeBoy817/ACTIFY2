import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { actifyClerkAppearance } from "@/lib/clerk/appearance";
import { isClerkConfigured } from "@/lib/clerk-config";
import { prisma } from "@/lib/prisma";

async function getUserReducedMotionPreference() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      settings: {
        select: {
          reduceMotion: true
        }
      }
    }
  });

  return user?.settings?.reduceMotion ?? null;
}

function ClerkUnavailable() {
  return (
    <Card className="border-white/70 bg-white/75">
      <CardHeader>
        <CardTitle>Clerk keys required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Add valid Clerk keys in your environment variables to enable sign-up.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/sign-in">Already have an account? Sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function SignUpPage() {
  const userReducedMotion = await getUserReducedMotionPreference();

  return (
    <AuthShell mode="sign-up" variant="center" userReducedMotion={userReducedMotion}>
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
    </AuthShell>
  );
}
