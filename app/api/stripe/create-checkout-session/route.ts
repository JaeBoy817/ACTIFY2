import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { ensureFacilitySubscriptionRecord } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  type StripePlanKey,
  StripeConfigurationError,
  getStripePriceIdForPlan,
  getStripe,
  getStripeAppUrlWithFallback,
  getStripePlanDetailsFromPriceId
} from "@/lib/stripe";

export const runtime = "nodejs";

const checkoutRequestSchema = z.object({
  plan: z.enum(["monthly", "annual"]).default("monthly")
});

async function parseRequestedPlan(request: Request): Promise<StripePlanKey> {
  const rawBody = await request.text();
  if (!rawBody.trim()) return "monthly";

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid checkout payload. Please choose a valid plan.");
  }

  const parsed = checkoutRequestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error("Invalid checkout payload. Please choose a valid plan.");
  }

  return parsed.data.plan;
}

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "You need to sign in before subscribing." }, { status: 401 });
    }

    const dbUser = await requireUser();
    const requestedPlan = await parseRequestedPlan(request);
    const stripe = getStripe();
    const appUrl = getStripeAppUrlWithFallback(new URL(request.url).origin);
    const selectedPriceId = getStripePriceIdForPlan(requestedPlan);
    const selectedPlanDetails = getStripePlanDetailsFromPriceId(selectedPriceId);

    const existingBilling = await ensureFacilitySubscriptionRecord(dbUser.facilityId);

    if (existingBilling.hasActiveSubscription) {
      return NextResponse.json({ url: `${appUrl}/app/billing` }, { status: 200 });
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
          price: selectedPriceId,
          quantity: 1
        }
      ],
      allow_promotion_codes: true,
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&plan=${requestedPlan}`,
      cancel_url: `${appUrl}/pricing?canceled=1&plan=${requestedPlan}`,
      metadata: {
        clerkUserId: dbUser.clerkUserId,
        facilityId: dbUser.facilityId,
        appUserId: dbUser.id,
        requestedPlan,
        requestedPriceId: selectedPriceId
      },
      subscription_data: {
        metadata: {
          clerkUserId: dbUser.clerkUserId,
          facilityId: dbUser.facilityId,
          appUserId: dbUser.id,
          requestedPlan,
          requestedPriceId: selectedPriceId
        }
      }
    });

    await prisma.subscription.upsert({
      where: {
        facilityId: dbUser.facilityId
      },
      update: {
        stripeCustomerId,
        stripePriceId: selectedPriceId
      },
      create: {
        facilityId: dbUser.facilityId,
        stripeCustomerId,
        stripePriceId: selectedPriceId
      }
    });

    await prisma.auditLog.create({
      data: {
        facilityId: dbUser.facilityId,
        actorUserId: dbUser.id,
        action: "STRIPE_CHECKOUT_SESSION_CREATED",
        entityType: "STRIPE_CHECKOUT_SESSION",
        entityId: session.id,
        after: {
          requestedPlan,
          requestedPriceId: selectedPriceId,
          billingInterval: selectedPlanDetails?.billingInterval ?? null,
          checkoutUrlPresent: Boolean(session.url)
        }
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe checkout URL was not returned." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("[stripe][create-checkout-session]", error);

    if (error instanceof StripeConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof Error && error.message.includes("Invalid checkout payload")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return NextResponse.json(
        {
          error: "Billing is not configured correctly. Please verify your Stripe secret key."
        },
        { status: 500 }
      );
    }

    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return NextResponse.json(
        {
          error: error.message || "Unable to create Stripe checkout session."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unable to create Stripe Checkout session." }, { status: 500 });
  }
}
