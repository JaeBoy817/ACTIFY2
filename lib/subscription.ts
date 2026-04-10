import { SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { getFacilityBillingState } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

export async function getFacilitySubscription(facilityId: string) {
  return prisma.subscription.findUnique({ where: { facilityId } });
}

export async function hasActiveSubscription(facilityId: string) {
  const billing = await getFacilityBillingState(facilityId);
  return billing.hasActiveSubscription || ACTIVE_SUBSCRIPTION_STATUSES.includes(billing.subscriptionStatus);
}

export async function requireSubscription(facilityId: string) {
  const active = await hasActiveSubscription(facilityId);
  if (!active) {
    redirect("/subscribe");
  }
}

export function isActiveSubscriptionStatus(status: SubscriptionStatus) {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}
