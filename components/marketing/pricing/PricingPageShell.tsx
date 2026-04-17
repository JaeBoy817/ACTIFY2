import { PricingCardsSection } from "@/components/marketing/pricing/PricingCardsSection";
import { PricingFAQAccordion } from "@/components/marketing/pricing/PricingFAQAccordion";
import { PricingFinalCTA } from "@/components/marketing/pricing/PricingFinalCTA";
import { PricingPageHero } from "@/components/marketing/pricing/PricingPageHero";
import { NoBrainerSection } from "@/components/marketing/pricing/NoBrainerSection";
import { ValueGridSection } from "@/components/marketing/pricing/ValueGridSection";

export function PricingPageShell() {
  return (
    <div className="space-y-6 pb-8 pt-3 md:space-y-8 md:pt-5">
      <PricingPageHero />
      <PricingCardsSection />
      <ValueGridSection />
      <NoBrainerSection />
      <PricingFAQAccordion />
      <PricingFinalCTA />
    </div>
  );
}
