import type { BillingCycle } from "@/components/marketing/pricing/pricing-data";
import { PricingPlanCard } from "@/components/marketing/pricing/PricingPlanCard";

type FeaturedPricingCardProps = {
  title: string;
  headlinePrice: string;
  subPrice?: string;
  description: string;
  features: readonly string[];
  ctaLabel: string;
  ctaHref?: string;
  ctaPlan?: "monthly" | "annual";
  selected?: boolean;
  featuredLabel?: string;
  savingsLine?: string;
  billingCycle: BillingCycle;
};

export function FeaturedPricingCard(props: FeaturedPricingCardProps) {
  return <PricingPlanCard {...props} featured featuredLabel={props.featuredLabel ?? "Most Recommended"} />;
}
