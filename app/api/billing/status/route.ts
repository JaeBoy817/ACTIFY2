import { NextResponse } from "next/server";

import { getCurrentAccessState } from "@/lib/access-control";
import { isNextControlFlowError } from "@/lib/next-control-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const accessState = await getCurrentAccessState().catch((error) => {
    if (isNextControlFlowError(error)) throw error;
    console.error("[billing] status lookup failed", error);
    return null;
  });
  if (!accessState) {
    return NextResponse.json(
      {
        hasActiveSubscription: false,
        subscriptionStatus: "NONE",
        currentPeriodEnd: null,
        isCreatorBypass: false,
        allowed: false
      },
      { status: 200 }
    );
  }

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
