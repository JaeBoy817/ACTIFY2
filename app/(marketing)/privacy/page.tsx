import { LegalDocumentLayout, type LegalDocSection } from "@/components/public/LegalDocumentLayout";
import { PRIVACY_INTRO, PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from "@/content/marketing";

export const dynamic = "force-static";

const privacyById = Object.fromEntries(PRIVACY_SECTIONS.map((section) => [section.id, section]));

const sections: readonly LegalDocSection[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    paragraphs: [
      "Actify stores account profile, facility configuration, workflow records, and operational documentation entered by your team to provide platform functionality."
    ]
  },
  {
    id: "how-we-use-information",
    title: "How We Use Information",
    paragraphs: [
      privacyById["data-use"]?.paragraphs[0] ??
        "Data is used to power scheduling, attendance, notes, care planning, reporting, and support operations."
    ]
  },
  {
    id: "data-storage-security",
    title: "Data Storage and Security",
    paragraphs: [
      privacyById["security"]?.paragraphs[0] ??
        "We protect access through role permissions, audit logging, and security monitoring."
    ]
  },
  {
    id: "sharing-disclosure",
    title: "Sharing and Disclosure",
    paragraphs: [
      "We do not sell customer data. Data may be shared with authorized service providers required to operate and secure the platform, subject to contractual controls."
    ]
  },
  {
    id: "cookies-analytics",
    title: "Cookies and Analytics",
    paragraphs: [
      "Actify may use essential session and analytics tooling for security, reliability, and product performance improvements."
    ]
  },
  {
    id: "user-rights-choices",
    title: "User Rights and Choices",
    paragraphs: [
      privacyById["rights"]?.paragraphs[0] ??
        "Facilities can request data access, corrections, and export support."
    ]
  },
  {
    id: "data-retention",
    title: "Data Retention",
    paragraphs: [
      privacyById["retention"]?.paragraphs[0] ??
        "Retention follows facility policy and product configuration."
    ]
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    paragraphs: [
      "Actify integrates with infrastructure providers for authentication, hosting, and operational analytics. Providers are vetted for security and reliability requirements."
    ]
  },
  {
    id: "updates-to-policy",
    title: "Updates to This Policy",
    paragraphs: [
      "This policy may be updated to reflect legal or operational changes. Material updates will be posted with a revised effective date."
    ]
  },
  {
    id: "contact-information",
    title: "Contact Information",
    paragraphs: ["For privacy questions, contact actifysupport@gmail.com."]
  }
];

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      pageType="privacy"
      title="Privacy Policy"
      intro={PRIVACY_INTRO}
      effectiveDate={PRIVACY_LAST_UPDATED}
      sections={sections}
    />
  );
}
