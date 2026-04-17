import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { cn } from "@/lib/utils";
import type { BillingCycle } from "@/components/marketing/pricing/pricing-data";

type PricingPlanCardProps = {
  title: string;
  headlinePrice: string;
  subPrice?: string;
  description: string;
  features: readonly string[];
  ctaLabel: string;
  ctaHref?: string;
  ctaPlan?: "monthly" | "annual";
  selected?: boolean;
  featured?: boolean;
  featuredLabel?: string;
  savingsLine?: string;
  billingCycle: BillingCycle;
};

export function PricingPlanCard({
  title,
  headlinePrice,
  subPrice,
  description,
  features,
  ctaLabel,
  ctaHref,
  ctaPlan,
  selected = false,
  featured = false,
  featuredLabel,
  savingsLine,
  billingCycle
}: PricingPlanCardProps) {
  return (
    <article
      className={cn(
        "relative rounded-[30px] border bg-white p-6 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.38)] transition duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_32px_65px_-44px_rgba(15,23,42,0.4)]",
        featured ? "border-indigo-300/80" : "border-slate-200",
        selected ? "ring-2 ring-slate-300/80" : "ring-1 ring-transparent",
        featured ? "md:scale-[1.015]" : ""
      )}
    >
      {featured && featuredLabel ? (
        <span className="absolute -top-3 left-6 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          {featuredLabel}
        </span>
      ) : null}

      <div>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <div className="mt-4">
          <p className="text-5xl font-semibold tracking-tight text-slate-900">{headlinePrice}</p>
          {subPrice ? <p className="mt-2 text-sm font-medium text-slate-600">{subPrice}</p> : null}
          {savingsLine ? <p className="mt-2 text-sm font-semibold text-emerald-700">{savingsLine}</p> : null}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {ctaPlan ? (
        <CheckoutButton
          plan={ctaPlan}
          label={ctaLabel}
          redirectToSignInOnUnauthorized
          signInRedirectPath={`/pricing?plan=${ctaPlan}`}
          className={cn(
            "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            featured || billingCycle === "yearly"
              ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800"
              : "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-400"
          )}
        />
      ) : (
        <Link
          href={ctaHref ?? "/sign-up"}
          className={cn(
            "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
            featured || billingCycle === "yearly"
              ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800"
              : "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-400"
          )}
        >
          {ctaLabel}
        </Link>
      )}

      <ul className="mt-6 space-y-2.5">
        {features.map((feature) => (
          <li key={`${title}-${feature}`} className="flex items-start gap-2.5 text-sm text-slate-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
