import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getBillingStateByClerkUserId } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBillingStateByClerkUserId(userId).catch((error) => {
    console.error("[billing][status] lookup failed", error);
    return null;
  });

  if (!billing) {
    return NextResponse.json(
      {
        hasActiveSubscription: false,
        subscriptionStatus: "NONE",
        currentPeriodEnd: null
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      hasActiveSubscription: billing.hasActiveSubscription,
      subscriptionStatus: billing.subscriptionStatus,
      currentPeriodEnd: billing.subscriptionCurrentPeriodEnd?.toISOString() ?? null
    },
    { status: 200 }
  );
}
