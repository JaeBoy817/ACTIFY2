import { LegalDocumentLayout, type LegalDocSection } from "@/components/public/LegalDocumentLayout";
import { TERMS_INTRO, TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/content/marketing";

export const dynamic = "force-static";

const termsById = Object.fromEntries(TERMS_SECTIONS.map((section) => [section.id, section]));

const sections: readonly LegalDocSection[] = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    paragraphs: [
      "By using Actify, you agree to these Terms and any posted updates. Facility administrators are responsible for ensuring staff use the platform according to internal policy and applicable regulation."
    ]
  },
  {
    id: "use-of-service",
    title: "Use of the Service",
    paragraphs: [
      termsById["acceptable-use"]?.paragraphs[0] ??
        "Actify is provided for lawful activity programming, documentation, and reporting workflows."
    ]
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    paragraphs: [
      termsById["account-responsibility"]?.paragraphs[0] ??
        "Teams are responsible for account access, role assignments, and credential security."
    ]
  },
  {
    id: "account-access-security",
    title: "Account Access and Security",
    paragraphs: [
      "Each user should access the platform through their own account. Shared credentials and unauthorized account access are prohibited. Facilities should promptly remove access for separated staff."
    ]
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    paragraphs: [
      "Actify software, branding, and product materials are protected intellectual property. Facilities retain ownership of their own data entered into the platform."
    ]
  },
  {
    id: "acceptable-use-policy",
    title: "Acceptable Use",
    paragraphs: [
      "Users may not misuse the service, attempt unauthorized access, upload malicious code, or use the platform in ways that violate law or resident privacy obligations."
    ]
  },
  {
    id: "availability-service-changes",
    title: "Availability and Service Changes",
    paragraphs: [
      termsById["service-availability"]?.paragraphs[0] ??
        "Service availability may vary because of maintenance or infrastructure events.",
      "We may update functionality, interfaces, and workflows to improve performance, security, or usability."
    ]
  },
  {
    id: "termination",
    title: "Termination",
    paragraphs: [
      "Access may be suspended or terminated for misuse, security risk, or non-compliance with these Terms. Facilities can discontinue use at any time, subject to account and billing agreements."
    ]
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "Actify supports operational documentation and workflow management. Facilities remain responsible for care decisions, clinical judgment, and compliance execution."
    ]
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of Liability",
    paragraphs: [
      "To the extent permitted by law, Actify is not liable for indirect, incidental, or consequential damages resulting from use of the service."
    ]
  },
  {
    id: "governing-terms-updates",
    title: "Governing Terms and Updates",
    paragraphs: [
      termsById["records-retention"]?.paragraphs[0] ??
        "Data retention follows facility configuration and policy.",
      "These Terms may be updated periodically. Continued use after updates means acceptance of the revised Terms."
    ]
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: ["For questions about these Terms, contact actifysupport@gmail.com."]
  }
];

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      pageType="terms"
      title="Terms of Service"
      intro={TERMS_INTRO}
      effectiveDate={TERMS_LAST_UPDATED}
      sections={sections}
    />
  );
}
