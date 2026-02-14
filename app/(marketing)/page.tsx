import { HomeHero } from "@/components/marketing/home/HomeHero";
import { PaperworkToProofMorph } from "@/components/marketing/home/PaperworkToProofMorph";
import { FeatureTrio } from "@/components/marketing/home/FeatureTrio";
import { PlanToggleShowcase } from "@/components/marketing/home/PlanToggleShowcase";
import { CredibilityBand } from "@/components/marketing/home/CredibilityBand";
import { FinalCTA } from "@/components/marketing/home/FinalCTA";

export default function LandingPage() {
  return (
    <div className="space-y-12 md:space-y-16">
      <HomeHero />
      <PaperworkToProofMorph />
      <FeatureTrio />
      <PlanToggleShowcase />
      <CredibilityBand />
      <FinalCTA />
    </div>
  );
}
