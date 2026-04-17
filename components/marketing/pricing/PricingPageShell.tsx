"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import {
  ANNUAL_DISCOUNT_PERCENT,
  ANNUAL_FEATURES,
  ANNUAL_MONTHLY_EQUIVALENT,
  ANNUAL_PRICE,
  ANNUAL_SAVINGS,
  MONTHLY_FEATURES,
  MONTHLY_PRICE,
  MONTHLY_YEAR_TOTAL,
  type BillingCycle
} from "@/components/marketing/pricing/pricing-data";
import { FeaturedPricingCard } from "@/components/marketing/pricing/FeaturedPricingCard";
import { PricingCTASection } from "@/components/marketing/pricing/PricingCTASection";
import { PricingHero } from "@/components/marketing/pricing/PricingHero";
import { PricingPlanCard } from "@/components/marketing/pricing/PricingPlanCard";
import { PricingToggle } from "@/components/marketing/pricing/PricingToggle";
import { ValueSection } from "@/components/marketing/pricing/ValueSection";

const FAQAccordion = dynamic(
  () => import("@/components/marketing/pricing/FAQAccordion").then((module) => module.FAQAccordion),
  {
    loading: () => (
      <section className="rounded-[34px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.34)] md:p-8">
        <div className="h-5 w-28 animate-pulse rounded-md bg-slate-200/70" />
        <div className="mt-4 space-y-3">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100/90" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100/90" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100/90" />
        </div>
      </section>
    )
  }
);

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function PricingPageShell() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  const monthlyPriceLine = useMemo(() => `${money(MONTHLY_PRICE)}/mo`, []);
  const yearlyPriceLine = useMemo(() => `${money(ANNUAL_PRICE)}/yr`, []);

  return (
    <div className="space-y-7 pb-10 pt-3 md:space-y-9 md:pt-5">
      <PricingHero />

      <section id="plans" className="rounded-[36px] border border-slate-200 bg-white/95 px-5 py-8 shadow-[0_28px_70px_-54px_rgba(15,23,42,0.35)] md:px-8 md:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Choose Billing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Two Plans. One Clear Value.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            Monthly is flexible. Annual is the best value with a lower effective monthly cost and cleaner year-round billing.
          </p>

          <div className="mt-6">
            <PricingToggle cycle={billingCycle} onChange={setBillingCycle} />
          </div>
        </div>

        <div className="mt-6 grid gap-2.5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-center md:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Monthly x 12</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {money(MONTHLY_PRICE)} x 12 = {money(MONTHLY_YEAR_TOTAL)}
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3 py-2.5 text-center md:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Annual Equivalent</p>
            <p className="mt-1 text-sm font-semibold text-indigo-800">{money(ANNUAL_MONTHLY_EQUIVALENT)}/mo billed yearly</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-center md:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Savings</p>
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              {money(ANNUAL_SAVINGS)}/year ({ANNUAL_DISCOUNT_PERCENT}% off)
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <PricingPlanCard
            title="Monthly"
            headlinePrice={monthlyPriceLine}
            description="Flexible monthly access to Actify's AI assistant, resident tools, and calendar planning features."
            features={MONTHLY_FEATURES}
            ctaLabel="Choose Monthly"
            ctaHref="/sign-up?plan=monthly"
            selected={billingCycle === "monthly"}
            billingCycle={billingCycle}
          />

          <FeaturedPricingCard
            title="Annual"
            headlinePrice={yearlyPriceLine}
            subPrice={`Only ${money(ANNUAL_MONTHLY_EQUIVALENT)}/mo billed yearly`}
            savingsLine={`Save ${money(ANNUAL_SAVINGS)}/year - Save ${ANNUAL_DISCOUNT_PERCENT}%`}
            description="Best for Activities Directors who want a full year of faster planning, cleaner notes, and less daily scrambling."
            features={ANNUAL_FEATURES}
            ctaLabel="Choose Annual"
            ctaHref="/sign-up?plan=annual"
            selected={billingCycle === "yearly"}
            billingCycle={billingCycle}
            featuredLabel="Most Recommended"
          />
        </div>
      </section>

      <ValueSection />
      <FAQAccordion />
      <PricingCTASection />
    </div>
  );
}
