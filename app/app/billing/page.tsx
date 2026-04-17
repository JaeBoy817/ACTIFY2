import Link from "next/link";
import { SubscriptionStatus } from "@prisma/client";
import { BadgeCheck, CalendarClock, CreditCard, ShieldCheck } from "lucide-react";

import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { requireFacilityContext } from "@/lib/auth";
import { getFacilityBillingState } from "@/lib/billing";
import { getStripePlanDetailsFromPriceId } from "@/lib/stripe";

function formatDate(value: Date | null, timeZone: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function BillingPage() {
  const context = await requireFacilityContext();
  const billing = await getFacilityBillingState(context.facilityId).catch((error) => {
    console.error("[billing] billing page lookup failed", error);
    return {
      facilityId: context.facilityId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStatus: SubscriptionStatus.NONE,
      subscriptionCurrentPeriodEnd: null,
      hasActiveSubscription: false
    };
  });
  const planDetails = getStripePlanDetailsFromPriceId(billing.stripePriceId);
  const planName = planDetails?.planName ?? "Actify Pro";
  const planPriceLabel =
    planDetails?.planKey === "annual"
      ? "$60 / year"
      : planDetails?.planKey === "monthly"
        ? "$5.99 / month"
        : "Price based on Stripe plan";

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/60">Billing</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl text-foreground">Actify Pro Subscription</h1>
        <p className="mt-2 text-sm text-foreground/75">
          Manage your Stripe billing profile and subscription settings.
        </p>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Plan</p>
          <h2 className="text-2xl font-black text-foreground">{planName}</h2>
          <p className="text-sm text-foreground/70">{planPriceLabel}</p>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-900">
            <BadgeCheck className="h-3.5 w-3.5" />
            {billing.hasActiveSubscription ? "Active subscription" : "Subscription inactive"}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <ManageBillingButton disabled={!billing.stripeCustomerId} className="rounded-xl" />
            <Link
              href="/subscribe"
              className="inline-flex h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              View Subscription
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Billing Snapshot</p>
          <p className="inline-flex items-center gap-2 text-sm text-foreground/80">
            <ShieldCheck className="h-4 w-4 text-actifyBlue" />
            Status: {billing.subscriptionStatus.toLowerCase().replaceAll("_", " ")}
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-foreground/80">
            <CalendarClock className="h-4 w-4 text-actifyBlue" />
            Current period end: {formatDate(billing.subscriptionCurrentPeriodEnd, context.timeZone)}
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-foreground/80">
            <CreditCard className="h-4 w-4 text-actifyBlue" />
            Customer profile: {billing.stripeCustomerId ? "Connected" : "Not connected"}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
