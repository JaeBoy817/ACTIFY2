import { SubscriptionStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

export async function getFacilitySubscription(facilityId: string) {
  return prisma.subscription.findUnique({ where: { facilityId } });
}

export async function hasActiveSubscription(facilityId: string) {
  const subscription = await getFacilitySubscription(facilityId);
  return Boolean(subscription && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status));
}

export async function requireSubscription(facilityId: string) {
  const active = await hasActiveSubscription(facilityId);
  if (!active) {
    redirect("/app/settings");
  }
}

export function isActiveSubscriptionStatus(status: SubscriptionStatus) {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}
