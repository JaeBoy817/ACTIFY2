import { NextResponse } from "next/server";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { mapStripeStatusToSubscriptionStatus } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function isStripeActiveStatus(status: Stripe.Subscription.Status | null | undefined) {
  return status === "active" || status === "trialing";
}

function toDateFromEpoch(epochSeconds: number | null | undefined) {
  if (!epochSeconds) return null;
  return new Date(epochSeconds * 1000);
}

function getPriceIdFromSubscription(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}

function isMissingBillingColumnError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    return true;
  }
  if (error instanceof Error && /column .* does not exist/i.test(error.message)) {
    return true;
  }
  return false;
}

async function resolveFacilityId(input: {
  facilityId?: string | null;
  clerkUserId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  if (input.facilityId) return input.facilityId;

  if (input.clerkUserId) {
    const user = await prisma.user.findUnique({
      where: { clerkUserId: input.clerkUserId },
      select: { facilityId: true }
    });
    if (user?.facilityId) return user.facilityId;
  }

  if (input.stripeSubscriptionId || input.stripeCustomerId) {
    const existing = await prisma.subscription.findFirst({
      where: {
        OR: [
          input.stripeSubscriptionId ? { stripeSubscriptionId: input.stripeSubscriptionId } : undefined,
          input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : undefined
        ].filter(Boolean) as Array<{ stripeSubscriptionId?: string; stripeCustomerId?: string }>
      },
      select: {
        facilityId: true
      }
    });
    if (existing?.facilityId) return existing.facilityId;
  }

  return null;
}

async function syncSubscriptionState(params: {
  facilityId?: string | null;
  clerkUserId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeStatus?: Stripe.Subscription.Status | null;
  forcedStatus?: SubscriptionStatus;
  forceInactive?: boolean;
  currentPeriodEnd?: number | null;
}) {
  const facilityId = await resolveFacilityId({
    facilityId: params.facilityId,
    clerkUserId: params.clerkUserId,
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId
  });

  if (!facilityId) {
    return { ok: false as const, reason: "facility_not_found" as const };
  }

  const status = params.forcedStatus ?? mapStripeStatusToSubscriptionStatus(params.stripeStatus);
  const hasActiveSubscription = params.forceInactive
    ? false
    :
    params.forcedStatus === SubscriptionStatus.CANCELED
      ? false
      : isStripeActiveStatus(params.stripeStatus) || status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;

  try {
    await prisma.subscription.upsert({
      where: { facilityId },
      update: {
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        stripeSubscriptionId: params.stripeSubscriptionId ?? undefined,
        stripePriceId: params.stripePriceId ?? undefined,
        status,
        currentPeriodEnd: toDateFromEpoch(params.currentPeriodEnd),
        hasActiveSubscription
      },
      create: {
        facilityId,
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        stripeSubscriptionId: params.stripeSubscriptionId ?? undefined,
        stripePriceId: params.stripePriceId ?? undefined,
        status,
        currentPeriodEnd: toDateFromEpoch(params.currentPeriodEnd),
        hasActiveSubscription
      }
    });
  } catch (error) {
    if (!isMissingBillingColumnError(error)) {
      throw error;
    }

    await prisma.subscription.upsert({
      where: { facilityId },
      update: {
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        stripeSubscriptionId: params.stripeSubscriptionId ?? undefined,
        status,
        currentPeriodEnd: toDateFromEpoch(params.currentPeriodEnd)
      },
      create: {
        facilityId,
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        stripeSubscriptionId: params.stripeSubscriptionId ?? undefined,
        status,
        currentPeriodEnd: toDateFromEpoch(params.currentPeriodEnd)
      }
    });
  }

  return { ok: true as const, facilityId };
}

async function markEventProcessed(event: Stripe.Event, facilityId: string | null) {
  if (!facilityId) return;
  await prisma.auditLog.create({
    data: {
      facilityId,
      action: "STRIPE_WEBHOOK_PROCESSED",
      entityType: "STRIPE_EVENT",
      entityId: event.id,
      after: {
        type: event.type
      }
    }
  });
}

async function alreadyProcessed(eventId: string) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: "STRIPE_WEBHOOK_PROCESSED",
      entityType: "STRIPE_EVENT",
      entityId: eventId
    },
    select: { id: true }
  });
  return Boolean(existing);
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret." }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe][webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, deduplicated: true }, { status: 200 });
  }

  let processedFacilityId: string | null = null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        if (typeof session.subscription !== "string") break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const syncResult = await syncSubscriptionState({
          facilityId: session.metadata?.facilityId ?? null,
          clerkUserId: session.metadata?.clerkUserId ?? null,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: subscription.id,
          stripePriceId: getPriceIdFromSubscription(subscription),
          stripeStatus: subscription.status,
          currentPeriodEnd: subscription.current_period_end
        });

        if (syncResult.ok) processedFacilityId = syncResult.facilityId;
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : null;
        const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;

        if (!stripeSubscriptionId) {
          if (event.type === "invoice.payment_failed") {
            const syncResult = await syncSubscriptionState({
              stripeCustomerId,
              stripeStatus: "past_due",
              forcedStatus: SubscriptionStatus.PAST_DUE,
              forceInactive: true
            });
            if (syncResult.ok) processedFacilityId = syncResult.facilityId;
          }
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const syncResult = await syncSubscriptionState({
          facilityId: subscription.metadata?.facilityId ?? null,
          clerkUserId: subscription.metadata?.clerkUserId ?? null,
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: getPriceIdFromSubscription(subscription),
          stripeStatus: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          forcedStatus:
            event.type === "invoice.payment_failed"
              ? SubscriptionStatus.PAST_DUE
              : undefined,
          forceInactive: event.type === "invoice.payment_failed"
        });

        if (syncResult.ok) processedFacilityId = syncResult.facilityId;
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const syncResult = await syncSubscriptionState({
          facilityId: subscription.metadata?.facilityId ?? null,
          clerkUserId: subscription.metadata?.clerkUserId ?? null,
          stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
          stripeSubscriptionId: subscription.id,
          stripePriceId: getPriceIdFromSubscription(subscription),
          stripeStatus: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          forcedStatus:
            event.type === "customer.subscription.deleted"
              ? SubscriptionStatus.CANCELED
              : undefined
        });

        if (syncResult.ok) processedFacilityId = syncResult.facilityId;
        break;
      }

      default:
        break;
    }

    await markEventProcessed(event, processedFacilityId);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[stripe][webhook] processing failed", {
      eventType: event.type,
      eventId: event.id,
      error
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
