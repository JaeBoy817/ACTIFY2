import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type StripeSubStatus = Stripe.Subscription.Status;

const statusMap: Record<StripeSubStatus, "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID"> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE",
  unpaid: "UNPAID",
  paused: "PAST_DUE"
};

async function applySubscriptionUpdate(input: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: StripeSubStatus;
  currentPeriodEnd?: number | null;
  facilityId?: string | null;
}) {
  const facilityId =
    input.facilityId ??
    (
      await prisma.subscription.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: input.stripeSubscriptionId ?? undefined },
            { stripeCustomerId: input.stripeCustomerId ?? undefined }
          ]
        },
        select: { facilityId: true }
      })
    )?.facilityId;

  if (!facilityId) {
    return;
  }

  await prisma.subscription.upsert({
    where: { facilityId },
    update: {
      stripeCustomerId: input.stripeCustomerId ?? undefined,
      stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
      status: statusMap[input.status],
      currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000) : null
    },
    create: {
      facilityId,
      stripeCustomerId: input.stripeCustomerId ?? undefined,
      stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
      status: statusMap[input.status],
      currentPeriodEnd: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000) : null
    }
  });
}

export async function POST(req: Request) {
  const signature = headers().get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription" && session.subscription) {
      const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
      await applySubscriptionUpdate({
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId: stripeSub.id,
        status: stripeSub.status,
        currentPeriodEnd: stripeSub.current_period_end,
        facilityId: session.metadata?.facilityId ?? stripeSub.metadata?.facilityId ?? null
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await applySubscriptionUpdate({
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
      stripeSubscriptionId: subscription.id,
      status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      facilityId: subscription.metadata?.facilityId ?? null
    });
  }

  return NextResponse.json({ received: true });
}
