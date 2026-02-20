import { LegalDocumentPage } from "@/components/marketing/LegalDocumentPage";
import { TERMS_INTRO, TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/content/marketing";

export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <LegalDocumentPage
      heroVariant="terms"
      badge="Terms"
      title="Terms of Use"
      intro={TERMS_INTRO}
      lastUpdated={TERMS_LAST_UPDATED}
      sections={TERMS_SECTIONS}
    />
  );
}
