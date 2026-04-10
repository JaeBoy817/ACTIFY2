import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { ensureFacilitySubscriptionRecord } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeAppUrl, getStripeMonthlyPriceId } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await requireUser();
    const stripe = getStripe();
    const appUrl = getStripeAppUrl();
    const monthlyPriceId = getStripeMonthlyPriceId();

    const existingBilling = await ensureFacilitySubscriptionRecord(dbUser.facilityId);

    if (existingBilling.hasActiveSubscription) {
      return NextResponse.json({ url: `${appUrl}/dashboard` }, { status: 200 });
    }

    let stripeCustomerId = existingBilling.stripeCustomerId;

    if (!stripeCustomerId) {
      const createdCustomer = await stripe.customers.create({
        email: dbUser.email,
        name: dbUser.name,
        metadata: {
          clerkUserId: dbUser.clerkUserId,
          appUserId: dbUser.id,
          facilityId: dbUser.facilityId
        }
      });

      stripeCustomerId = createdCustomer.id;

      await prisma.subscription.upsert({
        where: {
          facilityId: dbUser.facilityId
        },
        update: {
          stripeCustomerId
        },
        create: {
          facilityId: dbUser.facilityId,
          stripeCustomerId
        }
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: monthlyPriceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=1`,
      metadata: {
        clerkUserId: dbUser.clerkUserId,
        facilityId: dbUser.facilityId,
        appUserId: dbUser.id
      },
      subscription_data: {
        metadata: {
          clerkUserId: dbUser.clerkUserId,
          facilityId: dbUser.facilityId,
          appUserId: dbUser.id
        }
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe checkout URL was not returned." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[stripe][create-checkout-session]", error);
    return NextResponse.json({ error: "Unable to create Stripe Checkout session." }, { status: 500 });
  }
}
