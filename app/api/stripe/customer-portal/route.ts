import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { ensureFacilitySubscriptionRecord } from "@/lib/billing";
import { getStripe, getStripeAppUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await requireUser();
    const billing = await ensureFacilitySubscriptionRecord(user.facilityId);

    if (!billing.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing profile found. Start subscription checkout first." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = getStripeAppUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${appUrl}/app/billing`
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[stripe][customer-portal]", error);
    return NextResponse.json({ error: "Unable to create customer portal session." }, { status: 500 });
  }
}
