import { auth } from "@clerk/nextjs/server";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
];

export type FacilityBillingState = {
  facilityId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionCurrentPeriodEnd: Date | null;
  hasActiveSubscription: boolean;
};

export type CurrentUserBillingState = FacilityBillingState & {
  userId: string | null;
  clerkUserId: string | null;
  isSignedIn: boolean;
};

type SubscriptionSelect = Prisma.SubscriptionSelect;

const BILLING_SELECT: SubscriptionSelect = {
  facilityId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePriceId: true,
  status: true,
  currentPeriodEnd: true,
  hasActiveSubscription: true
};

const LEGACY_BILLING_SELECT: SubscriptionSelect = {
  facilityId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  status: true,
  currentPeriodEnd: true
};

function toFallbackBillingState(facilityId: string): FacilityBillingState {
  return {
    facilityId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    subscriptionStatus: SubscriptionStatus.NONE,
    subscriptionCurrentPeriodEnd: null,
    hasActiveSubscription: false
  };
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

export function isActiveSubscriptionStatus(status: SubscriptionStatus | null | undefined) {
  if (!status) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

export function mapStripeStatusToSubscriptionStatus(
  status: Stripe.Subscription.Status | null | undefined
): SubscriptionStatus {
  if (!status) return SubscriptionStatus.NONE;
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "paused":
      return SubscriptionStatus.PAST_DUE;
    default:
      return SubscriptionStatus.NONE;
  }
}

export function toBillingSnapshotFromSubscription(input: {
  facilityId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  status?: SubscriptionStatus | null;
  currentPeriodEnd?: Date | null;
  hasActiveSubscription?: boolean | null;
}): FacilityBillingState {
  const normalizedStatus = input.status ?? SubscriptionStatus.NONE;
  const activeByStatus = isActiveSubscriptionStatus(normalizedStatus);
  return {
    facilityId: input.facilityId,
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    stripePriceId: input.stripePriceId ?? null,
    subscriptionStatus: normalizedStatus,
    subscriptionCurrentPeriodEnd: input.currentPeriodEnd ?? null,
    // Keep status-driven access resilient for legacy rows where the new boolean
    // field may not have been backfilled yet.
    hasActiveSubscription: activeByStatus || Boolean(input.hasActiveSubscription)
  };
}

export async function ensureFacilitySubscriptionRecord(facilityId: string) {
  try {
    const record = await prisma.subscription.upsert({
      where: { facilityId },
      update: {},
      create: {
        facilityId,
        status: SubscriptionStatus.NONE,
        hasActiveSubscription: false
      },
      select: BILLING_SELECT
    });

    return toBillingSnapshotFromSubscription({
      facilityId: record.facilityId,
      stripeCustomerId: record.stripeCustomerId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      stripePriceId: record.stripePriceId,
      status: record.status,
      currentPeriodEnd: record.currentPeriodEnd,
      hasActiveSubscription: record.hasActiveSubscription
    });
  } catch (error) {
    if (!isMissingBillingColumnError(error)) throw error;

    const legacyRecord = await prisma.subscription.upsert({
      where: { facilityId },
      update: {},
      create: {
        facilityId,
        status: SubscriptionStatus.NONE
      },
      select: LEGACY_BILLING_SELECT
    });

    return toBillingSnapshotFromSubscription({
      facilityId: legacyRecord.facilityId,
      stripeCustomerId: legacyRecord.stripeCustomerId,
      stripeSubscriptionId: legacyRecord.stripeSubscriptionId,
      status: legacyRecord.status,
      currentPeriodEnd: legacyRecord.currentPeriodEnd,
      hasActiveSubscription: isActiveSubscriptionStatus(legacyRecord.status)
    });
  }
}

export async function getFacilityBillingState(facilityId: string): Promise<FacilityBillingState> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { facilityId },
      select: BILLING_SELECT
    });

    if (!subscription) {
      return toFallbackBillingState(facilityId);
    }

    return toBillingSnapshotFromSubscription({
      facilityId: subscription.facilityId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripePriceId: subscription.stripePriceId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      hasActiveSubscription: subscription.hasActiveSubscription
    });
  } catch (error) {
    if (!isMissingBillingColumnError(error)) throw error;

    const subscription = await prisma.subscription.findUnique({
      where: { facilityId },
      select: LEGACY_BILLING_SELECT
    });

    if (!subscription) {
      return toFallbackBillingState(facilityId);
    }

    return toBillingSnapshotFromSubscription({
      facilityId: subscription.facilityId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      hasActiveSubscription: isActiveSubscriptionStatus(subscription.status)
    });
  }
}

export async function getCurrentUserBillingState(): Promise<CurrentUserBillingState> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return {
      ...toFallbackBillingState(""),
      userId: null,
      clerkUserId: null,
      isSignedIn: false
    };
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      facilityId: true
    }
  });

  if (!user) {
    return {
      ...toFallbackBillingState(""),
      userId: null,
      clerkUserId,
      isSignedIn: true
    };
  }

  const billing = await getFacilityBillingState(user.facilityId);
  return {
    ...billing,
    userId: user.id,
    clerkUserId,
    isSignedIn: true
  };
}

export async function getBillingStateByClerkUserId(clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      facilityId: true
    }
  });

  if (!user) {
    return {
      ...toFallbackBillingState(""),
      userId: null,
      clerkUserId,
      isSignedIn: true
    } satisfies CurrentUserBillingState;
  }

  const billing = await getFacilityBillingState(user.facilityId);
  return {
    ...billing,
    userId: user.id,
    clerkUserId,
    isSignedIn: true
  } satisfies CurrentUserBillingState;
}
