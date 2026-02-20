import { LegalDocumentPage } from "@/components/marketing/LegalDocumentPage";
import { PRIVACY_INTRO, PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from "@/content/marketing";

export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      heroVariant="privacy"
      badge="Privacy"
      title="Privacy Policy"
      intro={PRIVACY_INTRO}
      lastUpdated={PRIVACY_LAST_UPDATED}
      sections={PRIVACY_SECTIONS}
    />
  );
}
