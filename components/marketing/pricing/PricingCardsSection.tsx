import {
  ANNUAL_DISCOUNT_PERCENT,
  ANNUAL_FEATURES,
  ANNUAL_MONTHLY_EQUIVALENT,
  ANNUAL_PRICE,
  ANNUAL_SAVINGS,
  MONTHLY_FEATURES,
  MONTHLY_PRICE
} from "@/components/marketing/pricing/pricing-data";
import { PricingPlanCard } from "@/components/marketing/pricing/PricingPlanCard";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function PricingCardsSection() {
  return (
    <section id="plans" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_22px_56px_-44px_rgba(15,23,42,0.35)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Plans</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Two Clear Options. One Easy Decision.</h2>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PricingPlanCard
          title="Monthly"
          priceLabel={`${money(MONTHLY_PRICE)} / month`}
          description="Flexible monthly access to Actify's AI assistant, resident tools, and calendar planning features."
          features={MONTHLY_FEATURES}
          ctaLabel="Choose Monthly"
          ctaHref="/sign-up?plan=monthly"
        />

        <PricingPlanCard
          title="Annual"
          priceLabel={`${money(ANNUAL_PRICE)} / year`}
          supportingPrice={`Only ${money(ANNUAL_MONTHLY_EQUIVALENT)}/month when billed yearly`}
          savingsLabel={`Save ${money(ANNUAL_SAVINGS)}/year (${ANNUAL_DISCOUNT_PERCENT}% off)`}
          description="Best value for Activities Directors who want a full year of smarter planning and documentation help at a lower overall cost."
          features={ANNUAL_FEATURES}
          ctaLabel="Choose Annual"
          ctaHref="/sign-up?plan=annual"
          highlighted
          highlightLabel="Best Value"
        />
      </div>
    </section>
  );
}
