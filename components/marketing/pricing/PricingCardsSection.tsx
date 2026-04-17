import {
  ANNUAL_DISCOUNT_PERCENT,
  ANNUAL_FEATURES,
  ANNUAL_MONTHLY_EQUIVALENT,
  ANNUAL_PRICE,
  ANNUAL_SAVINGS,
  MONTHLY_YEAR_TOTAL,
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

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Monthly Yearly Total</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{money(MONTHLY_PRICE)} × 12 = {money(MONTHLY_YEAR_TOTAL)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Annual Effective Monthly</p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">{money(ANNUAL_MONTHLY_EQUIVALENT)} / month</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">Annual Savings</p>
          <p className="mt-1 text-sm font-semibold text-sky-800">{money(ANNUAL_SAVINGS)} per year ({ANNUAL_DISCOUNT_PERCENT}% off)</p>
        </div>
      </div>

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
