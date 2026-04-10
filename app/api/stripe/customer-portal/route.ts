import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireUser } from "@/lib/auth";
import { ensureFacilitySubscriptionRecord } from "@/lib/billing";
import { StripeConfigurationError, getStripe, getStripeAppUrlWithFallback } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const appUrl = getStripeAppUrlWithFallback(new URL(request.url).origin);

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${appUrl}/app/billing`
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[stripe][customer-portal]", error);

    if (error instanceof StripeConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return NextResponse.json(
        {
          error: "Billing is not configured correctly. Please verify your Stripe secret key."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Unable to create customer portal session." }, { status: 500 });
  }
}
