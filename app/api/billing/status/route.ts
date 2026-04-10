import { NextResponse } from "next/server";

import { getCurrentAccessState } from "@/lib/access-control";

export const runtime = "nodejs";

export async function GET() {
  const accessState = await getCurrentAccessState();
  if (!accessState.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      hasActiveSubscription: accessState.hasActiveSubscription,
      subscriptionStatus: accessState.subscriptionStatus,
      currentPeriodEnd: accessState.currentPeriodEnd?.toISOString() ?? null,
      isCreatorBypass: accessState.isCreatorBypass,
      allowed: accessState.allowed
    },
    { status: 200 }
  );
}
